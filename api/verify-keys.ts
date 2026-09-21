import { verifyKeysCore } from "./_gemini";

export default async function handler(req: any, res: any) {
  // Always set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metode tidak diizinkan. Gunakan POST." });
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

    const rawKeys = body?.keys;
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
  } catch (err: any) {
    console.error("Vercel verify-keys exception:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Terjadi kendala saat memverifikasi API key.",
    });
  }
}
