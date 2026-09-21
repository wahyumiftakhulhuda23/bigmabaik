import express from "express";
import path from "path";
import dotenv from "dotenv";
import {
  verifyKeysCore,
  analyzeSingleCore,
  analyzeBatchCore,
  QuestionAnalysisRequest,
} from "./api/_gemini";

dotenv.config();

const app = express();
const PORT = 3000;

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

// Guard against double body-parsing if req.body was already populated
app.use((req, _res, next) => {
  if (req.body !== undefined && req.body !== null && typeof req.body === "object") {
    (req as any)._body = true;
  }
  next();
});

// Enable large JSON payloads for screenshots and image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Normalize paths rewritten by proxies or reverse proxies
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

// Route handlers
const handleHealth = (_req: express.Request, res: express.Response) => {
  return res.status(200).json({
    status: "ok",
    hasEnvApiKey: !!process.env.GEMINI_API_KEY,
    appName: "BigMA Baik",
  });
};

const handleVerifyKeys = async (req: express.Request, res: express.Response) => {
  try {
    const rawKeys = req.body?.keys;
    if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Daftar API key kosong. Masukkan minimal satu API key.",
      });
    }

    const results = await verifyKeysCore(rawKeys);
    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Gagal verifikasi API key:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Gagal memverifikasi API key.",
    });
  }
};

const handleAnalyzeSingle = async (req: express.Request, res: express.Response) => {
  try {
    const soal = req.body as QuestionAnalysisRequest;
    if (!soal || (!soal.naskahSoal && !soal.gambarSoalBase64)) {
      return res.status(400).json({
        success: false,
        error: "Data soal belum lengkap. Harap isi naskah soal atau lampirkan foto soal.",
      });
    }

    const result = await analyzeSingleCore(soal);
    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Gagal analisis soal tunggal:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Gagal melakukan analisis jawaban.",
    });
  }
};

const handleAnalyzeBatch = async (req: express.Request, res: express.Response) => {
  try {
    const { soalList, apiKeys } = req.body as {
      soalList: QuestionAnalysisRequest[];
      apiKeys?: string[];
    };

    if (!Array.isArray(soalList) || soalList.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Daftar soal kosong. Masukkan minimal satu soal untuk dianalisis.",
      });
    }

    const results = await analyzeBatchCore(soalList, apiKeys);
    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Gagal analisis massal:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Gagal memproses analisis massal.",
    });
  }
};

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

// Register API routes
const apiRouter = express.Router();
apiRouter.get("/health", handleHealth);
apiRouter.post("/verify-keys", handleVerifyKeys);
apiRouter.post("/analyze-single", handleAnalyzeSingle);
apiRouter.post("/analyze-batch", handleAnalyzeBatch);

app.use("/api", apiRouter);
app.use("/", apiRouter);

app.get(["/api/health", "/health"], handleHealth);
app.post(["/api/verify-keys", "/verify-keys"], handleVerifyKeys);
app.post(["/api/analyze-single", "/analyze-single"], handleAnalyzeSingle);
app.post(["/api/analyze-batch", "/analyze-batch"], handleAnalyzeBatch);

app.post("/api", smartDispatcher);
app.post("/", smartDispatcher);

// Express JSON error handler so HTML error pages are NEVER emitted
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Express uncaught error:", err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Terjadi kesalahan internal pada server.",
  });
});

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

// In local dev or standalone container, run startServer()
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
