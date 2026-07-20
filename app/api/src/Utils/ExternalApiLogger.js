import "dotenv/config";
import { chmodSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const defaultLogDirectory = fileURLToPath(
  new URL("../../logs/", import.meta.url),
);
const logDirectory = resolve(
  process.env.EXTERNAL_API_LOG_DIR?.trim() || defaultLogDirectory,
);

const applyMode = (path, mode) => {
  try {
    chmodSync(path, mode);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error("Could not secure external API log path", error.message);
    }
  }
};

mkdirSync(logDirectory, { mode: 0o750, recursive: true });
applyMode(logDirectory, 0o750);

const rotatingTransport = new DailyRotateFile({
  auditFile: resolve(logDirectory, ".external-api-audit.json"),
  createSymlink: true,
  datePattern: "YYYY-MM-DD",
  dirname: logDirectory,
  filename: "external-api-%DATE%.log",
  maxFiles: "14d",
  maxSize: "20m",
  options: { flags: "a", mode: 0o640 },
  symlinkName: "external-api-current.log",
  utc: true,
  zippedArchive: false,
});

rotatingTransport.on("error", (error) => {
  console.error("External API log transport failed", error.message);
});
rotatingTransport.on("new", (filename) => applyMode(filename, 0o640));
rotatingTransport.on("rotate", (_oldFilename, newFilename) =>
  applyMode(newFilename, 0o640),
);
applyMode(resolve(logDirectory, "external-api-current.log"), 0o640);

const externalApiLogger = winston.createLogger({
  exitOnError: false,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  level: "info",
  transports: [rotatingTransport],
});

externalApiLogger.on("error", (error) => {
  console.error("External API logger failed", error.message);
});

export const startExternalApiCallLog = (metadata) => {
  // Metadata only: never pass prompts, responses, headers, URLs, or credentials.
  const startedAt = Date.now();
  let completed = false;

  return ({ errorName = null, outcome, statusCode = null }) => {
    if (completed) return;
    completed = true;

    externalApiLogger.log({
      ...metadata,
      durationMs: Date.now() - startedAt,
      errorName,
      event: "external_api_call",
      level: outcome === "success" ? "info" : "warn",
      message: "external_api_call",
      outcome,
      startedAt: new Date(startedAt).toISOString(),
      statusCode,
    });
  };
};

export { logDirectory as EXTERNAL_API_LOG_DIRECTORY };
