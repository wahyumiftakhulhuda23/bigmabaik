import app from "../server";

export default function handler(req: any, res: any) {
  req.url = "/api/analyze-single";
  return app(req, res);
}
