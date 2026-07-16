import { Router } from "express";
import AuthUser from "../Middlewares/AuthMiddelware.js";
import {
  GetCurrentUser,
  LogoutUser,
} from "../Controllers/UserController.js";

const UserRouter = Router();

UserRouter.get("/", (req, res) => {
  return res.send("users endpoint is up");
});

UserRouter.get("/me", AuthUser, GetCurrentUser);
UserRouter.post("/logout", LogoutUser);

export default UserRouter;
