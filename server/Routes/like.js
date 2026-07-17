import express from "express";
import { handlelike, getallLikedVideo, handledislike } from "../Controllers/like.js";

const routes = express.Router();
routes.get("/:userId", getallLikedVideo);
routes.post("/:videoId", handlelike);
routes.post("/dislike/:videoId", handledislike);
export default routes;