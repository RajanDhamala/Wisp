import { Router } from "express";
import {
  DeleteSavedResponse,
  ListSavedResponses,
  SaveResponse,
} from "../Controllers/LibraryController.js";
import AuthUser from "../Middlewares/AuthMiddelware.js";

const LibraryRouter = Router();

LibraryRouter.use(AuthUser);
LibraryRouter.route("/responses").get(ListSavedResponses).post(SaveResponse);
LibraryRouter.delete("/responses/:savedResponseId", DeleteSavedResponse);

export default LibraryRouter;
