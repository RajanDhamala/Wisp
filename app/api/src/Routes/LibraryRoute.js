import { Router } from "express";
import {
  DeleteSavedResponse,
  ListSavedResponses,
  SaveResponse,
} from "../Controllers/LibraryController.js";
import AuthUser from "../Middlewares/AuthMiddelware.js";

const LibraryRouter = Router();

LibraryRouter.get("/", AuthUser, ListSavedResponses);
LibraryRouter.post("/", AuthUser, SaveResponse);
LibraryRouter.delete("/:savedResponseId", AuthUser, DeleteSavedResponse);

export default LibraryRouter;
