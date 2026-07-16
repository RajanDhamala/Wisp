import asyncHandler from "../Utils/AsyncHandler.js";
import ApiError from "../Utils/ApiError.js";
import ApiResponse from "../Utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import {
  CreateAccessToken,
  CreateRefreshToken,
  clearAuthCookies,
  setAuthCookies,
} from "../Utils/Authutils.js";
import prisma from "../Utils/PrismaProvider.js";

const CLIENT_SECRET = process.env.CLIENT_SECRET || "default_secret";

const HandelOuathLogin = asyncHandler(async (req, res) => {
  const token = String(req.query.token || "");
  let oauthUser;

  try {
    oauthUser = jwt.verify(token, CLIENT_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired OAuth token");
  }

  if (
    typeof oauthUser !== "object" ||
    typeof oauthUser.email !== "string" ||
    typeof oauthUser.username !== "string"
  ) {
    throw new ApiError(401, "OAuth token is missing user information");
  }

  const isNewUser = !(await prisma.user.findUnique({
    where: { email: oauthUser.email },
  }));

  const dbUser = await prisma.user.upsert({
    where: { email: oauthUser.email },
    update: {
      fullname: oauthUser.username,
      avatar: oauthUser.avatar ?? null,
      provider: oauthUser.provider_name ?? "oauth",
    },
    create: {
      email: oauthUser.email,
      fullname: oauthUser.username,
      avatar: oauthUser.avatar ?? null,
      provider: oauthUser.provider_name ?? "oauth",
    },
  });

  const accessToken = CreateAccessToken(dbUser.id, dbUser.email, dbUser.fullname);
  const refreshToken = CreateRefreshToken(dbUser.id, dbUser.email, dbUser.fullname);
  setAuthCookies(res, accessToken, refreshToken);

  const user = {
    id: dbUser.id,
    fullname: dbUser.fullname,
    email: dbUser.email,
    avatar: dbUser.avatar,
    provider: dbUser.provider,
  };

  return res
    .status(isNewUser ? 201 : 200)
    .json(
      new ApiResponse(
        isNewUser ? 201 : 200,
        isNewUser ? "User created successfully" : "User logged in successfully",
        user,
      ),
    );
});

const LogoutUser = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  return res
    .status(200)
    .json(new ApiResponse(200, "User logged out successfully", null));
});

const GetCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "Current user fetched", req.user));
});

export { GetCurrentUser, HandelOuathLogin, LogoutUser };
