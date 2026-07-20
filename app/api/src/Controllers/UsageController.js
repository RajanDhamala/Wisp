import asyncHandler from "../Utils/AsyncHandler.js";
import ApiResponse from "../Utils/ApiResponse.js";
import { Prisma } from "@prisma/client";
import prisma from "../Utils/PrismaProvider.js";
import { getTokenQuotaSnapshot } from "../Services/TokenQuotaService.js";

const DEFAULT_INCLUDED_CREDIT_USD = 20;
const DEFAULT_USAGE_RANGE = "30d";
const USAGE_RANGES = {
  "5h": { bucket: "hour", count: 5 },
  "24h": { bucket: "hour", count: 24 },
  "7d": { bucket: "day", count: 7 },
  "30d": { bucket: "day", count: 30 },
  "90d": { bucket: "day", count: 90 },
};

const startOfUtcDay = (date) => {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
};

const toNumber = (value) => Number(value ?? 0);

const getBucketKey = (date, bucket) => {
  const isoDate = new Date(date).toISOString();
  return bucket === "hour"
    ? `${isoDate.slice(0, 13)}:00:00.000Z`
    : isoDate.slice(0, 10);
};

const ListUsage = asyncHandler(async (req, res) => {
  const rangeFromLegacyDays = req.query.days ? `${req.query.days}d` : null;
  const requestedRange = req.query.range ?? rangeFromLegacyDays;
  const rangeKey = Object.hasOwn(USAGE_RANGES, requestedRange)
    ? requestedRange
    : DEFAULT_USAGE_RANGE;
  const usageRange = USAGE_RANGES[rangeKey];
  const periodEnd = new Date();
  const periodStart =
    usageRange.bucket === "hour"
      ? new Date(periodEnd)
      : startOfUtcDay(periodEnd);
  if (usageRange.bucket === "hour") {
    periodStart.setUTCMinutes(0, 0, 0);
    periodStart.setUTCHours(
      periodStart.getUTCHours() - (usageRange.count - 1),
    );
  } else {
    periodStart.setUTCDate(
      periodStart.getUTCDate() - (usageRange.count - 1),
    );
  }
  const bucketExpression =
    usageRange.bucket === "hour"
      ? Prisma.sql`DATE_TRUNC('hour', message."createdAt")`
      : Prisma.sql`DATE_TRUNC('day', message."createdAt")`;

  const where = {
    createdAt: { gte: periodStart },
    role: "ASSISTANT",
    sessiondata: { owner: req.user.id },
  };
  const [dailyRows, messageCount, modelRows, quota] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        ${bucketExpression} AS bucket,
        message.model,
        COUNT(*)::int AS "requestCount",
        COALESCE(SUM(message."inputTokens"), 0)::bigint AS "inputTokens",
        COALESCE(SUM(message."outputTokens"), 0)::bigint AS "outputTokens",
        COALESCE(SUM(message."cachedInputTokens"), 0)::bigint AS "cachedInputTokens",
        COALESCE(SUM(message."totalTokens"), 0)::bigint AS "totalTokens"
      FROM "Messages" AS message
      INNER JOIN "Sessions" AS session
        ON session.id = message."sessionId"
      WHERE session.owner = ${req.user.id}
        AND message.role = 'ASSISTANT'::"MessageRole"
        AND message."createdAt" >= ${periodStart}
      GROUP BY ${bucketExpression}, message.model
      ORDER BY bucket ASC, message.model ASC
    `,
    prisma.messages.count({
      where: {
        createdAt: { gte: periodStart },
        sessiondata: { owner: req.user.id },
      },
    }),
    prisma.messages.groupBy({
      by: ["model"],
      where,
      _count: { _all: true },
      _sum: {
        cachedInputTokens: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
      },
    }),
    getTokenQuotaSnapshot(req.user.id),
  ]);

  const dailyByModel = dailyRows.map((row) => ({
    cachedInputTokens: toNumber(row.cachedInputTokens),
    date: getBucketKey(row.bucket, usageRange.bucket),
    inputTokens: toNumber(row.inputTokens),
    model: row.model ?? "Unknown model",
    outputTokens: toNumber(row.outputTokens),
    requests: toNumber(row.requestCount),
    totalTokens: toNumber(row.totalTokens),
  }));
  const dailyByDate = new Map();
  for (const row of dailyByModel) {
    const existing = dailyByDate.get(row.date) ?? {
      cachedInputTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      requests: 0,
      totalTokens: 0,
    };
    dailyByDate.set(row.date, {
      cachedInputTokens: existing.cachedInputTokens + row.cachedInputTokens,
      inputTokens: existing.inputTokens + row.inputTokens,
      outputTokens: existing.outputTokens + row.outputTokens,
      requests: existing.requests + row.requests,
      totalTokens: existing.totalTokens + row.totalTokens,
    });
  }
  const daily = Array.from({ length: usageRange.count }, (_, index) => {
    const date = new Date(periodStart);
    if (usageRange.bucket === "hour") {
      date.setUTCHours(date.getUTCHours() + index);
    } else {
      date.setUTCDate(date.getUTCDate() + index);
    }
    const key = getBucketKey(date, usageRange.bucket);
    return {
      date: key,
      ...(dailyByDate.get(key) ?? {
        cachedInputTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        requests: 0,
        totalTokens: 0,
      }),
    };
  });
  const models = modelRows
    .map((row) => ({
      cachedInputTokens: toNumber(row._sum.cachedInputTokens),
      inputTokens: toNumber(row._sum.inputTokens),
      model: row.model ?? "Unknown model",
      outputTokens: toNumber(row._sum.outputTokens),
      requests: row._count._all,
      totalTokens: toNumber(row._sum.totalTokens),
    }))
    .sort(
      (left, right) =>
        right.totalTokens - left.totalTokens ||
        right.requests - left.requests,
    );
  const totals = models.reduce(
    (summary, model) => ({
      cachedInputTokens:
        summary.cachedInputTokens + model.cachedInputTokens,
      inputTokens: summary.inputTokens + model.inputTokens,
      outputTokens: summary.outputTokens + model.outputTokens,
      requests: summary.requests + model.requests,
      totalTokens: summary.totalTokens + model.totalTokens,
    }),
    {
      cachedInputTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      requests: 0,
      totalTokens: 0,
    },
  );

  return res.status(200).json(
    new ApiResponse(200, "Usage fetched", {
      daily,
      dailyByModel,
      models,
      plan: {
        defaultIncludedCreditUsd: DEFAULT_INCLUDED_CREDIT_USD,
        enforcementEnabled: false,
        freeMessagesPerDay: 2,
      },
      period: {
        bucket: usageRange.bucket,
        days:
          usageRange.bucket === "day"
            ? usageRange.count
            : Math.ceil(usageRange.count / 24),
        end: periodEnd.toISOString(),
        range: rangeKey,
        start: periodStart.toISOString(),
      },
      quota,
      totals: { ...totals, messages: messageCount },
    }),
  );
});

export { ListUsage };
