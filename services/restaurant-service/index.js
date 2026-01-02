const express = require("express");
// AFTER
const db = require("./shared/db/postgres");
const redis = require("redis");
const { v4: uuid } = require("uuid");
const morgan = require("morgan");
const app = express();
const SERVICE_NAME = "RESTAURANT-SERVICE"; // change per service
app.use(
    morgan((tokens, req, res) => {
        return [
            `[${SERVICE_NAME}]`,
            tokens.method(req, res),
            tokens.url(req, res),
            tokens.status(req, res),
            "-",
            tokens["response-time"](req, res),
            "ms"
        ].join(" ");
    }   )
);
app.use(express.json());

const client = redis.createClient({ url: "redis://redis:6379" });
client.connect();

app.post("/restaurants", async (req, res) => {
  await db.query("CREATE TABLE IF NOT EXISTS restaurants(id UUID, name TEXT)");
  const id = uuid();
  await db.query("INSERT INTO restaurants VALUES($1,$2)", [id, req.body.name]);
  res.json({ id });
});

app.get("/restaurants", async (req, res) => {
  const cache = await client.get("restaurants");
  if (cache) return res.json(JSON.parse(cache));

  const result = await db.query("SELECT * FROM restaurants");
  await client.setEx("restaurants", 60, JSON.stringify(result.rows));
  res.json(result.rows);
});

app.listen(4002, () => console.log("Restaurant service running"));
