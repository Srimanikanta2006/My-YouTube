import express from "express";
import { login, updateprofile, getuser, verifyOtp, resendOtp, testEmailDispatcher } from "../Controllers/Auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyOtp);
routes.post("/resend-otp", resendOtp);
routes.get("/test-email", testEmailDispatcher);
routes.patch("/update/:id", updateprofile);
routes.get("/get/:id", getuser);
export default routes;