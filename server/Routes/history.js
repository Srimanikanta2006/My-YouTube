import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
  deleteHistory,
} from "../Controllers/history.js";

const routes = express.Router();
routes.get("/:userId", getallhistoryVideo);
routes.post("/views/:videoId", handleview);
routes.post("/:videoId", handlehistory);
routes.delete("/delete/:id", deleteHistory);
export default routes;