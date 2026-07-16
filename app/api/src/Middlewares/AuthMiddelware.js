
import jwt from "jsonwebtoken";
import asyncHandler from "../Utils/AsyncHandler.js";
import ApiError from "../Utils/ApiError.js";
import {
  CreateAccessToken,
  clearAuthCookies,
  setAccessTokenCookie,
} from "../Utils/Authutils.js";
import prisma from "../Utils/PrismaProvider.js";
import dotenv from "dotenv";

dotenv.config();

const AuthUser = asyncHandler(async (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies;

  if (!accessToken && !refreshToken) {
    throw new ApiError(401, "Authentication required");
  }

  let userId = null;
  let shouldRefreshAccessToken = false;

  if (accessToken) {
    try {
      const decoded = jwt.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET,
      );
      if (typeof decoded === "object" && typeof decoded.id === "string") {
        userId = decoded.id;
      }
    } catch {
      shouldRefreshAccessToken = true;
    }
  }

  if (!userId && refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
      );
      if (typeof decoded === "object" && typeof decoded.id === "string") {
        userId = decoded.id;
        shouldRefreshAccessToken = true;
      }
    } catch {
      clearAuthCookies(res);
      throw new ApiError(401, "Session expired. Please log in again");
    }
  }

  if (!userId) {
    clearAuthCookies(res);
    throw new ApiError(401, "Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullname: true,
      email: true,
      avatar: true,
      provider: true,
    },
  });

  if (!user) {
    clearAuthCookies(res);
    throw new ApiError(401, "User account no longer exists");
  }

  if (shouldRefreshAccessToken) {
    setAccessTokenCookie(
      res,
      CreateAccessToken(user.id, user.email, user.fullname),
    );
  }

  req.user = user;
  return next();
});

export default AuthUser;
