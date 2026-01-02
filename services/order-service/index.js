const express = require("express");
const { v4: uuid } = require("uuid");
const { orderQueue } = require("./shared/queue/redis");
const db = require("./shared/db/postgres");
const morgan = require("morgan");
const app = express();
app.use(express.json());
const SERVICE_NAME = "ORDER-SERVICE"; // change per service

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
  })
);

app.post("/orders", async (req, res) => {
  await db.query(
    "CREATE TABLE IF NOT EXISTS orders(id UUID, status TEXT)"
  );

  const id = uuid();
  await db.query("INSERT INTO orders VALUES($1,$2)", [id, "PLACED"]);

  await orderQueue.add("order.created", { orderId: id });

  res.json({ orderId: id, status: "PLACED" });
});

app.listen(4003, () => console.log("Order service running"));
