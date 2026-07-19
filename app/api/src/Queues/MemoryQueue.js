import { Queue } from "bullmq";

const MEMORY_QUEUE_NAME = "memory-extraction";
const MEMORY_QUEUE_PREFIX = "wisp";
const DEFAULT_MEMORY_DELAY_MS = 15 * 60 * 1_000;
// Keep local/testing feedback quick without changing the production debounce.
const DEVELOPMENT_MEMORY_DELAY_MS = 30 * 1_000;

let memoryQueue = null;
let memoryJobScheduledHandler = null;

const decodeUrlPart = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getRedisConnection = ({ worker = false } = {}) => {
  const connectionString = process.env.REDIS_URL?.trim();
  if (!connectionString) return null;

  let redisUrl;
  try {
    redisUrl = new URL(connectionString);
  } catch {
    throw new Error("REDIS_URL is not a valid Redis URL");
  }

  if (!["redis:", "rediss:"].includes(redisUrl.protocol)) {
    throw new Error("REDIS_URL must use redis:// or rediss://");
  }

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    ...(redisUrl.username
      ? { username: decodeUrlPart(redisUrl.username) }
      : {}),
    ...(redisUrl.password
      ? { password: decodeUrlPart(redisUrl.password) }
      : {}),
    ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
    family: 0,
    maxRetriesPerRequest: worker ? null : 1,
  };
};

const getMemoryQueue = () => {
  if (memoryQueue) return memoryQueue;
  const connection = getRedisConnection();
  if (!connection) return null;

  memoryQueue = new Queue(MEMORY_QUEUE_NAME, {
    connection,
    prefix: MEMORY_QUEUE_PREFIX,
  });
  memoryQueue.on("error", (error) => {
    console.error("Memory queue connection error", error.message);
  });
  return memoryQueue;
};

const setMemoryJobScheduledHandler = (handler) => {
  memoryJobScheduledHandler = typeof handler === "function" ? handler : null;
};

const getNextMemoryJobRunAt = async () => {
  const queue = getMemoryQueue();
  if (!queue) return null;

  const client = await queue.client;
  const delayedEntry = await client.zrange(
    queue.keys.delayed,
    0,
    0,
    "WITHSCORES",
  );
  if (delayedEntry.length < 2) return null;

  const delayedScore = Number(delayedEntry[1]);
  return Number.isFinite(delayedScore)
    ? Math.floor(delayedScore / 0x1000)
    : null;
};

const enqueueMemoryExtraction = async ({
  ownerId,
  sessionId,
  throughMessageId,
}) => {
  const queue = getMemoryQueue();
  if (!queue) return false;
  const configuredDelay = Number(process.env.MEMORY_EXTRACTION_DELAY_MS);
  const defaultDelay =
    process.env.NODE_ENV === "production"
      ? DEFAULT_MEMORY_DELAY_MS
      : DEVELOPMENT_MEMORY_DELAY_MS;
  const delay =
    Number.isFinite(configuredDelay) && configuredDelay >= 0
      ? configuredDelay
      : defaultDelay;

  const job = await queue.add(
    "extract-session-memory",
    { ownerId, sessionId, throughMessageId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
      delay,
      deduplication: {
        id: `session:${sessionId}`,
        ttl: Math.max(delay, 1),
        extend: true,
        replace: true,
      },
      removeOnComplete: { age: 24 * 60 * 60, count: 500 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 500 },
    },
  );
  memoryJobScheduledHandler?.(job.timestamp + job.delay);
  return true;
};

const closeMemoryQueue = async () => {
  if (!memoryQueue) return;
  const queue = memoryQueue;
  memoryQueue = null;
  await queue.close();
};

export {
  closeMemoryQueue,
  enqueueMemoryExtraction,
  getRedisConnection,
  getNextMemoryJobRunAt,
  MEMORY_QUEUE_NAME,
  MEMORY_QUEUE_PREFIX,
  setMemoryJobScheduledHandler,
};
