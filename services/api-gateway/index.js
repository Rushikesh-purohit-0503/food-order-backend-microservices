const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");


const app = express();
app.use(express.json());
app.use("/auth", createProxyMiddleware({ target: "http://auth-service:4001", changeOrigin: true, timeout: 60_000, proxyTimeout: 60_000  }));
app.use("/restaurants", createProxyMiddleware({ target: "http://restaurant-service:4002", changeOrigin: true }));
app.use("/orders", createProxyMiddleware({ target: "http://order-service:4003", changeOrigin: true }));
app.use("/payments", createProxyMiddleware({ target: "http://payment-service:4004", changeOrigin: true }));

app.listen(8000, () => console.log("API Gateway running on 8000"));
