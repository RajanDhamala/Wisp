import app from "./app.js";
import dotenv from "dotenv";
import {
  startMemoryWorker,
  stopMemoryWorker,
} from "./src/Workers/MemoryWorker.js";

dotenv.config();

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`Wisp API listening on http://${HOST}:${PORT}`);
});
startMemoryWorker();

server.on("error", (error) => {
  console.error("Wisp API failed to start", error);
  process.exitCode = 1;
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close();
  await stopMemoryWorker().catch((error) => {
    console.error("Could not close the memory worker", error.message);
  });
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
