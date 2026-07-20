import app from "./app.js";
import dotenv from "dotenv";
import {
  startMemoryWorker,
  stopMemoryWorker,
} from "./src/Workers/MemoryWorker.js";
import {
  startTokenQuotaWorker,
  stopTokenQuotaWorker,
} from "./src/Workers/TokenQuotaWorker.js";
import { closeRedisClient } from "./src/Utils/RedisClient.js";
import { closeTokenCounters } from "./src/Utils/TokenCounter.js";

dotenv.config();

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`Wisp API listening on http://${HOST}:${PORT}`);
});
startMemoryWorker();
startTokenQuotaWorker();

server.on("error", (error) => {
  console.error("Wisp API failed to start", error);
  process.exitCode = 1;
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close();
  await stopTokenQuotaWorker().catch((error) => {
    console.error("Could not flush token quotas", error.message);
  });
  await stopMemoryWorker().catch((error) => {
    console.error("Could not close the memory worker", error.message);
  });
  await closeRedisClient().catch((error) => {
    console.error("Could not close Redis", error.message);
  });
  closeTokenCounters();
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
