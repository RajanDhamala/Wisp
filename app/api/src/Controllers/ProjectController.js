import { z } from "zod";
import asyncHandler from "../Utils/AsyncHandler.js";
import ApiError from "../Utils/ApiError.js";
import ApiResponse from "../Utils/ApiResponse.js";
import prisma from "../Utils/PrismaProvider.js";

const projectSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

const parseProject = (body) => {
  const result = projectSchema.safeParse(body ?? {});
  if (!result.success) {
    throw new ApiError(400, "Project name is required", result.error.issues);
  }
  return result.data;
};

const findOwnedProject = async (projectId, ownerId) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: ownerId },
  });
  if (!project) throw new ApiError(404, "Project not found");
  return project;
};

const ListProjects = asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { owner: req.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { sessions: true } } },
  });
  const data = projects.map(({ _count, ...project }) => ({
    ...project,
    sessionCount: _count.sessions,
  }));
  return res
    .status(200)
    .json(new ApiResponse(200, "Projects fetched", data));
});

const CreateProject = asyncHandler(async (req, res) => {
  const { name } = parseProject(req.body);

  try {
    const project = await prisma.project.create({
      data: { name, owner: req.user.id },
    });
    return res.status(201).json(
      new ApiResponse(201, "Project created", {
        ...project,
        sessionCount: 0,
      }),
    );
  } catch (error) {
    if (error?.code === "P2002") {
      throw new ApiError(409, "A project with that name already exists");
    }
    throw error;
  }
});

const RenameProject = asyncHandler(async (req, res) => {
  const { name } = parseProject(req.body);
  await findOwnedProject(req.params.projectId, req.user.id);

  try {
    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: { name },
      include: { _count: { select: { sessions: true } } },
    });
    const { _count, ...data } = project;
    return res.status(200).json(
      new ApiResponse(200, "Project renamed", {
        ...data,
        sessionCount: _count.sessions,
      }),
    );
  } catch (error) {
    if (error?.code === "P2002") {
      throw new ApiError(409, "A project with that name already exists");
    }
    throw error;
  }
});

const DeleteProject = asyncHandler(async (req, res) => {
  const result = await prisma.project.deleteMany({
    where: { id: req.params.projectId, owner: req.user.id },
  });
  if (!result.count) throw new ApiError(404, "Project not found");
  return res.status(200).json(
    new ApiResponse(200, "Project deleted", {
      id: req.params.projectId,
    }),
  );
});

export { CreateProject, DeleteProject, ListProjects, RenameProject };
