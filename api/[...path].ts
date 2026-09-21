import app from "../server";

export default function handler(req: any, res: any) {
  const matched =
    (req.headers["x-matched-path"] as string) ||
    (req.headers["x-rewrite-url"] as string) ||
    (req.headers["x-vercel-matched-path"] as string);

  if (matched && matched.startsWith("/api")) {
    req.url = matched;
  }
  return app(req, res);
}
