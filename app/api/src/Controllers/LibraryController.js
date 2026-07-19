import { z } from "zod";
import asyncHandler from "../Utils/AsyncHandler.js";
import ApiError from "../Utils/ApiError.js";
import ApiResponse from "../Utils/ApiResponse.js";
import prisma from "../Utils/PrismaProvider.js";

const DEFAULT_LIBRARY_PAGE_SIZE = 10;
const MAX_LIBRARY_PAGE_SIZE = 50;

const saveResponseSchema = z.object({
  messageId: z.string().uuid(),
});

const listSavedResponsesQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(500).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIBRARY_PAGE_SIZE)
    .default(DEFAULT_LIBRARY_PAGE_SIZE),
  search: z.string().trim().max(100).optional(),
});

const savedResponseCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
});

const savedResponseParamsSchema = z.object({
  savedResponseId: z.string().uuid(),
});

const parseRequest = (schema, value, message) => {
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) {
    throw new ApiError(400, message, parsed.error.issues);
  }
  return parsed.data;
};

const encodeSavedResponseCursor = (savedResponse) =>
  Buffer.from(
    JSON.stringify({
      createdAt: savedResponse.createdAt.toISOString(),
      id: savedResponse.id,
    }),
    "utf8",
  ).toString("base64url");

const decodeSavedResponseCursor = (cursor) => {
  try {
    const value = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    const parsed = savedResponseCursorSchema.parse(value);
    return {
      createdAt: new Date(parsed.createdAt),
      id: parsed.id,
    };
  } catch {
    throw new ApiError(400, "Invalid library cursor");
  }
};

const SaveResponse = asyncHandler(async (req, res) => {
  const { messageId } = parseRequest(
    saveResponseSchema,
    req.body,
    "A valid response id is required",
  );

  const message = await prisma.messages.findFirst({
    where: {
      id: messageId,
      role: "ASSISTANT",
      sessiondata: { owner: req.user.id },
    },
    select: {
      content: true,
      id: true,
      model: true,
      sessiondata: { select: { id: true, title: true } },
    },
  });

  if (!message) throw new ApiError(404, "Response not found");

  const snapshot = {
    content: message.content,
    model: message.model,
    sourceChatTitle: message.sessiondata.title,
    sourceSessionId: message.sessiondata.id,
  };
  const savedResponse = await prisma.savedResponse.upsert({
    where: {
      owner_sourceMessageId: {
        owner: req.user.id,
        sourceMessageId: message.id,
      },
    },
    create: {
      ...snapshot,
      owner: req.user.id,
      sourceMessageId: message.id,
    },
    update: snapshot,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Response saved to library", savedResponse));
});

const ListSavedResponses = asyncHandler(async (req, res) => {
  const { cursor: encodedCursor, limit, search } = parseRequest(
    listSavedResponsesQuerySchema,
    req.query,
    "Invalid query parameters",
  );
  const cursor = encodedCursor
    ? decodeSavedResponseCursor(encodedCursor)
    : null;
  const filters = [];

  if (search) {
    filters.push({
      OR: [
        { sourceChatTitle: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (cursor) {
    filters.push({
      OR: [
        { createdAt: { lt: cursor.createdAt } },
        {
          createdAt: cursor.createdAt,
          id: { lt: cursor.id },
        },
      ],
    });
  }

  const savedResponses = await prisma.savedResponse.findMany({
    where: {
      owner: req.user.id,
      ...(filters.length ? { AND: filters } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const hasNextPage = savedResponses.length > limit;
  const items = savedResponses.slice(0, limit);
  const nextCursor = hasNextPage
    ? encodeSavedResponseCursor(items.at(-1))
    : null;

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Library fetched", {
        items,
        nextCursor,
      }),
    );
});

const DeleteSavedResponse = asyncHandler(async (req, res) => {
  const { savedResponseId } = parseRequest(
    savedResponseParamsSchema,
    req.params,
    "A valid saved response id is required",
  );
  const result = await prisma.savedResponse.deleteMany({
    where: {
      id: savedResponseId,
      owner: req.user.id,
    },
  });

  if (!result.count) throw new ApiError(404, "Saved response not found");

  return res.status(200).json(
    new ApiResponse(200, "Saved response removed", {
      id: savedResponseId,
    }),
  );
});

export { DeleteSavedResponse, ListSavedResponses, SaveResponse };
