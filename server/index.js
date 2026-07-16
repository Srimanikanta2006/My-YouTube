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
import video from "./Modals/video.js";
import { initSignalingServer } from "./signaling.js";
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

const seedVideos = async () => {
  try {
    // Clean up any old broken video entries containing backslashes
    await video.deleteMany({ filepath: { $regex: /\\/ } });

    // Clean up any old default seed records to force re-seeding with duration fields
    await video.deleteMany({ uploader: "blender_studio" });

    const hasSeed = await video.findOne({ uploader: "blender_studio" });
    if (!hasSeed) {
      console.log("Seeding default videos...");
      const defaultVideos = [
        {
          videotitle: "Big Buck Bunny - Animated Short Film",
          filename: "BigBuckBunny.mp4",
          filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          filetype: "video/mp4",
          filesize: "276MB",
          videochanel: "Blender Studio",
          views: 1482030,
          uploader: "blender_studio",
          Like: 12540,
          videoduration: "10:07",
          videocategory: "Comedy",
        },
        {
          videotitle: "Sintel - Open Movie Project",
          filename: "Sintel.mp4",
          filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
          filetype: "video/mp4",
          filesize: "128MB",
          videochanel: "Blender Studio",
          views: 928302,
          uploader: "blender_studio",
          Like: 8430,
          videoduration: "00:52",
          videocategory: "Gaming",
        },
        {
          videotitle: "Tears of Steel - Sci-Fi VFX Short",
          filename: "TearsOfSteel.mp4",
          filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
          filetype: "video/mp4",
          filesize: "310MB",
          videochanel: "Blender Studio",
          views: 830123,
          uploader: "blender_studio",
          Like: 7120,
          videoduration: "12:14",
          videocategory: "Technology",
        },
        {
          videotitle: "Elephants Dream - Surreal CGI Movie",
          filename: "ElephantsDream.mp4",
          filepath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
          filetype: "video/mp4",
          filesize: "140MB",
          videochanel: "Blender Studio",
          views: 520481,
          uploader: "blender_studio",
          Like: 4500,
          videoduration: "10:53",
          videocategory: "Science",
        }
      ];
      await video.insertMany(defaultVideos);
      console.log("Default videos seeded successfully!");
    }
  } catch (error) {
    console.error("Error seeding default videos:", error.message);
  }
};

const initDb = async () => {
  if (DBURL) {
    const atlasOk = await connectWithFallback(DBURL);
    if (atlasOk) {
      await seedVideos();
      return;
    }
    console.warn("MongoDB Atlas connection failed. Trying local MongoDB fallback...");
  }

  const localOk = await connectWithFallback(localDBURL);
  if (localOk) {
    await seedVideos();
    return;
  }

  console.warn("Local MongoDB fallback failed. Starting in-memory MongoDB server...");

  const memServer = await MongoMemoryServer.create();
  const memoryUri = memServer.getUri();
  const memoryOk = await connectWithFallback(memoryUri);
  if (memoryOk) {
    console.log("MongoDB in-memory server connected. Data will not persist after restart.");
    await seedVideos();
    return;
  }

  console.error(
    "All MongoDB connection attempts failed. Please start local MongoDB or fix Atlas access."
  );
};

initDb().finally(() => {
  const server = app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
  });
  initSignalingServer(server);
});