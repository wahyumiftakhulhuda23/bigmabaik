export default function handler(_req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return res.status(200).json({
    status: "ok",
    hasEnvApiKey: !!process.env.GEMINI_API_KEY,
    appName: "BigMA Baik",
  });
}
