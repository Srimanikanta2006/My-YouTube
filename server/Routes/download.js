import express from "express";
import {
  trackDownload,
  getUserDownloads,
  deleteDownloadRecord,
  updateUserPlan,
} from "../Controllers/download.js";

const routes = express.Router();

routes.post("/track", trackDownload);
routes.get("/user/:userId", getUserDownloads);
routes.delete("/delete/:id", deleteDownloadRecord);
routes.patch("/plan", updateUserPlan);

export default routes;
