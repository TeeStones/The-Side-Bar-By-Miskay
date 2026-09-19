const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

const CONTENT_KEY = "sidebar:content";

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const data = await redis.get(CONTENT_KEY);
    return res.status(200).json(data || null);
  }

  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch (e) {
        return res.status(400).json({ error: "Bad request" });
      }
    }
    body = body || {};

    if (body.password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Wrong password" });
    }

    if (body.verifyOnly) {
      return res.status(200).json({ ok: true });
    }

    await redis.set(CONTENT_KEY, body.content);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
};
