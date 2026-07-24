import express from "express";
import { login, updateprofile, getuser, verifyOtp, resendOtp } from "../Controllers/Auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyOtp);
routes.post("/resend-otp", resendOtp);
routes.patch("/update/:id", updateprofile);
routes.get("/get/:id", getuser);
export default routes;