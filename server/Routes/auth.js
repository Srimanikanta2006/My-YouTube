import express from "express";
import { login, updateprofile, getuser } from "../Controllers/Auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", updateprofile);
routes.get("/get/:id", getuser);
export default routes;