import { Router } from "express";
import AuthUser from "../Middlewares/AuthMiddelware.js"
const UserRouter = Router()

UserRouter.get("/", (req, res) => {
    return res.send("users endpoint is up")
})


export default UserRouter
