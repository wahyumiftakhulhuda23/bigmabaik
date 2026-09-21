import { analyzeBatchCore } from "./_gemini";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Metode tidak diizinkan. Gunakan POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { soalList, apiKeys } = body || {};
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
  } catch (err: any) {
    console.error("Vercel analyze-batch error:", err);
    return res.status(200).json({
      success: false,
      error: err?.message || "Gagal memproses analisis massal.",
    });
  }
}
