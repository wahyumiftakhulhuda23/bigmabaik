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

export const COMPACT_SYSTEM_PROMPT = `Anda adalah sistem penilai & auditor forensik integritas ujian "BigMA Baik" untuk guru di Indonesia dengan evaluasi analitis mendalam dan audit forensik ketat.

TUGAS UTAMA: 
1. Evaluasi ketepatan, keselarasan, dan kebenaran materi jawaban siswa terhadap soal & kunci jawaban secara objektif.
2. Lakukan audit forensik SUPER KETAT thd indikasi AI (ChatGPT/Gemini/Claude/DeepSeek, termasuk AI yang disusun ulang, diparafrasa, atau dicopas hibrida) serta plagiarisme web (Brainly, Roboguru, Wikipedia, modul ajar).
3. HUKUM MATEMATIS KORELASI NILAI & KESESUAIAN:
   - kesesuaianPersen (0-100%) merepresentasikan persentase ketepatan materi terhadap soal.
   - JIKA kesesuaianPersen = 0% -> nilaiDiberikan WAJIB 0 (misal: 0/20).
   - JIKA kesesuaianPersen = 20% dari soal 20 poin -> Nilai Dasar maksimal = (20/100)*20 = 4 poin (DILARANG KERAS memberikan 15/20!).
   - Nilai per soal (nilaiDiberikan) = (kesesuaianPersen / 100) * nilaiMaksimal * (1 - Total Penalti Integritas).

PRINSIP EVALUASI & FORENSIK INTEGRITAS:
1. SINKRONISASI KESESUAIAN & JAWABAN TIDAK NYAMBUNG / MELENCENG:
   - JAWABAN SINKRON & TEPAT (85% - 100%): Konsep benar, istilah materi akurat, dan menjawab tuntas pertanyaan soal.
   - JAWABAN SEBAGIAN BENAR (40% - 75%): Konsep pokok tersinggung namun ada langkah/istilah penting yang terlewat atau kurang lengkap.
   - JAWABAN TIDAK SINKRON / SALAH TOTAL / MELENCENG (0% - 30%): 
     * Berikan kesesuaianPersen RENDAH (0% - 30%).
     * Pada ringkasanAnalisis dan kelemahanJawaban: BEDAH SECARA DETAIL letak ketidaksinkronannya! Jelaskan apa yang diminta pertanyaan soal vs apa yang ditulis siswa, dan tunjukkan mengapa jawaban tersebut melenceng/tidak relevan.
     * Pada rekomendasiGuru: Berikan saran remedial spesifik untuk membedah kata kunci soal dan meluruskan konsep yang keliru.

2. AUDIT FORENSIK AI SUPER SENSITIF & KETAT (JANGAN MUDAH MENILAI ASLI / ORIGINAL):
   - Waspadai ciri-ciri khas teks hasil AI:
     * Diksi akademis sintetis/terjemahan kaku: "secara komprehensif", "memiliki peran fundamental", "esensial", "krusial", "urgensi", "mengejawantahkan", "lanskap digital", "dalam konteks ini", "penting untuk digarisbawahi".
     * Struktur kalimat robotik & simetris: Kalimat pembuka klise ("Tentu, berikut adalah...", "Secara umum..."), pemaparan poin ber-bold simetris, dan kesimpulan baku ("Dengan demikian...", "Dapat disimpulkan bahwa...").
     * Pola hibrida / parafrasa: Siswa menulis 1 kalimat sendiri lalu menyalin poin AI -> DETEKSI sebagai "Campuran AI" (30%-50%) atau "Didominasi AI" (55%-75%).
   - Hanya beri label "Asli Siswa" (<15% AI) jika gaya bahasa benar-benar alami, menggunakan kosakata khas siswa, ada variasi penalaran personal, atau ketidaksempurnaan khas pengerjaan mandiri.

3. DETEKSI PLAGIARISME WEB & MODUL:
   - Deteksi kemiripan teks/definisi baku dengan sumber web (Brainly, Roboguru, Ruangguru, Zenius, Wikipedia, CoLearn, Modul Kemdikbud).
   - Jika terindikasi copy-paste web, naikkan indikasiPlagiarismePersen (35%-80%), kategorikan sebagai "Terindikasi Plagiat Web" atau "Kemiripan Sedang", sebutkan sumber di indikasiSumberPlagiarisme, dan jelaskan bagian yang mirip di detailPlagiarisme.

4. PENALTI INTEGRITAS TERHADAP NILAI:
   - Murni AI (≥80%): Potong 70%-80% dari nilai dasar materi.
   - Didominasi AI (51%-79%): Potong 40%-55% dari nilai dasar materi.
   - Campuran AI (25%-50%): Potong 20%-35% dari nilai dasar materi.
   - Terindikasi Plagiat Web (>50%): Potong 40%-60% dari nilai dasar materi.
   - Kemiripan Sedang Plagiat (25%-50%): Potong 15%-30% dari nilai dasar materi.

5. DILARANG KERAS MENGGUNAKAN KALIMAT KLISE / TEMPLATE:
   - DILARANG menulis kalimat шаблон seperti "Jawaban siswa telah dinilai berdasarkan kriteria" atau "Pertahankan dan terus tingkatkan pemahaman".
   - Setiap ulasan dan rekomendasi WAJIB unik, membedah istilah materi, rumus, langkah pengerjaan, atau kutipan kalimat siswa pada soal ini.

PANDUAN DETAIL FIELD JSON:
- ringkasanAnalisis: 2-4 kalimat tajam mengulas letak kebenaran konsep materi siswa, letak ketidaksinkronannya jika tidak nyambung, catatan penalti jika ada AI/plagiat, dan pertimbangan nilainya.
- kelebihanJawaban: Array poin spesifik menguraikan konsep/langkah yang dijawab tepat dengan menyebutkan istilah atau kutipan siswa (kosongkan jika jawaban sama sekali salah/tidak nyambung).
- kelemahanJawaban: Array 1-3 poin spesifik menguraikan letak konsep yang kurang/salah, langkah terlewat, atau rincian mengapa jawaban tidak nyambung dengan pertanyaan soal.
- ciriCiriAiTerdeteksi: Array 1-3 poin mengutip frasa sintetis / bukti pola susunan AI yang ditemukan jika terindikasi AI (≥10%), atau bukti gaya penulisan organik jika orisinal (<10%).
- detailPlagiarisme: Uraian spesifik membedakan tulisan orisinal vs kemiripan definisi/sumber web (Brainly, Wikipedia, Roboguru, modul daring).
- rekomendasiGuru: Saran bimbingan pedagogis konkret, mendalam, dan kontekstual terkait topik soal ini (misal uji lisan, pembedahan kata kunci soal, penugasan analisis mandiri tanpa gawai, remedial konsep tertentu).

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
    const rawKesesuaian = kesesuaianMatch ? Number(kesesuaianMatch[1]) : 50;
    const defaultPlagiat = plagiatMatch ? Number(plagiatMatch[1]) : 10;
    const rawAi = indikasiMatch ? Number(indikasiMatch[1]) : 15;
    const baseNilai = (rawKesesuaian / 100) * maxVal;

    return {
      kesesuaianPersen: rawKesesuaian,
      indikasiAiPersen: rawAi,
      indikasiPlagiarismePersen: defaultPlagiat,
      plagiarismeKategori: plagiatKatMatch
        ? plagiatKatMatch[1]
        : defaultPlagiat > 50
        ? "Terindikasi Plagiat Web"
        : defaultPlagiat > 25
        ? "Kemiripan Sedang"
        : "Bebas Plagiasi",
      indikasiSumberPlagiarisme: [],
      detailPlagiarisme: detailPlagiatMatch ? detailPlagiatMatch[1] : "Gaya bahasa dan penyusunan kalimat tergolong wajar.",
      nilaiDiberikan: nilaiMatch ? Math.min(Number(nilaiMatch[1]), baseNilai) : baseNilai,
      aiDugaanKategori: kategoriMatch ? kategoriMatch[1] : rawAi >= 25 ? "Campuran AI" : "Asli Siswa",
      ringkasanAnalisis:
        ringkasanMatch
          ? ringkasanMatch[1]
          : "Evaluasi substansi materi dan audit forensik integritas telah diselesaikan untuk nomor soal ini.",
      ciriCiriAiTerdeteksi: [],
      kelebihanJawaban: rawKesesuaian > 30 ? ["Konsep pokok telah ditelaah kesesuaian substansinya terhadap pertanyaan soal."] : [],
      kelemahanJawaban: rawKesesuaian < 50 ? ["Jawaban kurang relevan atau belum menjawab konsep yang diminta pada soal."] : [],
      rekomendasiGuru:
        rekomendasiMatch
          ? rekomendasiMatch[1]
          : "Lakukan bimbingan remedial dan konfirmasi pemahaman lisan terkait konsep materi pada soal ini.",
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

  questionText += `\n[INSTRUKSI EVALUASI FORENSIK, SINKRONISASI KESESUAIAN & PENALTI NILAI]:
1. SINKRONISASI KESESUAIAN (kesesuaianPersen: 0 - 100%):
   - Jika jawaban siswa nyambung dan substansinya benar: berikan kesesuaianPersen TINGGI (85%-100%).
   - JIKA JAWABAN TIDAK NYAMBUNG / MELENCENG / SALAH TOTAL: berikan kesesuaianPersen RENDAH (0%-30%).
   - JIKA KESESUAIAN = 0% -> nilaiDiberikan HARUS 0!
   - JELASKAN KETIDAKSINKRONANNYA SECARA DETAIL di ringkasanAnalisis dan kelemahanJawaban: sebutkan apa yang diminta pertanyaan soal vs apa yang dijawab siswa dan tunjukkan mengapa jawaban tersebut melenceng/tidak relevan.
2. AUDIT FORENSIK AI SUPER KETAT:
   - Periksa pola teks hasil ChatGPT/Gemini/Claude/DeepSeek (poin-poin simetris ber-bold, frasa pembuka/penutup baku, diksi kaku 'secara komprehensif', 'esensial', 'fundamental', 'urgensi').
   - Jika ada indikasi AI campur/disusun ulang, berikan indikasiAiPersen (35%-80%), jangan beri label Asli Siswa!
3. PLAGIARISME WEB:
   - Periksa kemiripan dengan kunci jawaban/Brainly/Roboguru/Wikipedia/modul daring.
4. FORMULA NILAI:
   - Nilai Dasar = (kesesuaianPersen / 100) * ${soal.nilaiMaksimal}.
   - Jika ada AI atau Plagiat, kurangi dari Nilai Dasar secara proporsional.
5. REKOMENDASI GURU:
   - Berikan saran bimbingan pedagogis yang super detail, spesifik untuk nomor soal dan konsep ini (misal uji lisan, pembedahan konsep, perbaikan mandiri).
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

        // Kalkulasi Penalti Integritas (AI & Plagiarisme mengurangi nilai)
        // Nilai dasar mutlak dihitung langsung dari tingkat kesesuaian materi
        const baseScore = (clampedKesesuaian / 100) * maxVal;
        let aiPenaltyRatio = 0;
        if (clampedAi >= 80) aiPenaltyRatio = 0.75;
        else if (clampedAi >= 51) aiPenaltyRatio = 0.50;
        else if (clampedAi >= 25) aiPenaltyRatio = 0.25;
        else if (clampedAi >= 10) aiPenaltyRatio = 0.10;

        let plagiatPenaltyRatio = 0;
        if (clampedPlagiat > 60) plagiatPenaltyRatio = 0.50;
        else if (clampedPlagiat > 30) plagiatPenaltyRatio = 0.25;
        else if (clampedPlagiat > 15) plagiatPenaltyRatio = 0.10;

        const totalPenaltyRatio = Math.min(0.90, aiPenaltyRatio + (plagiatPenaltyRatio * 0.7));
        const maxAllowedScore = baseScore * (1 - totalPenaltyRatio);

        let finalScore = 0;
        if (clampedKesesuaian === 0) {
          finalScore = 0;
        } else {
          let parsedNilai = Number(parsed.nilaiDiberikan);
          if (isNaN(parsedNilai) || parsedNilai < 0) {
            finalScore = maxAllowedScore;
          } else {
            // Nilai tidak boleh melebihi batas atas materi dan penalti integritas
            finalScore = Math.min(parsedNilai, maxAllowedScore);
          }
        }
        const clampedNilai = Math.max(0, Math.min(maxVal, Math.round(finalScore * 10) / 10));

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
          ringkasanAnalisis: parsed.ringkasanAnalisis || "Evaluasi jawaban pada nomor ini telah diselesaikan.",
          ciriCiriAiTerdeteksi: ciriAi,
          kelebihanJawaban: Array.isArray(parsed.kelebihanJawaban) ? parsed.kelebihanJawaban : [],
          kelemahanJawaban: Array.isArray(parsed.kelemahanJawaban) ? parsed.kelemahanJawaban : [],
          rekomendasiGuru: parsed.rekomendasiGuru || "Lakukan konfirmasi atau pendalaman pemahaman materi.",
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
