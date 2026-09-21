import app from "../server";

export default function handler(req: any, res: any) {
  req.url = "/api/verify-keys";
  return app(req, res);
}
