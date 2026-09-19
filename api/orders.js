const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

const QUEUE_KEY = "sidebar:orders:queue";
const ORDER_KEY_PREFIX = "sidebar:order:";

async function createOrder(order, res){
  if (!order || !order.name || !order.phone || !Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ error: "Missing name, phone, or items" });
  }
  if (typeof order.total !== "number" || order.total <= 0) {
    return res.status(400).json({ error: "Invalid order total" });
  }

  const orderId = Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100);
  const record = {
    orderId: orderId,
    name: String(order.name).slice(0, 120),
    phone: String(order.phone).slice(0, 40),
    items: order.items.slice(0, 40),
    total: order.total,
    createdAt: Date.now(),
    status: "new"
  };

  await redis.set(ORDER_KEY_PREFIX + orderId, record);
  await redis.lpush(QUEUE_KEY, orderId);

  return res.status(200).json({ ok: true, orderId: orderId });
}

async function listOrders(password, res){
  if (password !== process.env.STAFF_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }
  const ids = await redis.lrange(QUEUE_KEY, 0, 49);
  const orders = [];
  for (const id of ids || []) {
    const record = await redis.get(ORDER_KEY_PREFIX + id);
    if (record) orders.push(record);
  }
  orders.sort((a, b) => b.createdAt - a.createdAt);
  return res.status(200).json({ ok: true, orders: orders });
}

async function completeOrder(password, orderId, res){
  if (password !== process.env.STAFF_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }
  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }
  await redis.lrem(QUEUE_KEY, 0, orderId);
  return res.status(200).json({ ok: true });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch (e) {
      return res.status(400).json({ error: "Bad request" });
    }
  }
  body = body || {};

  if (body.action === "create") {
    return createOrder(body.order, res);
  }
  if (body.action === "list") {
    return listOrders(body.password, res);
  }
  if (body.action === "complete") {
    return completeOrder(body.password, body.orderId, res);
  }

  return res.status(400).json({ error: "Unknown action" });
};
