import express from "express";
import { handlelike, getallLikedVideo, handledislike, getReactionStatus } from "../Controllers/like.js";

const routes = express.Router();
routes.get("/:userId", getallLikedVideo);
routes.get("/status/:videoId/:userId", getReactionStatus);
routes.post("/:videoId", handlelike);
routes.post("/dislike/:videoId", handledislike);

export default routes;