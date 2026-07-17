import { Router } from "express";
import AuthUser from "../Middlewares/AuthMiddelware.js";
import {
  CreateSession,
  ListSessions,
  GetSession,
  RenameSession,
  DeleteSession,
  ListModels,
  CreateMessage,
} from "../Controllers/SessionContorller.js";

const SessionRouter = Router();

SessionRouter.get("/models", ListModels);

SessionRouter.use(AuthUser);

SessionRouter.route("/").get(ListSessions).post(CreateSession);

SessionRouter.post("/:sessionId/messages", CreateMessage);

SessionRouter.route("/:sessionId")
  .get(GetSession)
  .patch(RenameSession)
  .delete(DeleteSession);

export default SessionRouter;
