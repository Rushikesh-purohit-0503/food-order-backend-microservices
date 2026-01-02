const { Worker } = require("bullmq");
const { connection } = require("./shared/queue/redis");

new Worker("order-events", async job => {
      console.log(
      `[NOTIFICATION-SERVICE] Processing job`,
      job.name,
      job.data
    );
}, { connection });

console.log("[NOTIFICATION-SERVICE] Worker started");