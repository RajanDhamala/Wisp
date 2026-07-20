import ApiError from "../Utils/ApiError.js";
import prisma from "../Utils/PrismaProvider.js";
import { getRedisClient } from "../Utils/RedisClient.js";
import { countMessageTokens, countTokens } from "../Utils/TokenCounter.js";

const TOKEN_QUOTA_PREFIX = "wisp:token-quota";
const TOKEN_QUOTA_DIRTY_KEY = `${TOKEN_QUOTA_PREFIX}:dirty`;
const TOKEN_QUOTA_RESERVATION_PREFIX = `${TOKEN_QUOTA_PREFIX}:reservation:`;
const TOKEN_QUOTA_RESERVATIONS_KEY = `${TOKEN_QUOTA_PREFIX}:reservations`;
const UNMETERED_CACHE_SECONDS = 60;
const RESERVATION_TTL_MS = 30 * 60 * 1_000;
const RESERVATION_RECOVERY_TTL_MS = RESERVATION_TTL_MS + 24 * 60 * 60 * 1_000;
const INPUT_ESTIMATE_SAFETY_MULTIPLIER = 1.15;

const RESERVE_TOKENS_SCRIPT = `
local existing = redis.call("GET", KEYS[2])
if existing then
  return {2, tonumber(existing), tonumber(redis.call("GET", KEYS[1]))}
end

local remaining = redis.call("GET", KEYS[1])
if not remaining then
  return {0, 0, 0}
end
if remaining == "unmetered" then
  return {3, 0, 0}
end

remaining = tonumber(remaining)
local requested = tonumber(ARGV[1])
if remaining < requested then
  return {-1, requested, remaining}
end

local nextRemaining = redis.call("DECRBY", KEYS[1], requested)
redis.call("SET", KEYS[2], requested, "PX", ARGV[2])
redis.call("SADD", KEYS[3], ARGV[4])
redis.call("ZADD", KEYS[4], ARGV[3], KEYS[2])
return {1, requested, nextRemaining}
`;

const SETTLE_TOKENS_SCRIPT = `
local reserved = redis.call("GET", KEYS[2])
if not reserved then
  redis.call("ZREM", KEYS[4], KEYS[2])
  return {-1, tonumber(redis.call("GET", KEYS[1]) or 0)}
end

local adjustment = tonumber(reserved) - tonumber(ARGV[1])
local nextRemaining = redis.call("INCRBY", KEYS[1], adjustment)
redis.call("DEL", KEYS[2])
redis.call("SADD", KEYS[3], ARGV[2])
redis.call("ZREM", KEYS[4], KEYS[2])
return {1, nextRemaining}
`;

const RELEASE_TOKENS_SCRIPT = `
local reserved = redis.call("GET", KEYS[2])
if not reserved then
  redis.call("ZREM", KEYS[4], KEYS[2])
  return {-1, tonumber(redis.call("GET", KEYS[1]) or 0)}
end

local nextRemaining = redis.call("INCRBY", KEYS[1], tonumber(reserved))
redis.call("DEL", KEYS[2])
redis.call("SADD", KEYS[3], ARGV[1])
redis.call("ZREM", KEYS[4], KEYS[2])
return {1, nextRemaining}
`;

const balanceKeyFor = (userId) => `${TOKEN_QUOTA_PREFIX}:balance:${userId}`;
const reservationKeyFor = (userId, requestId) =>
  `${TOKEN_QUOTA_RESERVATION_PREFIX}${userId}:${encodeURIComponent(requestId)}`;
const userIdFromReservationKey = (reservationKey) =>
  reservationKey
    .slice(TOKEN_QUOTA_RESERVATION_PREFIX.length)
    .split(":", 1)[0];

const connectRedis = async () => {
  const client = getRedisClient();
  if (!client) return null;
  if (client.status === "wait") await client.connect();
  return client;
};

const loadQuotaFromDatabase = (userId) =>
  prisma.tokenQuota.findUnique({
    where: { owner: userId },
    select: { remainingTokens: true },
  });

const hydrateRedisBalance = async (client, userId) => {
  const balanceKey = balanceKeyFor(userId);
  const cachedBalance = await client.get(balanceKey);
  if (cachedBalance !== null) return cachedBalance;

  const quota = await loadQuotaFromDatabase(userId);
  if (!quota) {
    await client.set(
      balanceKey,
      "unmetered",
      "EX",
      UNMETERED_CACHE_SECONDS,
      "NX",
    );
  } else {
    await client.set(balanceKey, quota.remainingTokens.toString(), "NX");
  }
  return client.get(balanceKey);
};

const adjustDatabaseReservation = async (userId, reservedTokens) => {
  const result = await prisma.tokenQuota.updateMany({
    where: {
      owner: userId,
      remainingTokens: { gte: BigInt(reservedTokens) },
    },
    data: { remainingTokens: { decrement: BigInt(reservedTokens) } },
  });
  if (!result.count) {
    const quota = await loadQuotaFromDatabase(userId);
    if (!quota) return false;
    throw new ApiError(402, "You do not have enough token credits");
  }
  return true;
};

const adjustDatabaseBalance = (userId, adjustment) => {
  if (!adjustment) return Promise.resolve();
  return prisma.tokenQuota.update({
    where: { owner: userId },
    data: {
      remainingTokens:
        adjustment > 0
          ? { increment: BigInt(adjustment) }
          : { decrement: BigInt(Math.abs(adjustment)) },
    },
  });
};

const reserveTokenQuota = async ({
  maxOutputTokens,
  messages,
  model,
  requestId,
  userId,
}) => {
  const estimatedInputTokens = Math.ceil(
    countMessageTokens(messages, model) * INPUT_ESTIMATE_SAFETY_MULTIPLIER,
  );
  const reservedTokens = estimatedInputTokens + maxOutputTokens;
  let client;

  try {
    client = await connectRedis();
  } catch (error) {
    console.error("Could not connect to Redis for token quota", error.message);
  }

  if (!client) {
    const metered = await adjustDatabaseReservation(userId, reservedTokens);
    return {
      backend: "database",
      estimatedInputTokens,
      metered,
      model,
      requestId,
      reservedTokens,
      userId,
    };
  }

  const cachedBalance = await hydrateRedisBalance(client, userId);
  if (cachedBalance === "unmetered") {
    return {
      backend: "redis",
      estimatedInputTokens,
      metered: false,
      model,
      requestId,
      reservedTokens: 0,
      userId,
    };
  }

  const result = await client.eval(
    RESERVE_TOKENS_SCRIPT,
    4,
    balanceKeyFor(userId),
    reservationKeyFor(userId, requestId),
    TOKEN_QUOTA_DIRTY_KEY,
    TOKEN_QUOTA_RESERVATIONS_KEY,
    reservedTokens,
    RESERVATION_RECOVERY_TTL_MS,
    Date.now() + RESERVATION_TTL_MS,
    userId,
  );
  const status = Number(result[0]);
  if (status === -1) {
    throw new ApiError(402, "You do not have enough token credits");
  }
  if (status === 0) {
    throw new ApiError(503, "Token credits could not be loaded");
  }

  return {
    backend: "redis",
    estimatedInputTokens,
    metered: status !== 3,
    model,
    requestId,
    reservedTokens: status === 3 ? 0 : Number(result[1]),
    userId,
  };
};

const getActualTokenCharge = (reservation, usage, content) => {
  const providerTotal = Number(usage?.totalTokens);
  if (Number.isFinite(providerTotal) && providerTotal > 0) {
    return Math.ceil(providerTotal);
  }
  return (
    reservation.estimatedInputTokens +
    countTokens(content, reservation.model)
  );
};

const settleTokenQuota = async (reservation, { content, usage }) => {
  if (!reservation?.metered) return;
  const actualTokens = getActualTokenCharge(reservation, usage, content);
  const adjustment = reservation.reservedTokens - actualTokens;

  if (reservation.backend === "database") {
    await adjustDatabaseBalance(reservation.userId, adjustment);
    return;
  }

  const client = await connectRedis();
  if (!client) throw new Error("Redis is unavailable while settling token quota");
  await client.eval(
    SETTLE_TOKENS_SCRIPT,
    4,
    balanceKeyFor(reservation.userId),
    reservationKeyFor(reservation.userId, reservation.requestId),
    TOKEN_QUOTA_DIRTY_KEY,
    TOKEN_QUOTA_RESERVATIONS_KEY,
    actualTokens,
    reservation.userId,
  );
};

const releaseTokenQuota = async (reservation) => {
  if (!reservation?.metered) return;

  if (reservation.backend === "database") {
    await adjustDatabaseBalance(
      reservation.userId,
      reservation.reservedTokens,
    );
    return;
  }

  const client = await connectRedis();
  if (!client) throw new Error("Redis is unavailable while releasing token quota");
  await client.eval(
    RELEASE_TOKENS_SCRIPT,
    4,
    balanceKeyFor(reservation.userId),
    reservationKeyFor(reservation.userId, reservation.requestId),
    TOKEN_QUOTA_DIRTY_KEY,
    TOKEN_QUOTA_RESERVATIONS_KEY,
    reservation.userId,
  );
};

const releaseExpiredTokenReservations = async (limit = 100) => {
  const client = await connectRedis();
  if (!client) return 0;

  const reservationKeys = await client.zrangebyscore(
    TOKEN_QUOTA_RESERVATIONS_KEY,
    0,
    Date.now(),
    "LIMIT",
    0,
    limit,
  );
  await Promise.all(
    reservationKeys.map((reservationKey) => {
      const userId = userIdFromReservationKey(reservationKey);
      return client.eval(
        RELEASE_TOKENS_SCRIPT,
        4,
        balanceKeyFor(userId),
        reservationKey,
        TOKEN_QUOTA_DIRTY_KEY,
        TOKEN_QUOTA_RESERVATIONS_KEY,
        userId,
      );
    }),
  );
  return reservationKeys.length;
};

const invalidateTokenQuota = async (userId) => {
  const client = await connectRedis();
  if (client) await client.del(balanceKeyFor(userId));
};

const getTokenQuotaSnapshot = async (userId) => {
  const quota = await prisma.tokenQuota.findUnique({
    where: { owner: userId },
    select: {
      periodStartedAt: true,
      remainingTokens: true,
      tokenLimit: true,
      updatedAt: true,
    },
  });
  if (!quota) {
    return {
      metered: false,
      periodStartedAt: null,
      remainingTokens: null,
      source: null,
      tokenLimit: null,
      updatedAt: null,
      usedTokens: null,
    };
  }

  let remainingTokens = quota.remainingTokens;
  let source = "database";
  try {
    const client = await connectRedis();
    if (client) {
      const liveBalance = await hydrateRedisBalance(client, userId);
      if (/^-?\d+$/.test(liveBalance ?? "")) {
        remainingTokens = BigInt(liveBalance);
        source = "redis";
      }
    }
  } catch (error) {
    console.error("Could not read live token quota", error.message);
  }

  return {
    metered: true,
    periodStartedAt: quota.periodStartedAt.toISOString(),
    remainingTokens: remainingTokens.toString(),
    source,
    tokenLimit: quota.tokenLimit.toString(),
    updatedAt: quota.updatedAt.toISOString(),
    usedTokens: (quota.tokenLimit - remainingTokens).toString(),
  };
};

export {
  balanceKeyFor,
  connectRedis,
  getTokenQuotaSnapshot,
  invalidateTokenQuota,
  releaseExpiredTokenReservations,
  releaseTokenQuota,
  reserveTokenQuota,
  settleTokenQuota,
  TOKEN_QUOTA_DIRTY_KEY,
};
