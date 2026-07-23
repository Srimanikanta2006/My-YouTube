import mongoose from "mongoose";
import users from "../Modals/auth.js";
import videofiles from "../Modals/video.js";

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    let existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({
        email,
        name,
        image,
        plan: "Free",
      });
      return res.status(201).json({ result: newUser });
    } else {
      // Check if user subscription has expired
      if (
        existingUser.subscriptionExpiresAt &&
        new Date() > new Date(existingUser.subscriptionExpiresAt)
      ) {
        existingUser.plan = "Free";
        await existingUser.save();
      }
      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );

    // Also update all videos uploaded by this user so Video Cards & Pages reflect the new channel name everywhere instantly!
    if (channelname) {
      await videofiles.updateMany(
        { uploader: _id },
        { $set: { videochanel: channelname } }
      );
    }

    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getuser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  try {
    const userDetail = await users.findById(id);
    if (!userDetail) {
      return res.status(404).json({ message: "User not found" });
    }
    // Check subscription validity
    if (
      userDetail.subscriptionExpiresAt &&
      new Date() > new Date(userDetail.subscriptionExpiresAt)
    ) {
      userDetail.plan = "Free";
      await userDetail.save();
    }
    return res.status(200).json(userDetail);
  } catch (error) {
    console.error("Error getting user:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};