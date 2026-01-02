const express = require("express");
const app = express();
app.use(express.json());
app.use(
  require("morgan")((tokens, req, res) => {
    return [
        `[PAYMENT-SERVICE]`,
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        "-",
        tokens["response-time"](req, res),
        "ms"
    ].join(" ");
  })
);
app.post("/payments", (req, res) => {
  res.json({ status: "PAYMENT_SUCCESS" });
});

app.listen(4004, () => console.log("Payment service running"));
