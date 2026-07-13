import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import userroutes from "./Routes/auth.js";
import videoroutes from "./Routes/video.js";
import likeroutes from "./Routes/like.js";
import watchlaterroutes from "./Routes/watchlater.js";
import historyrroutes from "./Routes/history.js";
import commentroutes from "./Routes/comment.js";
dotenv.config();
const app = express();
import path from "path";
app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
const PORT = process.env.PORT || 5000;

const DBURL = process.env.DB_URL;
const localDBURL = "mongodb://127.0.0.1:27017/youtube";

mongoose.set("strictQuery", false);

const connectWithFallback = async (url) => {
  try {
    await mongoose.connect(url);
    console.log(`MongoDB connected to ${url}`);
    return true;
  } catch (error) {
    console.error(`Failed to connect to MongoDB at ${url}:`, error.message);
    return false;
  }
};

const initDb = async () => {
  if (DBURL) {
    const atlasOk = await connectWithFallback(DBURL);
    if (atlasOk) return;
    console.warn("MongoDB Atlas connection failed. Trying local MongoDB fallback...");
  }

  const localOk = await connectWithFallback(localDBURL);
  if (localOk) return;

  console.warn("Local MongoDB fallback failed. Starting in-memory MongoDB server...");

  const memServer = await MongoMemoryServer.create();
  const memoryUri = memServer.getUri();
  const memoryOk = await connectWithFallback(memoryUri);
  if (memoryOk) {
    console.log("MongoDB in-memory server connected. Data will not persist after restart.");
    return;
  }

  console.error(
    "All MongoDB connection attempts failed. Please start local MongoDB or fix Atlas access."
  );
};

initDb().finally(() => {
  app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
  });
});