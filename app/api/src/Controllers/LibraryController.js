import { z } from "zod";
import asyncHandler from "../Utils/AsyncHandler.js";
import ApiError from "../Utils/ApiError.js";
import ApiResponse from "../Utils/ApiResponse.js";
import prisma from "../Utils/PrismaProvider.js";

const saveResponseSchema = z.object({
  messageId: z.string().uuid(),
});

const SaveResponse = asyncHandler(async (req, res) => {
  const parsed = saveResponseSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ApiError(400, "A valid response id is required", parsed.error.issues);
  }

  const message = await prisma.messages.findFirst({
    where: {
      id: parsed.data.messageId,
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
  const savedResponses = await prisma.savedResponse.findMany({
    where: { owner: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Library fetched", savedResponses));
});

const DeleteSavedResponse = asyncHandler(async (req, res) => {
  const result = await prisma.savedResponse.deleteMany({
    where: {
      id: req.params.savedResponseId,
      owner: req.user.id,
    },
  });

  if (!result.count) throw new ApiError(404, "Saved response not found");

  return res.status(200).json(
    new ApiResponse(200, "Saved response removed", {
      id: req.params.savedResponseId,
    }),
  );
});

export { DeleteSavedResponse, ListSavedResponses, SaveResponse };
