import app from "../server";

export default function handler(req: any, res: any) {
  req.url = "/api/analyze-batch";
  return app(req, res);
}
