import prisma from "../Utils/PrismaProvider.js";
import {
  balanceKeyFor,
  connectRedis,
  releaseExpiredTokenReservations,
  TOKEN_QUOTA_DIRTY_KEY,
} from "../Services/TokenQuotaService.js";

const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_BATCH_SIZE = 100;
let flushTimer = null;
let flushInProgress = null;

const flushTokenQuotaBalances = async () => {
  if (flushInProgress) return flushInProgress;

  flushInProgress = (async () => {
    const client = await connectRedis();
    if (!client) return;
    await releaseExpiredTokenReservations(FLUSH_BATCH_SIZE);

    const userIds = await client.spop(
      TOKEN_QUOTA_DIRTY_KEY,
      FLUSH_BATCH_SIZE,
    );
    if (!userIds?.length) return;

    try {
      const balances = await Promise.all(
        userIds.map((userId) => client.get(balanceKeyFor(userId))),
      );
      const updates = userIds.flatMap((userId, index) => {
        const remainingTokens = balances[index];
        if (!/^-?\d+$/.test(remainingTokens ?? "")) return [];
        return prisma.tokenQuota.updateMany({
          where: { owner: userId },
          data: { remainingTokens: BigInt(remainingTokens) },
        });
      });
      if (updates.length) await prisma.$transaction(updates);
    } catch (error) {
      await client.sadd(TOKEN_QUOTA_DIRTY_KEY, ...userIds);
      throw error;
    }
  })().finally(() => {
    flushInProgress = null;
  });

  return flushInProgress;
};

const startTokenQuotaWorker = () => {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushTokenQuotaBalances().catch((error) => {
      console.error("Could not flush token quota balances", error.message);
    });
  }, FLUSH_INTERVAL_MS);
  flushTimer.unref?.();
};

const stopTokenQuotaWorker = async () => {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  await flushTokenQuotaBalances();
};

export {
  flushTokenQuotaBalances,
  startTokenQuotaWorker,
  stopTokenQuotaWorker,
};
