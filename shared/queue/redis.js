const { Queue, Worker } = require("bullmq");

const connection = { host: "redis", port: 6379 };
const orderQueue = new Queue("order-events", { connection });

module.exports = { orderQueue, connection };
