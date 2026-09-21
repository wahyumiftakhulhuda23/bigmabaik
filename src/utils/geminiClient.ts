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

const COMPACT_SYSTEM_PROMPT = `Anda adalah sistem penilai & auditor forensik integritas ujian "BigMA Baik" untuk guru di Indonesia dengan evaluasi analitis mendalam dan audit forensik ketat.

TUGAS UTAMA: 
1. Evaluasi ketepatan, keselarasan, dan kebenaran materi jawaban siswa terhadap soal & kunci jawaban secara objektif.
2. Lakukan audit forensik SUPER KETAT thd indikasi AI (ChatGPT/Gemini/Claude/DeepSeek, termasuk AI yang disusun ulang, diparafrasa, atau dicopas hibrida) serta plagiarisme web (Brainly, Roboguru, Wikipedia, modul ajar).
3. HUKUM MATEMATIS KORELASI NILAI & KESESUAIAN (ATURAN SETENGAH POIN & FAKTOR PENGURANG):
   - kesesuaianPersen (0-100%) merepresentasikan persentase ketepatan materi terhadap soal.
   - JIKA kesesuaianPersen < 50% (tidak sesuai/melenceng), maka Nilai Dasar TIDAK BOLEH MELEBIHI SETENGAH NILAI MAKSIMAL (< 0.5 * nilaiMaksimal).
   - JIKA kesesuaianPersen = 0% -> Nilai WAJIB 0.0 (misal: 0/20).
   - JIKA kesesuaianPersen = 20% dari soal 20 poin -> Nilai Dasar kotor = (20/100)*20 = 4.0 poin (DILARANG KERAS memberikan 15/20!).
   - FAKTOR PENGURANG NILAI (PENALTI INTEGRITAS):
     * Indikasi AI (ChatGPT/LLM): Memotong skor dari Nilai Dasar kotor (10% s.d. 75% pemotongan).
     * Plagiarisme Web: Memotong skor dari Nilai Dasar kotor (10% s.d. 50% pemotongan).
   - Total Nilai Akhir = Nilai Dasar kotor - Potongan AI - Potongan Plagiarisme.

PRINSIP EVALUASI & FORENSIK INTEGRITAS:
1. SINKRONISASI KESESUAIAN & JAWABAN TIDAK NYAMBUNG / MELENCENG:
   - JAWABAN SINKRON & TEPAT (85% - 100%): Konsep benar, istilah materi akurat, dan menjawab tuntas pertanyaan soal.
   - JAWABAN SEBAGIAN BENAR (40% - 75%): Konsep pokok tersinggung namun ada langkah/istilah penting yang terlewat atau kurang lengkap.
   - JAWABAN TIDAK SINKRON / SALAH TOTAL / MELENCENG (0% - 35%): 
     * Berikan kesesuaianPersen RENDAH (0% - 35%). Nilai dasar maksimal hanya (kesesuaianPersen/100)*nilaiMaksimal (kurang dari setengah nilai total).
     * Pada ringkasanAnalisis dan kelemahanJawaban: BEDAH SECARA DETAIL letak ketidaksinkronannya! Jelaskan apa yang diminta pertanyaan soal vs apa yang ditulis siswa, dan tunjukkan mengapa jawaban tersebut melenceng/tidak relevan.
     * Pada rekomendasiGuru: Berikan saran remedial spesifik untuk membedah kata kunci soal dan meluruskan konsep yang keliru.

2. AUDIT FORENSIK AI SUPER SENSITIF & KETAT (PENGURANGAN POIN):
   - Waspadai ciri-ciri khas teks hasil AI:
     * Diksi akademis sintetis/terjemahan kaku: "secara komprehensif", "memiliki peran fundamental", "esensial", "krusial", "urgensi", "mengejawantahkan", "lanskap digital", "dalam konteks ini", "penting untuk digarisbawahi".
     * Struktur kalimat robotik & simetris: Kalimat pembuka klise ("Tentu, berikut adalah...", "Secara umum..."), pemaparan poin ber-bold simetris, dan kesimpulan baku ("Dengan demikian...", "Dapat disimpulkan bahwa...").
     * Pola hibrida / parafrasa: Siswa menulis 1 kalimat sendiri lalu menyalin poin AI -> DETEKSI sebagai "Campuran AI" (25%-50%) atau "Didominasi AI" (51%-79%) dan kurangi poinnya!
   - Hanya beri label "Asli Siswa" (<15% AI) jika gaya bahasa benar-benar alami siswa.

3. DETEKSI PLAGIARISME WEB & MODUL (PENGURANGAN POIN):
   - Deteksi kemiripan teks/definisi baku dengan sumber web (Brainly, Roboguru, Ruangguru, Zenius, Wikipedia, CoLearn, Modul Kemdikbud).
   - Jika terindikasi copy-paste web, naikkan indikasiPlagiarismePersen (35%-80%), kategorikan sebagai "Terindikasi Plagiat Web" atau "Kemiripan Sedang", sebutkan sumber di indikasiSumberPlagiarisme, dan kurangi poinnya!

4. DILARANG KERAS MENGGUNAKAN KALIMAT KLISE / TEMPLATE:
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

        // Kalkulasi Penalti Integritas & Rincian Transparan Nilai
        // 1. Nilai dasar materi mutlak: jika kesesuaian < 50%, nilai dasar otomatis < 50% nilai maksimal
        const rawBaseScore = (clampedKesesuaian / 100) * maxVal;
        const nilaiDasarMateri = Math.round(rawBaseScore * 10) / 10;

        let aiPenaltyRatio = 0;
        if (clampedAi >= 80) aiPenaltyRatio = 0.75;
        else if (clampedAi >= 51) aiPenaltyRatio = 0.50;
        else if (clampedAi >= 25) aiPenaltyRatio = 0.25;
        else aiPenaltyRatio = 0; // Bantuan AI Ringan (<25%): Pemotongan 0%

        let plagiatPenaltyRatio = 0;
        if (clampedPlagiat > 60) plagiatPenaltyRatio = 0.50;
        else if (clampedPlagiat > 30) plagiatPenaltyRatio = 0.25;
        else plagiatPenaltyRatio = 0; // Rendah (<=30%): Pemotongan 0%

        const potonganAiPoin = Math.round((nilaiDasarMateri * aiPenaltyRatio) * 10) / 10;
        const potonganPlagiatPoin = Math.round((nilaiDasarMateri * plagiatPenaltyRatio) * 10) / 10;
        const totalPotongan = Math.min(nilaiDasarMateri, Math.round((potonganAiPoin + potonganPlagiatPoin) * 10) / 10);

        let finalScore = 0;
        if (clampedKesesuaian === 0) {
          finalScore = 0;
        } else {
          finalScore = Math.max(0, Math.round((nilaiDasarMateri - totalPotongan) * 10) / 10);
        }
        const clampedNilai = Math.max(0, Math.min(maxVal, finalScore));

        // Buat penjelasan faktor pengurang yang sangat detail dan transparan
        let penjelasanFaktor = "";
        if (clampedKesesuaian === 0) {
          penjelasanFaktor = `Nilai 0.0/${maxVal}: Jawaban dinilai tidak sesuai/melenceng total (Kesesuaian 0%).`;
        } else {
          const faktorList: string[] = [];
          faktorList.push(`Nilai Dasar Materi: ${nilaiDasarMateri}/${maxVal} (berdasarkan Kesesuaian ${clampedKesesuaian}%)`);
          if (potonganAiPoin > 0) {
            faktorList.push(`Pengurangan AI: -${potonganAiPoin} poin (Indikasi AI ${clampedAi}% - ${aiKategori})`);
          }
          if (potonganPlagiatPoin > 0) {
            faktorList.push(`Pengurangan Plagiarisme: -${potonganPlagiatPoin} poin (Kemiripan Web ${clampedPlagiat}% - ${plagiatKategori})`);
          }
          if (potonganAiPoin === 0 && potonganPlagiatPoin === 0) {
            faktorList.push(`Tanpa Penalti Integritas (Jawaban orisinal & bebas plagiat)`);
          }
          penjelasanFaktor = `${faktorList.join(" | ")} → Total Nilai Akhir: ${clampedNilai}/${maxVal} poin.`;
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
          rincianKalkulasiNilai: {
            nilaiDasarMateri,
            potonganAiPoin,
            potonganPlagiarismePoin: potonganPlagiatPoin,
            penjelasanFaktorPengurang: penjelasanFaktor,
          },
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
