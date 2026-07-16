import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const hashPassword = async (plain, rounds = 10) => {
  return await bcrypt.hash(plain, rounds)
}

const verifyPassword = async (plain, hashed) => {
  return await bcrypt.compare(plain, hashed);
}

const CreateAccessToken = (id, email, fullname) => {
  const payload = {
    id: id,
    fullname,
    email,
  };
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

const CreateRefreshToken = (id, email, fullname) => {
  const payload = {
    id: id,
    email,
    fullname
  };
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
}


const configuredSecure = process.env.COOKIE_SECURE;
const secure =
  configuredSecure === undefined
    ? process.env.NODE_ENV === "production"
    : configuredSecure === "true";
const requestedSameSite = process.env.COOKIE_SAME_SITE?.toLowerCase();
const sameSite =
  requestedSameSite === "strict" || requestedSameSite === "lax"
    ? requestedSameSite
    : requestedSameSite === "none" && secure
      ? "none"
      : secure
        ? "none"
        : "lax";
const cookieOptions = {
  httpOnly: true,
  secure,
  sameSite,
  path: "/",
  ...(process.env.COOKIE_DOMAIN
    ? { domain: process.env.COOKIE_DOMAIN }
    : {}),
};

function setAccessTokenCookie(res, accessToken) {
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });
}

function setAuthCookies(res, accessToken, refreshToken) {
  setAccessTokenCookie(res, accessToken);
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
}


export {
  hashPassword, verifyPassword,
  CreateAccessToken, CreateRefreshToken, setAccessTokenCookie,
  setAuthCookies, clearAuthCookies
}
