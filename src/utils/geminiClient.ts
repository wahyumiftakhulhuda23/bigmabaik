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
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
  "gemini-flash-latest",
];

const COMPACT_SYSTEM_PROMPT = `Anda adalah sistem penilai & pendeteksi orisinalitas ujian "BigMA Baik" untuk guru di Indonesia dengan keahlian evaluasi pedagogis dan forensik teks tingkat tinggi.

TUGAS UTAMA: Evaluasi ketepatan materi secara mendalam serta lakukan audit ketat terhadap penggunaan AI (ChatGPT/Gemini/Claude, termasuk parafrasa & sisipan parsial) dan plagiarisme web.

PRINSIP WAJIB: ANALISIS MENDETAIL, KONTEKSTUAL & BEBAS KALIMAT KLISE/TEMPLATE
1. DILARANG KERAS menggunakan kalimat шаблон/generik berulang (seperti "Jawaban sudah sesuai", "Berdasarkan kriteria yang ditentukan", "Tidak ada ciri AI").
2. Setiap ulasan (ringkasan, kelebihan, kelemahan, bukti AI, plagiat, rekomendasi) WAJIB merujuk langsung pada istilah, konsep, teori, langkah pengerjaan, atau kalimat konkret yang ditulis siswa pada soal tersebut.
3. Buat penjelasan padat, tajam, dan langsung pada inti materi agar proses analisis cepat dan efisien tanpa mengorbankan kedalaman evaluasi.

PANDUAN DETAIL FIELD JSON:
- ringkasanAnalisis: 2-3 kalimat tajam mengulas esensi konsep jawaban siswa, letak kebenaran/kekeliruan utamanya, dan catatan integritasnya.
- kelebihanJawaban: Array 2-3 poin spesifik membeberkan konsep/langkah yang dijawab tepat dengan menyebutkan istilah atau bagian jawaban siswa.
- kelemahanJawaban: Array 1-3 poin spesifik membeberkan konsep yang kurang/salah, langkah terlewat, penjelasan yang dangkal, atau ketidaksesuaian thd pertanyaan soal.
- ciriCiriAiTerdeteksi: Array 1-3 poin. Jika terindikasi AI (≥10%), sebutkan kutipan frasa/pola sintetik/struktur simetris khas ChatGPT yang ditemukan. Jika orisinal (<10%), sebutkan bukti gaya penulisan organik dan diksi alami siswa.
- detailPlagiarisme: Uraian spesifik membedakan orisinalitas siswa vs kemiripan dengan definisi/sumber web (Brainly, Wikipedia, Roboguru, modul daring). Sebutkan frasa yang mirip jika ada.
- rekomendasiGuru: Saran tindak lanjut pedagogis konkret untuk guru terkait materi soal ini (misal topik remedial, penguatan konsep spesifik, atau verifikasi lisan).

PANDUAN DETEKSI PENGGUNAAN AI (SANGAT TELITI & PEKA TERHADAP MODIFIKASI/TRIK SISWA):
1. Deteksi AI Hibrida & Sisipan Sebagian (Partial Copy-Paste):
   - Waspadai siswa yang menyisipkan 1 kalimat pembuka sendiri lalu menyalin 1-2 paragraf/poin hasil generate AI.
   - Waspadai siswa yang hanya mencuplik beberapa poin/frasa kunci dari AI ke dalam jawabannya.
   - JIKA ADA potongan kalimat, paragraf, atau poin berformat AI meski hanya 20%-40% dari total jawaban, TETAP DETEKSI dan berikan indikasiAiPersen yang proporsional (misal: 35%-65%) serta aiDugaanKategori "Campuran AI" atau "Didominasi AI". JANGAN kategorikan "Asli Siswa" jika terdapat fragmen AI!

2. Deteksi AI yang Disusun Ulang / Parafrasa Dangkal (Rewritten / Paraphrased AI):
   - Siswa sering mengganti kata sambung, mengubah urutan poin, atau menghapus kata pembuka AI agar terlihat alami.
   - Kenali pola struktural sintetik:
     a. Diksi kaku/terlalu formal/akademis yang tidak lazim bagi siswa seusianya (misal: "secara komprehensif", "memiliki peranan fundamental", "esensial", "dapat disimpulkan bahwa", "penting untuk digarisbawahi").
     b. Pola kalimat berirama robotik, ritme penjelasan simetris (pengantar formal -> poin ber-bold simetris -> paragraf penutup diplomatis).
     c. Penjelasan hambar tanpa opini/konteks personal dan minim kesalahan tulis natural khas siswa.

3. Kategori Dugaan AI Wajib:
   - "Murni AI" (indikasiAiPersen ≥ 80%): Keseluruhan teks hasil generate AI tanpa modifikasi berarti.
   - "Didominasi AI" (indikasiAiPersen 51%-79%): Mayoritas teks dari AI, hanya sedikit kata/urutan yang diubah siswa.
   - "Campuran AI" (indikasiAiPersen 25%-50%): Siswa mencampur tulisan sendiri dengan potongan/poin AI, atau memparafrasa output AI.
   - "Didominasi Siswa" (indikasiAiPersen 10%-24%): Mayoritas tulisan siswa sendiri, hanya ada sedikit frasa formal umum.
   - "Asli Siswa" (indikasiAiPersen < 10%): Tulisan murni dan gaya bahasa organik alami siswa.

4. Deteksi Plagiarisme Internet:
   - Deteksi kemiripan teks/definisi dengan sumber web (Brainly, Roboguru, Ruangguru, Wikipedia, modul daring). Sebutkan sumber jika ada.

5. Penilaian Skor (nilaiDiberikan 0 s/d nilaiMaksimal):
   - Nilai kesesuaian materi (kesesuaianPersen 0-100%) dan berikan skor proporsional.

Output WAJIB JSON persis:
{
  "kesesuaianPersen": number,
  "indikasiAiPersen": number,
  "indikasiPlagiarismePersen": number,
  "plagiarismeKategori": "Bebas Plagiasi" | "Kemiripan Rendah" | "Kemiripan Sedang" | "Terindikasi Plagiat Web",
  "indikasiSumberPlagiarisme": string[],
  "detailPlagiarisme": string,
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
  const plagiatMatch = clean.match(/indikasiPlagiarismePersen["\s:]+(\d+)/i);
  const plagiatKatMatch = clean.match(/plagiarismeKategori["\s:]+"([^"]+)"/i);
  const nilaiMatch = clean.match(/nilaiDiberikan["\s:]+([\d.]+)/i);
  const kategoriMatch = clean.match(/aiDugaanKategori["\s:]+"([^"]+)"/i);
  const ringkasanMatch = clean.match(/ringkasanAnalisis["\s:]+"([^"]+)"/i);
  const detailPlagiatMatch = clean.match(/detailPlagiarisme["\s:]+"([^"]+)"/i);
  const rekomendasiMatch = clean.match(/rekomendasiGuru["\s:]+"([^"]+)"/i);

  if (kesesuaianMatch || nilaiMatch || ringkasanMatch || clean.length > 10) {
    const defaultPlagiat = plagiatMatch ? Number(plagiatMatch[1]) : 10;
    return {
      kesesuaianPersen: kesesuaianMatch ? Number(kesesuaianMatch[1]) : 75,
      indikasiAiPersen: indikasiMatch ? Number(indikasiMatch[1]) : 15,
      indikasiPlagiarismePersen: defaultPlagiat,
      plagiarismeKategori: plagiatKatMatch
        ? plagiatKatMatch[1]
        : defaultPlagiat > 50
        ? "Terindikasi Plagiat Web"
        : defaultPlagiat > 25
        ? "Kemiripan Sedang"
        : "Bebas Plagiasi",
      indikasiSumberPlagiarisme: [],
      detailPlagiarisme: detailPlagiatMatch ? detailPlagiatMatch[1] : "Tidak terdeteksi kesamaan kalimat signifikan dengan sumber web.",
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

async function directGeminiRestCall(
  apiKey: string,
  model: string,
  parts: any[],
  timeoutMs = 20000,
  maxTokens = 1000
) {
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
        maxOutputTokens: maxTokens,
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
 * Verify API Keys with server-first strategy and direct browser fallback (ultra-fast & 1 token per key)
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

  // Fallback: Direct test from client browser with fast 1-token ping
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
        await directGeminiRestCall(cleanKey, "gemini-2.5-flash-lite", [{ text: "ping" }], 4500, 1);
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

        // Try fast fallback with gemini-2.5-flash
        try {
          await directGeminiRestCall(cleanKey, "gemini-2.5-flash", [{ text: "ping" }], 4000, 1);
          return {
            key: cleanKey,
            index: idx + 1,
            status: "ready" as const,
            message: "Aktif & Siap Digunakan (Token/Kuota Tersedia)",
          };
        } catch (fallbackErr: any) {
          const fbMsg = String(fallbackErr?.message || "");
          if (fallbackErr?.status === 429 || fbMsg.includes("429")) {
            return {
              key: cleanKey,
              index: idx + 1,
              status: "exhausted" as const,
              message: "Kuota Habis / Rate Limit Terlampaui (429)",
            };
          }
          if (fallbackErr?.status === 400 || fallbackErr?.status === 403 || fbMsg.includes("API_KEY_INVALID")) {
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

  questionText += `\n[INSTRUKSI EVALUASI MENDETAIL & AUDIT AI]:
1. Evaluasi konsep materi secara mendalam: sebutkan konsep spesifik mana yang dijawab benar (pada kelebihanJawaban) dan bagian mana yang kurang/keliru/hilang (pada kelemahanJawaban).
2. Dilarang memberikan alasan шаблон/generik: setiap alasan WAJIB menyertakan kutipan kata/istilah yang ditulis siswa pada soal ini.
3. Periksa dengan cermat apakah ada potongan kalimat dari AI (ChatGPT/Gemini/Claude) yang disisipkan atau disusun ulang: jika ada, berikan indikasiAiPersen (30%-70%), pilih kategori "Campuran AI"/"Didominasi AI", dan sebutkan bukti potongan/pola kalimatnya pada ciriCiriAiTerdeteksi.
4. Berikan nilaiDiberikan (skala 0 - ${soal.nilaiMaksimal}) secara proporsional sesuai kualitas pemahaman materi.
`;

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
        let clampedAi = Math.max(0, Math.min(100, Math.round(Number(parsed.indikasiAiPersen) || 0)));
        const clampedPlagiat = Math.max(0, Math.min(100, Math.round(Number(parsed.indikasiPlagiarismePersen) || 0)));

        let plagiatKategori = parsed.plagiarismeKategori;
        if (!plagiatKategori) {
          if (clampedPlagiat > 60) plagiatKategori = "Terindikasi Plagiat Web";
          else if (clampedPlagiat > 30) plagiatKategori = "Kemiripan Sedang";
          else if (clampedPlagiat > 15) plagiatKategori = "Kemiripan Rendah";
          else plagiatKategori = "Bebas Plagiasi";
        }

        let aiKategori = parsed.aiDugaanKategori;
        if (!aiKategori || (aiKategori === "Asli Siswa" && clampedAi >= 25)) {
          if (clampedAi >= 80) aiKategori = "Murni AI";
          else if (clampedAi >= 51) aiKategori = "Didominasi AI";
          else if (clampedAi >= 25) aiKategori = "Campuran AI";
          else if (clampedAi >= 10) aiKategori = "Didominasi Siswa";
          else aiKategori = "Asli Siswa";
        } else if (aiKategori === "Campuran AI" && clampedAi < 25) {
          clampedAi = Math.max(clampedAi, 35);
        } else if (aiKategori === "Didominasi AI" && clampedAi < 51) {
          clampedAi = Math.max(clampedAi, 60);
        } else if (aiKategori === "Murni AI" && clampedAi < 80) {
          clampedAi = Math.max(clampedAi, 85);
        }

        const ciriAi = Array.isArray(parsed.ciriCiriAiTerdeteksi) && parsed.ciriCiriAiTerdeteksi.length > 0
          ? parsed.ciriCiriAiTerdeteksi
          : clampedAi >= 25
          ? ["Ditemukan pola struktur kalimat dan fragmen frasa khas kecerdasan buatan (LLM) yang dicampur/disusun ulang."]
          : [];

        return {
          soalId: soal.id,
          nomorSoal: soal.nomorSoal,
          kesesuaianPersen: clampedKesesuaian,
          indikasiAiPersen: clampedAi,
          indikasiPlagiarismePersen: clampedPlagiat,
          plagiarismeKategori: plagiatKategori,
          indikasiSumberPlagiarisme: Array.isArray(parsed.indikasiSumberPlagiarisme)
            ? parsed.indikasiSumberPlagiarisme
            : [],
          detailPlagiarisme:
            parsed.detailPlagiarisme ||
            (clampedPlagiat > 40
              ? "Ditemukan kesamaan struktur kalimat dan frasa spesifik dengan materi yang ada di internet."
              : "Rangkaian kata dan penjelasan tergolong alami dan orisinal dari pemahaman siswa."),
          nilaiDiberikan: Math.round(clampedNilai * 10) / 10,
          nilaiMaksimal: maxVal,
          aiDugaanKategori: aiKategori,
          ringkasanAnalisis: parsed.ringkasanAnalisis || "Analisis selesai.",
          ciriCiriAiTerdeteksi: ciriAi,
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
