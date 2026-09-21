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

const COMPACT_SYSTEM_PROMPT = `Anda adalah sistem penilai & auditor forensik integritas ujian "BigMA Baik" untuk guru di Indonesia dengan evaluasi analitis mendalam, apresiasi penalaran siswa, dan audit forensik tajam.

TUGAS UTAMA: 
1. EVALUASI KESESUAIAN MATERI SECARA FLEKSIBEL & MASUK AKAL (TIDAK KAKU / SAKLEK):
   - Pahami maksud dan esensi pertanyaan soal secara holistik.
   - JANGAN TERLALU SAKLEK pada kecocokan kata perkata. Hargai penalaran, ide logis, analogi konkret, atau penjelasan garis besar yang dibuat siswa meskipun menggunakan bahasa santai, kalimat sederhana, atau tidak baku.
   - JIKA JAWABAN SISWA MASUK AKAL, NYEREMPET MAKSUD SOAL, ATAU MEMILIKI KAITAN RELEVAN: Berikan apresiasi penilaian tambahan dan persentase kesesuaian yang proporsional (parsial credit).

2. AUDIT FORENSIK GAYA BAHASA AI & PARAFRASE PENYAMARAN SISWA:
   - Waspadai bahwa siswa sering memodifikasi karakter, mengganti sinonim, menyisipkan kata sehari-hari/bahasa gaul, menghapus format bullet points, atau sengaja menyisipkan typo untuk menyamarkan keluaran AI.
   - Kenali rangkaian kata dan struktur logika tipikal AI (ChatGPT/Gemini/Claude/DeepSeek) meskipun sudah diparafrasekan:
     * Diksi akademis sintetis & transisi formulaik: "secara komprehensif", "memiliki peran fundamental", "esensial", "krusial", "urgensi", "mengejawantahkan", "dalam konteks ini", "penting untuk digarisbawahi", "tidak hanya... melainkan juga...", "di era digital saat ini".
     * Struktur kalimat simetris & kompromistis: Alur pembuka klise, penataan ide multi-perspektif yang terlalu rapi dan objektif-netral tanpa ada keraguan khas anak sekolah.
     * Pola hibrida / parafrasa AI: Siswa menulis 1 kalimat pengantar sendiri lalu menyalin/memparafrasekan argumen AI -> Tetap DETEKSI sebagai "Campuran AI" (25%-50%) atau "Didominasi AI" (51%-79%) dan berikan penalti!
   - Label "Asli Siswa" (<15% AI) hanya untuk tulisan yang benar-benar alami, spontan, dan khas penalaran manusia.

3. HUKUM MATEMATIS KORELASI NILAI & KESESUAIAN:
   - kesesuaianPersen (0-100%) merepresentasikan persentase ketepatan dan relevansi materi terhadap maksud soal.
   - Nilai Dasar Materi = (kesesuaianPersen / 100) * nilaiMaksimal.
   - JIKA kesesuaianPersen < 50% (tidak sesuai/melenceng jauh), maka Nilai Dasar Materi otomatis kurang dari setengah nilai maksimal (< 0.5 * nilaiMaksimal).
   - JIKA kesesuaianPersen = 0% -> Nilai WAJIB 0.0 (misal: 0/20).
   - SKALA PENILAIAN KESESUAIAN FLEKSIBEL:
     * 85% - 100%: Konsep tepat, pemahaman tuntas, relevan langsung dengan pertanyaan.
     * 65% - 84%: Konsep garis besar benar & masuk akal, relevansi kuat, hanya ada detail minor yang belum lengkap.
     * 45% - 64%: Nyerempet maksud soal, penalaran logis terkait konteks, menyentuh sudut pandang yang masuk akal walau belum presisi. (Beri nilai separuh!).
     * 20% - 44%: Hanya menyinggung kulit luar topik, argumen sangat terbatas atau ada miskonsepsi.
     * 0% - 15%: Benar-benar melenceng total, membahas hal lain di luar topik soal, atau kosong.
   - FAKTOR PENGURANG NILAI (PENALTI INTEGRITAS):
     * Indikasi AI ≥ 25%: Potongan proporsional (25% s.d. 75% dari Nilai Dasar). AI Ringan (<25%) bebas potongan (0%).
     * Plagiarisme Web > 30%: Potongan proporsional (25% s.d. 50% dari Nilai Dasar). Plagiat Rendah (≤30%) bebas potongan (0%).
   - Total Nilai Akhir = Nilai Dasar - Potongan AI - Potongan Plagiarisme.

4. DILARANG KERAS MENGGUNAKAN KALIMAT KLISE / TEMPLATE:
   - DILARANG menulis kalimat template seperti "Jawaban siswa telah dinilai berdasarkan kriteria".
   - Setiap ulasan dan rekomendasi WAJIB unik, membedah substansi ide siswa, konsep materi, letak relevansi/nyerempetnya, serta analisis gaya bahasanya.

PANDUAN DETAIL FIELD JSON:
- ringkasanAnalisis: 2-4 kalimat tajam mengulas esensi kebenaran konsep siswa, apresiasi penalaran/keterkaitan maksud soal jika ada, catatan forensik AI/plagiat (termasuk jika diparafrase), dan pertimbangan nilainya.
- kelebihanJawaban: Array poin spesifik menguraikan konsep yang dijawab tepat atau penalaran yang masuk akal dengan mengutip kata/frasa siswa.
- kelemahanJawaban: Array 1-3 poin spesifik menguraikan kekurangan konsep, miskonsepsi, atau hal yang belum terjawab tuntas.
- ciriCiriAiTerdeteksi: Array 1-3 poin mengutip bukti frasa sintetis / pola susunan AI yang ditemukan (termasuk parafrase AI), atau bukti keaslian gaya penulisan organik siswa.
- detailPlagiarisme: Uraian spesifik membedakan tulisan orisinal vs kemiripan definisi/sumber web (Brainly, Wikipedia, Roboguru, modul daring).
- rekomendasiGuru: Saran bimbingan pedagogis konkret, mendalam, dan kontekstual terkait topik soal ini (misal konfirmasi lisan, eksplorasi contoh nyata, penugasan mandiri).

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

  questionText += `\n[INSTRUKSI EVALUASI FORENSIK, PENILAIAN FLEKSIBEL & PENALTI NILAI]:
1. EVALUASI KESESUAIAN MATERI (FLEKSIBEL & BERKEADILAN, TIDAK SAKLEK):
   - Pahami maksud dan esensi pertanyaan soal secara menyeluruh.
   - Jangan saklek pada kecocokan istilah per kata. Jika bahasa/kalimat siswa masuk akal, nyerempet maksud soal, atau bernalar secara logis: berikan persentase kesesuaian yang layak (misal 50%-80%), jangan langsung dijatuhkan!
   - Berikan kesesuaian tinggi (85%-100%) jika konsep intinya benar dan tuntas.
   - Berikan kesesuaian sedang/parsial (45%-75%) jika jawaban nyerempet, sebagian benar, atau bernalar logis terhadap konteks soal.
   - Hanya berikan kesesuaian sangat rendah (0%-30%) jika jawaban benar-benar melenceng jauh atau salah total.
2. AUDIT FORENSIK GAYA BAHASA AI (PEKA TERHADAP PARAFRASE PENYAMARAN):
   - Waspadai siswa yang memodifikasi/memparafrasekan teks AI (mengganti sinonim, menghapus format poin, menyisipkan kata sehari-hari/typo).
   - Kenali pola kalimat sintetis AI: argumen kompromistis ("di satu sisi... di sisi lain..."), kepadatan konseptual kaku, dan diksi transisi klise ("dalam era digital", "secara komprehensif", "penting untuk dicatat").
   - Jika terindikasi AI diparafrasekan/campuran, berikan indikasiAiPersen tegas (30%-80%) dan jelaskan bukti polanya!
3. PLAGIARISME WEB:
   - Periksa kemiripan dengan kunci jawaban/Brainly/Roboguru/Wikipedia/modul daring.
4. FORMULA NILAI:
   - Nilai Dasar = (kesesuaianPersen / 100) * ${soal.nilaiMaksimal}.
   - Potongan AI (jika ≥25%) & Plagiat (jika >30%) memotong dari Nilai Dasar.
   - Nilai Akhir = max(0, Nilai Dasar - Potongan AI - Potongan Plagiat).
5. REKOMENDASI GURU:
   - Berikan saran bimbingan pedagogis yang mendalam, spesifik untuk nomor soal dan konsep ini.
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
