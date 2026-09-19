const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

const STOCK_KEY = "sidebar:extras-stock";
const DEFAULT_STOCK = {
  eggs: true,
  sausages: true,
  bacon: true,
  toast: true,
  extraPancakes: true,
  extraWaffles: true,
  grilledChicken: true,
  grilledPrawns: true
};

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const data = await redis.get(STOCK_KEY);
    return res.status(200).json(data || DEFAULT_STOCK);
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

    if (body.password !== process.env.STAFF_PASSWORD) {
      return res.status(401).json({ error: "Wrong password" });
    }
    if (!body.key) {
      return res.status(400).json({ error: "Missing key" });
    }

    const current = (await redis.get(STOCK_KEY)) || DEFAULT_STOCK;
    current[body.key] = !!body.inStock;
    await redis.set(STOCK_KEY, current);

    return res.status(200).json(current);
  }

  return res.status(405).json({ error: "Method not allowed" });
};
