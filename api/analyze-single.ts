import { analyzeSingleCore } from "./_gemini";

export default async function handler(req: any, res: any) {
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

    if (!body || (!body.naskahSoal && !body.gambarSoalBase64)) {
      return res.status(400).json({
        success: false,
        error: "Data soal belum lengkap. Masukkan naskah soal atau lampiran gambar soal.",
      });
    }

    const result = await analyzeSingleCore(body);
    return res.status(200).json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error("Vercel analyze-single exception:", err);
    return res.status(400).json({
      success: false,
      error: err?.message || "Gagal melakukan analisis jawaban.",
    });
  }
}
