import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`Wisp API listening on http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  console.error("Wisp API failed to start", error);
  process.exitCode = 1;
});
