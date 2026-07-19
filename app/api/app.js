import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import UserRouter from "./src/Routes/UserRoute.js";
import SessionRouter from "./src/Routes/SessionRoute.js";
import ProjectRouter from "./src/Routes/ProjectRoute.js";
import LibraryRouter from "./src/Routes/LibraryRoute.js";
import { HandelOuathLogin } from "./src/Controllers/UserController.js";

dotenv.config();
const app = express();

const configuredFrontendOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  ""
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const isPrivateNetworkHost = (hostname) => {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
    return true;
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;

  const match = hostname.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
};

const isAllowedFrontendOrigin = (origin) => {
  if (!origin) return true;
  if (configuredFrontendOrigins.includes(origin.replace(/\/$/, ""))) return true;
  if (process.env.NODE_ENV === "production") return false;

  try {
    const url = new URL(origin);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.port === (process.env.FRONTEND_PORT || "5173") &&
      isPrivateNetworkHost(url.hostname)
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => callback(null, isAllowedFrontendOrigin(origin)),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
  }),
);
app.use((req, res, next) => {
  const origin = req.get("origin");
  const changesState = ["POST", "PATCH", "PUT", "DELETE"].includes(
    req.method,
  );
  if (changesState && origin && !isAllowedFrontendOrigin(origin)) {
    return res.status(403).json({
      success: false,
      message: "This origin is not allowed to change Wisp data",
      errors: [],
    });
  }
  return next();
});
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "512kb" }));


app.get("/", (req, res) => {
  res.send("Server is up and running");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/oauth/callback", HandelOuathLogin);
app.use("/user", UserRouter);
app.use("/users", UserRouter);
app.use("/session", SessionRouter);
app.use("/projects", ProjectRouter);
app.use("/library", LibraryRouter);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error("Unhandled Express Error", err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});

export default app;
