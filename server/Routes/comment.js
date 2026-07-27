import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  likecomment,
  dislikecomment,
  reportcomment,
} from "../Controllers/comment.js";

const routes = express.Router();

routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);

// Like & Dislike
routes.post("/like/:id", likecomment);
routes.post("/dislike/:id", dislikecomment);

// Community Moderation Report
routes.post("/report/:id", reportcomment);

export default routes;