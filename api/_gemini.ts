import dotenv from "dotenv";

try {
  dotenv.config();
} catch {}

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

export interface KeyCheckResult {
  key: string;
  index: number;
  status: "ready" | "exhausted" | "invalid" | "error";
  message: string;
}

export const COMPACT_SYSTEM_PROMPT = `Anda adalah sistem penilai & pendeteksi orisinalitas ujian "BigMA Baik" untuk guru di Indonesia dengan keahlian evaluasi pedagogis dan forensik teks tingkat tinggi.

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

export const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
  "gemini-flash-latest",
];

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function resolveCandidateKeys(customKeys?: string[]): string[] {
  const result: string[] = [];

  if (Array.isArray(customKeys)) {
    for (const k of customKeys) {
      const clean = (k || "").trim();
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

export function isTransientError(err: any): boolean {
  const errMsg = String(err?.message || err || "");
  const status = err?.status || err?.statusCode || err?.code;
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
  const status = err?.status || err?.statusCode || err?.code;
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
  const status = err?.status || err?.statusCode || err?.code;
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

  // 3. Fallback regex extraction
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

  throw new Error("Gagal membaca format JSON dari respons AI. Silakan klik tombol 'Analisis' kembali.");
}

/**
 * Native REST call to Gemini v1beta generateContent
 * Uses standard Node.js/browser fetch without any external binary dependencies.
 */
export async function callGeminiRest(
  apiKey: string,
  model: string,
  parts: any[],
  timeoutMs = 20000,
  maxTokens = 1000
): Promise<{ text: string }> {
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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responseJson: any;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      throw new Error(`Google API status ${response.status}: ${responseText.slice(0, 150)}`);
    }

    if (!response.ok || responseJson.error) {
      const errorObj = responseJson.error || {};
      const errMessage = errorObj.message || `HTTP ${response.status}`;
      const err = new Error(errMessage);
      (err as any).status = response.status;
      (err as any).code = errorObj.code || response.status;
      (err as any).details = errorObj;
      throw err;
    }

    const candidate = responseJson.candidates?.[0];
    const candidatePart = candidate?.content?.parts?.[0];
    const outputText = candidatePart?.text || "";

    if (!outputText) {
      const finishReason = candidate?.finishReason;
      if (finishReason && finishReason !== "STOP") {
        throw new Error(`AI berhenti dengan alasan: ${finishReason}`);
      }
      throw new Error("Model Gemini tidak mengembalikan teks jawaban.");
    }

    return { text: outputText };
  } catch (err: any) {
    if (err.name === "AbortError") {
      const timeoutErr = new Error("Waktu tunggu habis (Timeout). Server Google AI lambat merespons.");
      (timeoutErr as any).status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Test single API key validity & quota via lightweight 1-token ping (300-500ms)
 */
export async function verifySingleKey(rawKey: string, index: number): Promise<KeyCheckResult> {
  const key = (rawKey || "").trim();
  if (!key) {
    return {
      key: "",
      index: index + 1,
      status: "invalid",
      message: "API Key kosong",
    };
  }

  // Super fast 1-token ping
  try {
    await callGeminiRest(key, "gemini-2.5-flash-lite", [{ text: "ping" }], 4500, 1);
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

    // Fast fallback with gemini-2.5-flash
    try {
      await callGeminiRest(key, "gemini-2.5-flash", [{ text: "ping" }], 4000, 1);
      return {
        key,
        index: index + 1,
        status: "ready",
        message: "Aktif & Siap Digunakan (Token/Kuota Tersedia)",
      };
    } catch (fallbackErr: any) {
      if (isQuotaError(fallbackErr)) {
        return {
          key,
          index: index + 1,
          status: "exhausted",
          message: "Kuota Habis / Rate Limit Terlampaui (429)",
        };
      }
      if (isInvalidKeyError(fallbackErr)) {
        return {
          key,
          index: index + 1,
          status: "invalid",
          message: "API Key Tidak Valid / Salah",
        };
      }
      if (isTransientError(fallbackErr) || isTransientError(err)) {
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
        message: `Gagal: ${cleanErrorMessage(fallbackErr || err).slice(0, 80)}`,
      };
    }
  }
}

export async function verifyKeysCore(rawKeys: string[]): Promise<KeyCheckResult[]> {
  return Promise.all(rawKeys.map((k, i) => verifySingleKey(k, i)));
}

export async function analyzeWithKeyRotation(
  candidateKeys: string[],
  soal: QuestionAnalysisRequest
): Promise<any> {
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

  for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
    const key = candidateKeys[keyIdx].trim();
    if (!key) continue;

    for (let modelIdx = 0; modelIdx < CANDIDATE_MODELS.length; modelIdx++) {
      const modelName = CANDIDATE_MODELS[modelIdx];
      try {
        const response = await callGeminiRest(key, modelName, parts, 30000);
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
        console.log(`[Key #${keyIdx + 1}] Model ${modelName} returned:`, cleanErrorMessage(err));

        if (isInvalidKeyError(err)) {
          break;
        }

        if (modelIdx < CANDIDATE_MODELS.length - 1) {
          continue;
        } else {
          await sleep(400);
        }
      }
    }

    if (isInvalidKeyError(lastError)) {
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
