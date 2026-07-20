import express from "express";
import { getallvideo, uploadvideo, getvideoById, deletevideo, updatevideo, getCloudinarySignature } from "../Controllers/video.js";
import upload from "../FileHelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.single("file"), uploadvideo);
routes.get("/signature", getCloudinarySignature);
routes.get("/getall", getallvideo);
routes.get("/get/:id", getvideoById);
routes.delete("/delete/:id", deletevideo);
routes.patch("/update/:id", updatevideo);
export default routes;