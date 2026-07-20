import Redis from "ioredis";
import { getRedisConnection } from "../Queues/MemoryQueue.js";

let redisClient = null;

const getRedisClient = () => {
  if (redisClient) return redisClient;

  const connection = getRedisConnection();
  if (!connection) return null;

  redisClient = new Redis({
    ...connection,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  redisClient.on("error", (error) => {
    console.error("Redis client error", error.message);
  });
  return redisClient;
};

const closeRedisClient = async () => {
  if (!redisClient) return;
  const client = redisClient;
  redisClient = null;

  if (client.status === "wait") {
    client.disconnect();
    return;
  }
  await client.quit();
};

export { closeRedisClient, getRedisClient };
