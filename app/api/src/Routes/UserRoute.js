import { Router } from "express";
import AuthUser from "../Middlewares/AuthMiddelware.js";
import {
  GetCurrentUser,
  LogoutUser,
} from "../Controllers/UserController.js";
import {
  DeleteMemory,
  ListMemories,
  UpdateMemorySettings,
} from "../Controllers/MemoryController.js";

const UserRouter = Router();

UserRouter.get("/", (req, res) => {
  return res.send("users endpoint is up");
});

UserRouter.get("/me", AuthUser, GetCurrentUser);
UserRouter.patch("/memory-settings", AuthUser, UpdateMemorySettings);
UserRouter.get("/memories", AuthUser, ListMemories);
UserRouter.delete("/memories/:memoryId", AuthUser, DeleteMemory);
UserRouter.post("/logout", LogoutUser);

export default UserRouter;
