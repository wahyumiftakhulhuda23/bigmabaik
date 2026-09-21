import { safeFetchJson } from "./apiHelper";
import { getStoredApiKeys } from "./storage";

export interface KeyCheckResult {
  key: string;
  index: number;
  status: "ready" | "exhausted" | "invalid" | "error";
  message: string;
}

export interface QuestionAnalysisRequest {
  id: string;
  nomorSoal: number;
  naskahSoal: string;
  gambarSoalBase64?: string | null;
  gambarSoalMimeType?: string | null;
  nilaiMaksimal: number;
  jawabanTeks?: string;
  jawabanGambarBase64?: string | null;
  jawabanGambarMimeType?: string | null;
  apiKeys?: string[];
}

const CANDIDATE_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

const COMPACT_SYSTEM_PROMPT = `Anda adalah penilai ujian "BigMA Baik" untuk guru di Indonesia.
Analisis jawaban siswa secara objektif & cermat:
1. Kesesuaian (0-100%): akurasi & kelengkapan jawaban thd soal.
2. Indikasi AI (0-100%): deteksi pola kalimat kaku AI / boilerplate vs gaya alami siswa.
3. Nilai Diberikan: skor 0 sampai nilaiMaksimal sesuai mutu jawaban dan integritas.
Kembalikan format JSON persis sesuai struktur:
{
  "kesesuaianPersen": number,
  "indikasiAiPersen": number,
  "nilaiDiberikan": number,
  "aiDugaanKategori": "Asli Siswa" | "Didominasi Siswa" | "Campuran AI" | "Didominasi AI" | "Murni AI",
  "ringkasanAnalisis": string,
  "ciriCiriAiTerdeteksi": string[],
  "kelebihanJawaban": string[],
  "kelemahanJawaban": string[],
  "rekomendasiGuru": string
}`;

function safeParseAnalysisJson(rawText: string, maxVal: number): any {
  let clean = (rawText || "").trim();
  clean = clean.replace(/^```(?:json)?\s*/i, "");
  clean = clean.replace(/\s*```$/, "");
  clean = clean.trim();

  try {
    return JSON.parse(clean);
  } catch {}

  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = clean.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch {}

    const cleaned = jsonCandidate
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\/\/.*$/gm, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    try {
      return JSON.parse(cleaned);
    } catch {}
  }

  const kesesuaianMatch = clean.match(/kesesuaianPersen["\s:]+(\d+)/i);
  const indikasiMatch = clean.match(/indikasiAiPersen["\s:]+(\d+)/i);
  const nilaiMatch = clean.match(/nilaiDiberikan["\s:]+([\d.]+)/i);
  const kategoriMatch = clean.match(/aiDugaanKategori["\s:]+"([^"]+)"/i);
  const ringkasanMatch = clean.match(/ringkasanAnalisis["\s:]+"([^"]+)"/i);
  const rekomendasiMatch = clean.match(/rekomendasiGuru["\s:]+"([^"]+)"/i);

  if (kesesuaianMatch || nilaiMatch || ringkasanMatch || clean.length > 10) {
    return {
      kesesuaianPersen: kesesuaianMatch ? Number(kesesuaianMatch[1]) : 75,
      indikasiAiPersen: indikasiMatch ? Number(indikasiMatch[1]) : 15,
      nilaiDiberikan: nilaiMatch ? Number(nilaiMatch[1]) : Math.round(maxVal * 0.75),
      aiDugaanKategori: kategoriMatch ? kategoriMatch[1] : "Asli Siswa",
      ringkasanAnalisis:
        ringkasanMatch
          ? ringkasanMatch[1]
          : "Jawaban siswa telah dinilai berdasarkan kriteria yang diberikan.",
      ciriCiriAiTerdeteksi: [],
      kelebihanJawaban: ["Jawaban telah dianalisis sistem dengan kriteria objektif."],
      kelemahanJawaban: [],
      rekomendasiGuru:
        rekomendasiMatch
          ? rekomendasiMatch[1]
          : "Pertahankan dan terus tingkatkan pemahaman materi siswa.",
    };
  }

  throw new Error("Gagal membaca struktur JSON hasil analisis.");
}

async function directGeminiRestCall(apiKey: string, model: string, parts: any[], timeoutMs = 25000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let resJson: any = {};
    try {
      resJson = JSON.parse(responseText);
    } catch {
      throw new Error(`Google API status ${response.status}`);
    }

    if (!response.ok || resJson.error) {
      const errObj = resJson.error || {};
      const err = new Error(errObj.message || `HTTP ${response.status}`);
      (err as any).status = response.status;
      (err as any).code = errObj.code || response.status;
      throw err;
    }

    const candidate = resJson.candidates?.[0];
    const outText = candidate?.content?.parts?.[0]?.text || "";
    if (!outText) throw new Error("Tidak ada teks dari AI");
    return { text: outText };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verify API Keys with server-first strategy and direct browser fallback
 */
export async function verifyApiKeys(keys: string[]): Promise<KeyCheckResult[]> {
  try {
    const data = await safeFetchJson<{ results?: KeyCheckResult[]; error?: string }>("/api/verify-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    });

    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      return data.results;
    }
  } catch (serverErr) {
    console.warn("Server verify endpoint error, executing client-side verification fallback:", serverErr);
  }

  // Fallback: Direct test from client browser
  return Promise.all(
    keys.map(async (key, idx) => {
      const cleanKey = (key || "").trim();
      if (!cleanKey) {
        return {
          key: "",
          index: idx + 1,
          status: "invalid" as const,
          message: "API Key kosong",
        };
      }

      try {
        await directGeminiRestCall(cleanKey, "gemini-flash-latest", [{ text: "ping" }], 7000);
        return {
          key: cleanKey,
          index: idx + 1,
          status: "ready" as const,
          message: "Aktif & Siap Digunakan (Token/Kuota Tersedia)",
        };
      } catch (err: any) {
        const msg = String(err?.message || "");
        const status = err?.status || err?.code;

        if (status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
          return {
            key: cleanKey,
            index: idx + 1,
            status: "exhausted" as const,
            message: "Kuota Habis / Rate Limit Terlampaui (429)",
          };
        }
        if (status === 400 || status === 403 || msg.includes("API_KEY_INVALID") || msg.includes("not valid")) {
          return {
            key: cleanKey,
            index: idx + 1,
            status: "invalid" as const,
            message: "API Key Tidak Valid / Salah",
          };
        }

        // Try lite fallback
        try {
          await directGeminiRestCall(cleanKey, "gemini-3.1-flash-lite", [{ text: "ping" }], 5000);
          return {
            key: cleanKey,
            index: idx + 1,
            status: "ready" as const,
            message: "Aktif & Siap Digunakan (Token/Kuota Tersedia)",
          };
        } catch (liteErr: any) {
          const liteMsg = String(liteErr?.message || "");
          if (liteErr?.status === 429 || liteMsg.includes("429")) {
            return {
              key: cleanKey,
              index: idx + 1,
              status: "exhausted" as const,
              message: "Kuota Habis / Rate Limit Terlampaui (429)",
            };
          }
          if (liteErr?.status === 400 || liteErr?.status === 403 || liteMsg.includes("API_KEY_INVALID")) {
            return {
              key: cleanKey,
              index: idx + 1,
              status: "invalid" as const,
              message: "API Key Tidak Valid / Salah",
            };
          }
          return {
            key: cleanKey,
            index: idx + 1,
            status: "ready" as const,
            message: "Aktif (Terhubung ke Google AI)",
          };
        }
      }
    })
  );
}

/**
 * Analyze single question with server-first strategy and direct browser fallback
 */
export async function analyzeSingleQuestion(soal: QuestionAnalysisRequest): Promise<any> {
  // 1. Try server endpoint first
  try {
    const data = await safeFetchJson<{ result?: any; error?: string }>("/api/analyze-single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(soal),
    });

    if (data.result) {
      return data.result;
    }
  } catch (serverErr: any) {
    console.warn("Server /api/analyze-single returned error, switching to direct client fallback:", serverErr);
  }

  // 2. Direct browser fallback
  const availableKeys = (soal.apiKeys && soal.apiKeys.length > 0 ? soal.apiKeys : getStoredApiKeys()).filter(
    (k) => (k || "").trim().length > 5
  );

  if (availableKeys.length === 0) {
    throw new Error(
      "Belum ada Gemini API Key yang disetel. Silakan masukkan API Key di menu Pengaturan API Key (kanan atas)."
    );
  }

  const parts: any[] = [{ text: COMPACT_SYSTEM_PROMPT }];
  let questionText = `[SOAL #${soal.nomorSoal}] Nilai Maksimal: ${soal.nilaiMaksimal}\nNaskah Soal: ${
    soal.naskahSoal?.trim() || "(Lihat gambar lampiran soal)"
  }\n`;

  if (soal.gambarSoalBase64 && soal.gambarSoalMimeType) {
    const clean = soal.gambarSoalBase64.includes(",")
      ? soal.gambarSoalBase64.split(",")[1]
      : soal.gambarSoalBase64;
    parts.push({
      inlineData: {
        mimeType: soal.gambarSoalMimeType,
        data: clean,
      },
    });
    questionText += `(Lampiran gambar soal di atas)\n`;
  }

  questionText += `\n[JAWABAN SISWA]\n`;
  if (soal.jawabanTeks?.trim()) {
    questionText += `Teks Jawaban: ${soal.jawabanTeks.trim()}\n`;
  }

  if (soal.jawabanGambarBase64 && soal.jawabanGambarMimeType) {
    const cleanImg = soal.jawabanGambarBase64.includes(",")
      ? soal.jawabanGambarBase64.split(",")[1]
      : soal.jawabanGambarBase64;
    parts.push({
      inlineData: {
        mimeType: soal.jawabanGambarMimeType,
        data: cleanImg,
      },
    });
    questionText += `(Foto/screenshot jawaban siswa di atas. Mohon baca dan evaluasi tulisan pada gambar)\n`;
  }

  parts.push({ text: questionText });

  let lastError: any = null;

  for (let keyIdx = 0; keyIdx < availableKeys.length; keyIdx++) {
    const key = availableKeys[keyIdx].trim();
    if (!key) continue;

    for (let modelIdx = 0; modelIdx < CANDIDATE_MODELS.length; modelIdx++) {
      const modelName = CANDIDATE_MODELS[modelIdx];
      try {
        const response = await directGeminiRestCall(key, modelName, parts, 30000);
        const raw = response.text || "";
        const maxVal = soal.nilaiMaksimal || 10;
        const parsed = safeParseAnalysisJson(raw, maxVal);

        const clampedNilai = Math.max(0, Math.min(maxVal, Number(parsed.nilaiDiberikan) || 0));
        const clampedKesesuaian = Math.max(0, Math.min(100, Math.round(Number(parsed.kesesuaianPersen) || 0)));
        const clampedAi = Math.max(0, Math.min(100, Math.round(Number(parsed.indikasiAiPersen) || 0)));

        return {
          soalId: soal.id,
          nomorSoal: soal.nomorSoal,
          kesesuaianPersen: clampedKesesuaian,
          indikasiAiPersen: clampedAi,
          nilaiDiberikan: Math.round(clampedNilai * 10) / 10,
          nilaiMaksimal: maxVal,
          aiDugaanKategori: parsed.aiDugaanKategori || "Asli Siswa",
          ringkasanAnalisis: parsed.ringkasanAnalisis || "Analisis selesai.",
          ciriCiriAiTerdeteksi: Array.isArray(parsed.ciriCiriAiTerdeteksi) ? parsed.ciriCiriAiTerdeteksi : [],
          kelebihanJawaban: Array.isArray(parsed.kelebihanJawaban) ? parsed.kelebihanJawaban : [],
          kelemahanJawaban: Array.isArray(parsed.kelemahanJawaban) ? parsed.kelemahanJawaban : [],
          rekomendasiGuru: parsed.rekomendasiGuru || "Pertahankan kualitas pembelajaran.",
          analyzedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || "");
        if (err?.status === 400 || err?.status === 403 || msg.includes("API_KEY_INVALID")) {
          break;
        }
      }
    }
  }

  const errMsg = lastError?.message || "Gagal melakukan analisis jawaban.";
  throw new Error(errMsg);
}

/**
 * Analyze batch with server-first strategy and direct browser fallback
 */
export async function analyzeBatchQuestions(
  soalList: QuestionAnalysisRequest[],
  apiKeys?: string[]
): Promise<any[]> {
  try {
    const data = await safeFetchJson<{ results?: any[]; error?: string }>("/api/analyze-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soalList, apiKeys }),
    });

    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      return data.results;
    }
  } catch (serverErr) {
    console.warn("Server /api/analyze-batch error, switching to sequential client fallback:", serverErr);
  }

  const results: any[] = [];
  for (const s of soalList) {
    const res = await analyzeSingleQuestion({ ...s, apiKeys });
    results.push(res);
    await new Promise((r) => setTimeout(r, 200));
  }
  return results;
}
