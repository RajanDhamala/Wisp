import { Router } from "express";
import AuthUser from "../Middlewares/AuthMiddelware.js";
import {
  CreateProject,
  DeleteProject,
  ListProjects,
  RenameProject,
} from "../Controllers/ProjectController.js";

const ProjectRouter = Router();

ProjectRouter.use(AuthUser);
ProjectRouter.route("/").get(ListProjects).post(CreateProject);
ProjectRouter.route("/:projectId")
  .patch(RenameProject)
  .delete(DeleteProject);

export default ProjectRouter;
