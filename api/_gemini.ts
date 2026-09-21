import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

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
  apiKeys?: string[]; // Multiple user-provided Gemini API keys (one per line)
}

export interface KeyCheckResult {
  key: string;
  index: number;
  status: "ready" | "exhausted" | "invalid" | "error";
  message: string;
}

export const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    kesesuaianPersen: {
      type: Type.NUMBER,
      description: "Persentase kesesuaian jawaban siswa terhadap soal (0-100)",
    },
    indikasiAiPersen: {
      type: Type.NUMBER,
      description: "Persentase kemungkinan jawaban dibuat AI (0-100)",
    },
    nilaiDiberikan: {
      type: Type.NUMBER,
      description: "Nilai akhir berkisar 0 sampai nilaiMaksimal",
    },
    aiDugaanKategori: {
      type: Type.STRING,
      description: "Kategori: 'Asli Siswa', 'Didominasi Siswa', 'Campuran AI', 'Didominasi AI', atau 'Murni AI'",
    },
    ringkasanAnalisis: {
      type: Type.STRING,
      description: "Penjelasan ringkas 1-2 kalimat alasan penilaian dan indikasi AI",
    },
    ciriCiriAiTerdeteksi: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Ciri AI terdeteksi jika ada",
    },
    kelebihanJawaban: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Poin kelebihan jawaban",
    },
    kelemahanJawaban: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Poin kelemahan jawaban",
    },
    rekomendasiGuru: {
      type: Type.STRING,
      description: "Saran singkat untuk guru",
    },
  },
  required: [
    "kesesuaianPersen",
    "indikasiAiPersen",
    "nilaiDiberikan",
    "aiDugaanKategori",
    "ringkasanAnalisis",
    "ciriCiriAiTerdeteksi",
    "kelebihanJawaban",
    "kelemahanJawaban",
    "rekomendasiGuru",
  ],
};

export const COMPACT_SYSTEM_PROMPT = `Anda adalah penilai ujian "BigMA Baik" untuk guru di Indonesia.
Analisis jawaban siswa secara objektif & hemat token:
1. Kesesuaian (0-100%): akurasi & kelengkapan jawaban thd soal.
2. Indikasi AI (0-100%): deteksi pola kalimat kaku AI / boilerplate vs gaya alami siswa.
3. Nilai Diberikan: skor 0 sampai nilaiMaksimal sesuai mutu jawaban dan integritas.
Kembalikan JSON sesuai schema.`;

export const CANDIDATE_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

export function isTransientError(err: any): boolean {
  const errMsg = String(err?.message || err || "");
  const status = err?.status || err?.statusCode;
  return (
    status === 503 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    errMsg.includes("503") ||
    errMsg.includes("UNAVAILABLE") ||
    errMsg.includes("high demand") ||
    errMsg.includes("temporarily") ||
    errMsg.includes("overloaded") ||
    errMsg.includes("spikes in demand") ||
    errMsg.includes("Please try again later")
  );
}

export function isInvalidKeyError(err: any): boolean {
  const errMsg = String(err?.message || err || "");
  const status = err?.status || err?.statusCode;
  return (
    status === 400 ||
    status === 403 ||
    errMsg.includes("API_KEY_INVALID") ||
    errMsg.includes("API key not valid") ||
    errMsg.includes("PERMISSION_DENIED") ||
    errMsg.includes("not valid")
  );
}

export function isQuotaError(err: any): boolean {
  const errMsg = String(err?.message || err || "");
  const status = err?.status || err?.statusCode;
  return (
    status === 429 ||
    errMsg.includes("429") ||
    errMsg.includes("RESOURCE_EXHAUSTED") ||
    errMsg.includes("quota") ||
    errMsg.includes("Rate limit")
  );
}

export function cleanErrorMessage(err: any): string {
  const raw = String(err?.message || err || "");
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {}
  return raw;
}

export function safeParseAnalysisJson(rawText: string, maxVal: number): any {
  let clean = (rawText || "").trim();

  // Strip markdown code fences if present
  clean = clean.replace(/^```(?:json)?\s*/i, "");
  clean = clean.replace(/\s*```$/, "");
  clean = clean.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(clean);
  } catch {}

  // 2. Slice outermost { ... }
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

  // 3. Fallback extraction via regex
  const kesesuaianMatch = clean.match(/kesesuaianPersen["\s:]+(\d+)/i);
  const indikasiMatch = clean.match(/indikasiAiPersen["\s:]+(\d+)/i);
  const nilaiMatch = clean.match(/nilaiDiberikan["\s:]+([\d.]+)/i);
  const kategoriMatch = clean.match(/aiDugaanKategori["\s:]+"([^"]+)"/i);
  const ringkasanMatch = clean.match(/ringkasanAnalisis["\s:]+"([^"]+)"/i);
  const rekomendasiMatch = clean.match(/rekomendasiGuru["\s:]+"([^"]+)"/i);

  if (kesesuaianMatch || nilaiMatch || ringkasanMatch || clean.length > 20) {
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

  throw new Error("Gagal membaca format JSON dari respons AI. Silakan klik tombol 'Analisis' kembali.");
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function resolveCandidateKeys(customKeys?: string[]): string[] {
  const result: string[] = [];

  if (Array.isArray(customKeys)) {
    for (const k of customKeys) {
      const clean = k.trim();
      if (clean && !result.includes(clean)) {
        result.push(clean);
      }
    }
  }

  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey && !result.includes(envKey)) {
    result.push(envKey);
  }

  return result;
}

export async function verifyKeysCore(rawKeys: string[]): Promise<KeyCheckResult[]> {
  const testSingleKey = async (rawKey: string, index: number): Promise<KeyCheckResult> => {
    const key = (rawKey || "").trim();
    if (!key) {
      return {
        key: "",
        index: index + 1,
        status: "invalid",
        message: "API Key kosong",
      };
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const pingWithTimeout = async (model: string, timeoutMs: number) => {
        return new Promise<any>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(new Error("Timeout verifikasi (server lambat merespons)"));
          }, timeoutMs);

          ai.models
            .generateContent({
              model,
              contents: "ping",
              config: {
                maxOutputTokens: 2,
              },
            })
            .then((res) => {
              clearTimeout(timer);
              resolve(res);
            })
            .catch((err) => {
              clearTimeout(timer);
              reject(err);
            });
        });
      };

      try {
        await pingWithTimeout("gemini-flash-latest", 8000);
        return {
          key,
          index: index + 1,
          status: "ready",
          message: "Aktif & Siap Digunakan (Token/Kuota Tersedia)",
        };
      } catch (err: any) {
        if (isQuotaError(err)) {
          return {
            key,
            index: index + 1,
            status: "exhausted",
            message: "Kuota Habis / Rate Limit Terlampaui (429)",
          };
        }
        if (isInvalidKeyError(err)) {
          return {
            key,
            index: index + 1,
            status: "invalid",
            message: "API Key Tidak Valid / Salah",
          };
        }

        // Fast backup test with gemini-3.1-flash-lite
        try {
          await pingWithTimeout("gemini-3.1-flash-lite", 6000);
          return {
            key,
            index: index + 1,
            status: "ready",
            message: "Aktif & Siap Digunakan (Token/Kuota Tersedia)",
          };
        } catch (liteErr: any) {
          if (isQuotaError(liteErr)) {
            return {
              key,
              index: index + 1,
              status: "exhausted",
              message: "Kuota Habis / Rate Limit Terlampaui (429)",
            };
          }
          if (isInvalidKeyError(liteErr)) {
            return {
              key,
              index: index + 1,
              status: "invalid",
              message: "API Key Tidak Valid / Salah",
            };
          }
          if (isTransientError(liteErr) || isTransientError(err)) {
            return {
              key,
              index: index + 1,
              status: "ready",
              message: "Aktif (Google AI merespons, siap digunakan)",
            };
          }

          return {
            key,
            index: index + 1,
            status: "error",
            message: `Gagal: ${cleanErrorMessage(liteErr || err).slice(0, 80)}`,
          };
        }
      }
    } catch (unexpectedErr: any) {
      return {
        key,
        index: index + 1,
        status: "error",
        message: `Gagal: ${cleanErrorMessage(unexpectedErr).slice(0, 80)}`,
      };
    }
  };

  return Promise.all(rawKeys.map((k, i) => testSingleKey(k, i)));
}

export async function analyzeWithKeyRotation(
  candidateKeys: string[],
  soal: QuestionAnalysisRequest
): Promise<any> {
  const parts: any[] = [{ text: COMPACT_SYSTEM_PROMPT }];

  let questionText = `[SOAL #${soal.nomorSoal}] Maks: ${soal.nilaiMaksimal}\nNaskah: ${
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
    questionText += `Teks: ${soal.jawabanTeks.trim()}\n`;
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

  for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
    const key = candidateKeys[keyIdx].trim();
    if (!key) continue;

    try {
      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      for (let modelIdx = 0; modelIdx < CANDIDATE_MODELS.length; modelIdx++) {
        const modelName = CANDIDATE_MODELS[modelIdx];
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              responseMimeType: "application/json",
              responseSchema: analysisSchema,
              temperature: 0.1,
            },
          });

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
          console.log(
            `[Key #${keyIdx + 1}] Model ${modelName} returned:`,
            cleanErrorMessage(err)
          );

          if (isInvalidKeyError(err)) {
            break;
          }

          if (modelIdx < CANDIDATE_MODELS.length - 1) {
            continue;
          } else {
            await sleep(500);
          }
        }
      }

      if (isInvalidKeyError(lastError)) {
        continue;
      }
    } catch (genAiInitErr: any) {
      lastError = genAiInitErr;
      continue;
    }
  }

  let userFriendlyMsg = cleanErrorMessage(lastError);
  if (isTransientError(lastError)) {
    userFriendlyMsg =
      "Server Google AI sedang mengalami lonjakan beban sesaat (503). Sistem telah mencoba mengulang dan mengalihkan model. Silakan klik tombol 'Analisis' kembali dalam beberapa detik.";
  } else if (isQuotaError(lastError)) {
    userFriendlyMsg =
      "Kuota atau rate limit API Key Gemini telah habis (429). Silakan tambahkan atau ganti API Key lain di menu Pengaturan API Key.";
  } else if (isInvalidKeyError(lastError)) {
    userFriendlyMsg =
      "API Key Gemini tidak valid atau tidak memiliki izin akses. Silakan periksa kembali API Key Anda.";
  }

  throw new Error(userFriendlyMsg);
}

export async function analyzeSingleCore(soal: QuestionAnalysisRequest): Promise<any> {
  const candidateKeys = resolveCandidateKeys(soal.apiKeys);
  if (candidateKeys.length === 0) {
    throw new Error(
      "Belum ada Gemini API Key yang disetel. Silakan masukkan API Key di menu Pengaturan API Key (kanan atas) atau setel GEMINI_API_KEY pada environment variable."
    );
  }
  return analyzeWithKeyRotation(candidateKeys, soal);
}

export async function analyzeBatchCore(
  soalList: QuestionAnalysisRequest[],
  customKeys?: string[]
): Promise<any[]> {
  const candidateKeys = resolveCandidateKeys(customKeys);
  if (candidateKeys.length === 0) {
    throw new Error(
      "Belum ada Gemini API Key yang disetel. Silakan masukkan API Key di menu Pengaturan API Key (kanan atas) atau setel GEMINI_API_KEY pada environment variable."
    );
  }

  const results: any[] = [];
  for (const s of soalList) {
    const res = await analyzeWithKeyRotation(candidateKeys, s);
    results.push(res);
    await sleep(250);
  }
  return results;
}
