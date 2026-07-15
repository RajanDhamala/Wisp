import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import UserRouter from "./src/Routes/UserRoute.js";
import SessionRouter from "./src/Routes/SessionRoute.js";
import { HandelOuathLogin } from "./src/Controllers/UserController.js"

dotenv.config();
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "512kb" }));


app.get("/", (req, res) => {
  res.send("Server is up and running");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/oauth/callback", HandelOuathLogin)
app.use("/users", UserRouter)
app.use("/session",SessionRouter)

app.use((err, req, res, next) => {
  console.log("Unhandled Express Error", err);
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});

export default app;

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });
}
