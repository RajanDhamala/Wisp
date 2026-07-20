import { Router } from "express";
import AuthUser from "../Middlewares/AuthMiddelware.js";
import countTokenMiddle from "../Middlewares/CountTokenMiddle.js";
import {
  CreateSession,
  ListSessions,
  GetSession,
  RenameSession,
  DeleteSession,
  DeleteMessage,
  ListModels,
  CreateMessage,
} from "../Controllers/SessionContorller.js";

const SessionRouter = Router();

SessionRouter.get("/models", ListModels);

SessionRouter.use(AuthUser);

SessionRouter.route("/").get(ListSessions).post(CreateSession);

SessionRouter.post("/:sessionId/messages", countTokenMiddle, CreateMessage);
SessionRouter.delete("/:sessionId/messages/:messageId", DeleteMessage);

SessionRouter.route("/:sessionId")
  .get(GetSession)
  .patch(RenameSession)
  .delete(DeleteSession);

export default SessionRouter;
