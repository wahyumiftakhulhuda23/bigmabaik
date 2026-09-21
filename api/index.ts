import { verifyKeysCore, analyzeSingleCore, analyzeBatchCore } from "./_gemini";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-matched-path, x-rewrite-url");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const url = (req.url || "").split("?")[0];
  const query = req.query || {};
  const action = (query.action as string) || (body?.action as string);

  // 1. Verify Keys
  if (url.includes("verify-keys") || action === "verify-keys" || Array.isArray(body?.keys)) {
    const rawKeys = body?.keys;
    if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Daftar API key kosong. Masukkan minimal satu API key.",
      });
    }
    try {
      const results = await verifyKeysCore(rawKeys);
      return res.status(200).json({ success: true, results });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        error: err?.message || "Gagal memverifikasi API key.",
      });
    }
  }

  // 2. Analyze Batch
  if (url.includes("analyze-batch") || action === "analyze-batch" || Array.isArray(body?.soalList)) {
    const { soalList, apiKeys } = body || {};
    if (!Array.isArray(soalList) || soalList.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Daftar soal kosong.",
      });
    }
    try {
      const results = await analyzeBatchCore(soalList, apiKeys);
      return res.status(200).json({ success: true, results });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        error: err?.message || "Gagal memproses analisis massal.",
      });
    }
  }

  // 3. Analyze Single
  if (
    url.includes("analyze-single") ||
    action === "analyze-single" ||
    body?.id ||
    body?.naskahSoal !== undefined ||
    body?.jawabanTeks !== undefined
  ) {
    if (!body || (!body.naskahSoal && !body.gambarSoalBase64)) {
      return res.status(400).json({
        success: false,
        error: "Data soal belum lengkap.",
      });
    }
    try {
      const result = await analyzeSingleCore(body);
      return res.status(200).json({ success: true, result });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        error: err?.message || "Gagal melakukan analisis jawaban.",
      });
    }
  }

  // Health check default
  return res.status(200).json({
    status: "ok",
    hasEnvApiKey: !!process.env.GEMINI_API_KEY,
    appName: "BigMA Baik",
  });
}
