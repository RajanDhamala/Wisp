import { z } from "zod";
import asyncHandler from "../Utils/AsyncHandler.js";
import ApiError from "../Utils/ApiError.js";
import ApiResponse from "../Utils/ApiResponse.js";
import prisma from "../Utils/PrismaProvider.js";

const DEFAULT_MEMORY_PAGE_SIZE = 20;
const MAX_MEMORY_PAGE_SIZE = 50;

const memorySettingsSchema = z.object({
  enabled: z.boolean(),
});

const listMemoriesQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(500).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_MEMORY_PAGE_SIZE)
    .default(DEFAULT_MEMORY_PAGE_SIZE),
});

const memoryCursorSchema = z.object({
  id: z.string().uuid(),
  updatedAt: z.string().datetime(),
});

const memoryParamsSchema = z.object({
  memoryId: z.string().uuid(),
});

const parseRequest = (schema, value, message) => {
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) {
    throw new ApiError(400, message, parsed.error.issues);
  }
  return parsed.data;
};

const encodeMemoryCursor = (memory) =>
  Buffer.from(
    JSON.stringify({
      id: memory.id,
      updatedAt: memory.updatedAt.toISOString(),
    }),
    "utf8",
  ).toString("base64url");

const decodeMemoryCursor = (cursor) => {
  try {
    const value = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    const parsed = memoryCursorSchema.parse(value);
    return {
      id: parsed.id,
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch {
    throw new ApiError(400, "Invalid memory cursor");
  }
};

const UpdateMemorySettings = asyncHandler(async (req, res) => {
  const { enabled } = parseRequest(
    memorySettingsSchema,
    req.body,
    "A valid automatic memory setting is required",
  );
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      memoryAutoEnabled: enabled,
      memoryAutoEnabledAt: enabled ? new Date() : null,
    },
    select: {
      id: true,
      fullname: true,
      email: true,
      avatar: true,
      provider: true,
      memoryAutoEnabled: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Memory settings updated", user));
});

const ListMemories = asyncHandler(async (req, res) => {
  const { cursor: encodedCursor, limit } = parseRequest(
    listMemoriesQuerySchema,
    req.query,
    "Invalid query parameters",
  );
  const cursor = encodedCursor ? decodeMemoryCursor(encodedCursor) : null;
  const memories = await prisma.userMemory.findMany({
    where: {
      owner: req.user.id,
      ...(cursor
        ? {
            OR: [
              { updatedAt: { lt: cursor.updatedAt } },
              {
                updatedAt: cursor.updatedAt,
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      kind: true,
      content: true,
      confidence: true,
      importance: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const hasNextPage = memories.length > limit;
  const items = memories.slice(0, limit);
  const nextCursor = hasNextPage ? encodeMemoryCursor(items.at(-1)) : null;

  return res.status(200).json(
    new ApiResponse(200, "Memories fetched", {
      items,
      nextCursor,
    }),
  );
});

const DeleteMemory = asyncHandler(async (req, res) => {
  const { memoryId } = parseRequest(
    memoryParamsSchema,
    req.params,
    "A valid memory id is required",
  );
  const result = await prisma.userMemory.deleteMany({
    where: {
      id: memoryId,
      owner: req.user.id,
    },
  });

  if (!result.count) throw new ApiError(404, "Memory not found");

  return res
    .status(200)
    .json(new ApiResponse(200, "Memory deleted", { id: memoryId }));
});

export { DeleteMemory, ListMemories, UpdateMemorySettings };
