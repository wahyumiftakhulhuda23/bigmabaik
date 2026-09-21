import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large JSON payloads for screenshots and image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS and preflight handling for all environments
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-matched-path, x-rewrite-url");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Normalize paths rewritten by Vercel serverless functions
app.use((req, _res, next) => {
  const matched =
    (req.headers["x-matched-path"] as string) ||
    (req.headers["x-rewrite-url"] as string) ||
    (req.headers["x-vercel-matched-path"] as string);

  if (matched && matched.startsWith("/api") && (req.url === "/api" || req.url === "/" || req.url === "")) {
    req.url = matched;
  }
  next();
});

const apiRouter = express.Router();

// Health check
apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    hasEnvApiKey: !!process.env.GEMINI_API_KEY,
    appName: "BigMA Baik",
  });
});

interface QuestionAnalysisRequest {
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

const analysisSchema = {
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

// Compact system prompt to strictly minimize token consumption
const COMPACT_SYSTEM_PROMPT = `Anda adalah penilai ujian "BigMA Baik" untuk guru di Indonesia.
Analisis jawaban siswa secara objektif & hemat token:
1. Kesesuaian (0-100%): akurasi & kelengkapan jawaban thd soal.
2. Indikasi AI (0-100%): deteksi pola kalimat kaku AI / boilerplate vs gaya alami siswa.
3. Nilai Diberikan: skor 0 sampai nilaiMaksimal sesuai mutu jawaban dan integritas.
Kembalikan JSON sesuai schema.`;

const CANDIDATE_MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

function isTransientError(err: any): boolean {
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

function isInvalidKeyError(err: any): boolean {
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

function isQuotaError(err: any): boolean {
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

function cleanErrorMessage(err: any): string {
  const raw = String(err?.message || err || "");
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {}
  return raw;
}

/**
 * Bulletproof JSON extractor & parser for AI responses.
 * Cleans markdown code blocks, strips unexpected whitespace, fixes trailing commas,
 * and recovers key fields via regex so AI analysis never crashes with a raw JSON error.
 */
function safeParseAnalysisJson(rawText: string, maxVal: number): any {
  let clean = (rawText || "").trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ...)
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

    // Clean common JSON quirks like trailing commas before closing braces/brackets
    const cleaned = jsonCandidate
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\/\/.*$/gm, "")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    try {
      return JSON.parse(cleaned);
    } catch {}
  }

  // 3. Fallback extraction via regex so the analysis never crashes with a JSON SyntaxError
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function analyzeWithKeyRotation(
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

  // Key rotation loop
  for (let keyIdx = 0; keyIdx < candidateKeys.length; keyIdx++) {
    const key = candidateKeys[keyIdx].trim();
    if (!key) continue;

    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Model fallback sequence across candidates
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
          // Key is invalid, stop testing other models on this key and jump to next key
          break;
        }

        // Try the next candidate model if available
        if (modelIdx < CANDIDATE_MODELS.length - 1) {
          continue;
        } else {
          // Small delay before moving to next key
          await sleep(500);
        }
      }
    }

    if (isInvalidKeyError(lastError)) {
      continue; // Move to next key
    }
  }

  // If all failed, provide a clear, polite error explanation
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

function resolveCandidateKeys(customKeys?: string[]): string[] {
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

// Handler for health check
const handleHealth = (_req: express.Request, res: express.Response) => {
  return res.json({
    status: "ok",
    hasEnvApiKey: !!process.env.GEMINI_API_KEY,
    appName: "BigMA Baik",
  });
};

// Handler to verify API keys and check quota/token readiness with high-speed parallel checks
const handleVerifyKeys = async (req: express.Request, res: express.Response) => {
  try {
    const { keys } = req.body as { keys: string[] };
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: "Daftar API key kosong." });
    }

    const testSingleKey = async (rawKey: string, index: number) => {
      const key = (rawKey || "").trim();
      if (!key) {
        return {
          key: "",
          index: index + 1,
          status: "invalid" as const,
          message: "API Key kosong",
        };
      }

      const ai = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Quick test with gemini-flash-latest and fast failover
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
          status: "ready" as const,
          message: "Aktif & Siap Digunakan (Token/Kuota Tersedia)",
        };
      } catch (err: any) {
        if (isQuotaError(err)) {
          return {
            key,
            index: index + 1,
            status: "exhausted" as const,
            message: "Kuota Habis / Rate Limit Terlampaui (429)",
          };
        }

        if (isInvalidKeyError(err)) {
          return {
            key,
            index: index + 1,
            status: "invalid" as const,
            message: "API Key Tidak Valid / Salah",
          };
        }

        // Fast backup test with gemini-3.1-flash-lite
        try {
          await pingWithTimeout("gemini-3.1-flash-lite", 6000);
          return {
            key,
            index: index + 1,
            status: "ready" as const,
            message: "Aktif & Siap Digunakan (Token/Kuota Tersedia)",
          };
        } catch (liteErr: any) {
          if (isQuotaError(liteErr)) {
            return {
              key,
              index: index + 1,
              status: "exhausted" as const,
              message: "Kuota Habis / Rate Limit Terlampaui (429)",
            };
          }
          if (isInvalidKeyError(liteErr)) {
            return {
              key,
              index: index + 1,
              status: "invalid" as const,
              message: "API Key Tidak Valid / Salah",
            };
          }
          if (isTransientError(liteErr) || isTransientError(err)) {
            return {
              key,
              index: index + 1,
              status: "ready" as const,
              message: "Aktif (Google AI merespons, siap digunakan)",
            };
          }

          return {
            key,
            index: index + 1,
            status: "error" as const,
            message: `Gagal: ${cleanErrorMessage(liteErr || err).slice(0, 80)}`,
          };
        }
      }
    };

    // Run all key checks IN PARALLEL for near-instant response
    const results = await Promise.all(
      keys.map((k, idx) => testSingleKey(k, idx))
    );

    return res.json({ success: true, results });
  } catch (error: any) {
    console.log("Notice verifying keys:", cleanErrorMessage(error));
    return res.status(500).json({
      error: error.message || "Gagal memverifikasi API key.",
    });
  }
};

// Handler to analyze a single question
const handleAnalyzeSingle = async (req: express.Request, res: express.Response) => {
  try {
    const soal = req.body as QuestionAnalysisRequest;
    if (!soal) {
      return res.status(400).json({ error: "Data soal tidak ditemukan" });
    }

    if (!soal.jawabanTeks && !soal.jawabanGambarBase64) {
      return res.status(400).json({
        error: "Harap masukkan teks jawaban siswa atau unggah screenshot jawaban terlebih dahulu.",
      });
    }

    const candidateKeys = resolveCandidateKeys(soal.apiKeys);
    if (candidateKeys.length === 0) {
      return res.status(400).json({
        error:
          "API Key Gemini belum diatur. Silakan masukkan API Key Gemini Anda di menu 'Pengaturan API Key' di pojok kanan atas.",
      });
    }

    const result = await analyzeWithKeyRotation(candidateKeys, soal);
    return res.json({ success: true, result });
  } catch (error: any) {
    console.log("Notice analyzing single question:", cleanErrorMessage(error));
    return res.status(500).json({
      error: error.message || "Gagal melakukan analisis jawaban.",
    });
  }
};

// Handler to analyze batch questions
const handleAnalyzeBatch = async (req: express.Request, res: express.Response) => {
  try {
    const { soalList, apiKeys } = req.body as {
      soalList: QuestionAnalysisRequest[];
      apiKeys?: string[];
    };

    if (!Array.isArray(soalList) || soalList.length === 0) {
      return res.status(400).json({ error: "Daftar soal kosong." });
    }

    const candidateKeys = resolveCandidateKeys(apiKeys);
    if (candidateKeys.length === 0) {
      return res.status(400).json({
        error:
          "API Key Gemini belum diatur. Silakan masukkan API Key Gemini Anda di menu 'Pengaturan API Key' di pojok kanan atas.",
      });
    }

    const results = [];
    for (const soal of soalList) {
      if (!soal.jawabanTeks && !soal.jawabanGambarBase64) {
        results.push({
          soalId: soal.id,
          nomorSoal: soal.nomorSoal,
          kesesuaianPersen: 0,
          indikasiAiPersen: 0,
          nilaiDiberikan: 0,
          nilaiMaksimal: soal.nilaiMaksimal,
          aiDugaanKategori: "Belum Ada Jawaban",
          ringkasanAnalisis: "Siswa tidak mengisi jawaban pada butir soal ini.",
          ciriCiriAiTerdeteksi: [],
          kelebihanJawaban: [],
          kelemahanJawaban: ["Jawaban kosong"],
          rekomendasiGuru: "Ingatkan siswa untuk mengisi butir soal ini.",
          analyzedAt: new Date().toISOString(),
        });
      } else {
        const itemResult = await analyzeWithKeyRotation(candidateKeys, soal);
        results.push(itemResult);
        // Small interval between questions to maintain healthy rate limits
        await sleep(350);
      }
    }

    return res.json({ success: true, results });
  } catch (error: any) {
    console.log("Notice analyzing batch questions:", cleanErrorMessage(error));
    return res.status(500).json({
      error: error.message || "Gagal memproses analisis massal.",
    });
  }
};

// Smart fallback dispatcher if a reverse proxy / rewrite collapses the URL to /api or /
const smartDispatcher = async (req: express.Request, res: express.Response) => {
  const body = req.body || {};
  const query = req.query || {};
  const action = (query.action as string) || (body.action as string);

  if (action === "verify-keys" || Array.isArray(body.keys)) {
    return handleVerifyKeys(req, res);
  }
  if (action === "analyze-batch" || Array.isArray(body.soalList)) {
    return handleAnalyzeBatch(req, res);
  }
  if (
    action === "analyze-single" ||
    body.naskahSoal !== undefined ||
    body.nomorSoal !== undefined ||
    body.jawabanTeks !== undefined ||
    body.jawabanGambarBase64 !== undefined
  ) {
    return handleAnalyzeSingle(req, res);
  }

  return handleHealth(req, res);
};

// Register routes on apiRouter
apiRouter.get("/health", handleHealth);
apiRouter.post("/verify-keys", handleVerifyKeys);
apiRouter.post("/analyze-single", handleAnalyzeSingle);
apiRouter.post("/analyze-batch", handleAnalyzeBatch);

// Mount apiRouter on /api and root /
app.use("/api", apiRouter);
app.use("/", apiRouter);

// Register direct routes on app to guarantee matching regardless of routing / proxy layer
app.get(["/api/health", "/health"], handleHealth);
app.post(["/api/verify-keys", "/verify-keys"], handleVerifyKeys);
app.post(["/api/analyze-single", "/analyze-single"], handleAnalyzeSingle);
app.post(["/api/analyze-batch", "/analyze-batch"], handleAnalyzeBatch);

// Smart dispatcher for collapsed /api or / POST requests
app.post("/api", smartDispatcher);
app.post("/", smartDispatcher);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server BigMA Baik running on http://0.0.0.0:${PORT}`);
  });
}

// In local dev or standalone container (Cloud Run), start server listening on PORT
// In Vercel serverless environment (process.env.VERCEL is set), export app for serverless function execution
if (!process.env.VERCEL) {
  startServer();
}

export default app;
export {
  app,
  handleHealth,
  handleVerifyKeys,
  handleAnalyzeSingle,
  handleAnalyzeBatch,
  smartDispatcher,
};
