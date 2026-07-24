import mongoose from "mongoose";
import users from "../Modals/auth.js";
import videofiles from "../Modals/video.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import axios from "axios";

// Cryptographically secure 6-digit OTP generation using Node.js crypto.randomInt
const generateSecureOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// Detailed User-Agent parser for precise Browser & OS detection
const parseUserAgentDetailed = (uaString = "") => {
  let browser = "Web Browser";
  if (uaString.includes("Firefox/")) browser = "Firefox";
  else if (uaString.includes("Edg/")) browser = "Microsoft Edge";
  else if (uaString.includes("Chrome/")) browser = "Google Chrome";
  else if (uaString.includes("Safari/") && !uaString.includes("Chrome/"))
    browser = "Safari";
  else if (uaString.includes("OPR/") || uaString.includes("Opera"))
    browser = "Opera";

  let os = "Desktop";
  if (uaString.includes("Windows")) os = "Windows";
  else if (uaString.includes("Macintosh") || uaString.includes("Mac OS"))
    os = "macOS";
  else if (uaString.includes("Android")) os = "Android";
  else if (uaString.includes("iPhone") || uaString.includes("iPad")) os = "iOS";
  else if (uaString.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
};

// Real Location Resolver: Uses client payload or server-side Geo-IP lookup API
const resolveRealLocation = async (req) => {
  // 1. Prioritize client location payload if available
  if (req.body?.location?.city && req.body.location.city !== "Unknown") {
    return {
      city: req.body.location.city,
      state: req.body.location.state || req.body.location.city,
      country: req.body.location.country || "India",
    };
  }

  // 2. Extract Client IP
  let ip =
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "";
  if (typeof ip === "string" && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  const isLocal =
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.includes("127.0.0.1") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.");

  try {
    const apiUrl = isLocal
      ? "http://ip-api.com/json"
      : `http://ip-api.com/json/${ip}`;
    const res = await axios.get(apiUrl, { timeout: 2500 });
    if (res.data && res.data.status === "success") {
      return {
        city: res.data.city || "Hyderabad",
        state: res.data.regionName || res.data.region || "Telangana",
        country: res.data.country || "India",
      };
    }
  } catch (err) {
    console.warn(
      "Geo-IP lookup fallback (network offline or timeout):",
      err.message,
    );
  }

  return {
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
  };
};

// Helper to determine default theme based on IST login time
// 10:00 AM (600 mins) to 12:00 PM (720 mins) IST = "light", otherwise "dark"
const getIstTheme = () => {
  try {
    const istTimeStr = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    });
    const timePart = istTimeStr.split(", ")[1] || istTimeStr;
    const parts = timePart.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes >= 600 && totalMinutes <= 720) {
      return "light";
    }
    return "dark";
  } catch (err) {
    console.error("Error calculating IST time:", err);
    return "dark";
  }
};

// Helper to send security OTP email
const sendSecurityOtpEmail = async (userEmail, userName, otp, locationInfo) => {
  try {
    let transporter;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const locationText = locationInfo
      ? `${locationInfo.city || "Unknown City"}, ${locationInfo.state || "Unknown State"} (${locationInfo.device || "Unknown Device"})`
      : "New Device / Location";

    const mailOptions = {
      from: `"My YouTube Security" <${process.env.EMAIL_USER || "security@myyoutube.com"}>`,
      to: userEmail,
      subject: `🔒 Security Check: Verification Code for New Login`,
      text: `Hi ${userName || "User"},

We detected a login attempt from a new city, state, or device:
Location & Device: ${locationText}

Your 6-digit Security Verification Code (OTP) is:
👉 ${otp} 👈

This code is valid for 10 minutes. If you did not initiate this login, please protect your account.

— My YouTube Security Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; rounded: 16px;">
          <h2 style="color: #111827; margin-bottom: 8px;">🔒 Security Verification Required</h2>
          <p style="color: #4b5563; font-size: 14px;">Hi <strong>${userName || "User"}</strong>,</p>
          <p style="color: #4b5563; font-size: 14px;">We detected a login from a new city, state, or device:</p>
          <div style="background-color: #f3f4f6; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #1f2937; margin: 16px 0;">
            <strong>Detected Location:</strong> ${locationText}
          </div>
          <p style="color: #4b5563; font-size: 14px;">Your 6-digit Security Verification OTP code is:</p>
          <div style="background-color: #111827; color: #fbbf24; font-size: 28px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; border-radius: 12px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center;">This code will expire in 10 minutes.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`🔒 Security OTP sent to: ${userEmail}`);
    console.log(`🔑 [DEV MODE] 6-Digit OTP Code for ${userEmail}: ${otp}`);
    if (!process.env.EMAIL_USER) {
      console.log(
        "🔗 Live Security Email Preview URL:",
        nodemailer.getTestMessageUrl(info),
      );
    }
  } catch (err) {
    console.error("Error sending OTP email:", err);
  }
};

export const login = async (req, res) => {
  const { email, name, image } = req.body;
  const rawUserAgent = req.headers["user-agent"] || "Standard Web Browser";
  const device = parseUserAgentDetailed(rawUserAgent);

  // Parse real location info (via payload or Geo-IP)
  const realLoc = await resolveRealLocation(req);
  const currentLocation = {
    ...realLoc,
    device,
  };

  const calculatedTheme = getIstTheme();

  try {
    let existingUser = await users.findOne({ email });

    if (!existingUser) {
      // First-time user creation: Auto-trust initial location
      const newUser = await users.create({
        email,
        name,
        image,
        plan: "Free",
        theme: calculatedTheme,
        lastLocation: currentLocation,
        knownLocations: [{ ...currentLocation, verifiedAt: new Date() }],
      });
      return res.status(201).json({ result: newUser });
    } else {
      let updateFields = {};

      // Check subscription expiry
      if (
        existingUser.subscriptionExpiresAt &&
        new Date() > new Date(existingUser.subscriptionExpiresAt)
      ) {
        updateFields.plan = "Free";
      }

      // If user hasn't explicitly saved a theme, set based on IST time
      if (!existingUser.theme) {
        updateFields.theme = calculatedTheme;
      }

      // Security Location & Device Check:
      const knownList = existingUser.knownLocations || [];
      if (knownList.length === 0) {
        const initialLocations = [
          { ...currentLocation, verifiedAt: new Date() },
        ];
        const updatedUser = await users.findByIdAndUpdate(
          existingUser._id,
          {
            $set: {
              ...updateFields,
              knownLocations: initialLocations,
              lastLocation: currentLocation,
            },
          },
          { returnDocument: "after" },
        );
        return res.status(200).json({ result: updatedUser });
      }

      // Check if current location/device matches any known trusted location
      const isKnownLocation = knownList.some(
        (loc) =>
          loc.city?.toLowerCase() === currentLocation.city.toLowerCase() &&
          loc.state?.toLowerCase() === currentLocation.state.toLowerCase() &&
          loc.device?.toLowerCase() === currentLocation.device.toLowerCase(),
      );

      if (!isKnownLocation) {
        // Reuse active OTP if generated less than 60 seconds ago (prevents duplicate emails from rapid race condition calls)
        const isRecentOtp =
          existingUser.loginOtp &&
          existingUser.otpExpiresAt &&
          new Date(existingUser.otpExpiresAt).getTime() - Date.now() > 9 * 60 * 1000;

        let otp = existingUser.loginOtp;
        if (!isRecentOtp) {
          otp = generateSecureOtp();
          await users.findByIdAndUpdate(existingUser._id, {
            $set: {
              ...updateFields,
              loginOtp: otp,
              otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
              pendingLoginLocation: currentLocation,
            },
          });

          // Dispatch OTP Email
          sendSecurityOtpEmail(
            existingUser.email,
            existingUser.name,
            otp,
            currentLocation,
          );
        }

        return res.status(200).json({
          otpRequired: true,
          userId: existingUser._id,
          email: existingUser.email,
          message:
            "Security Verification Required: New city, state, or device detected.",
          locationInfo: currentLocation,
        });
      }

      // Known location: Update last location and save
      const updatedUser = await users.findByIdAndUpdate(
        existingUser._id,
        {
          $set: {
            ...updateFields,
            lastLocation: currentLocation,
          },
        },
        { returnDocument: "after" },
      );

      return res.status(200).json({ result: updatedUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong during login" });
  }
};

// Endpoint to verify 6-Digit Security OTP
export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(200).json({ success: false, message: "Invalid user ID" });
  }

  try {
    const userDetail = await users.findById(userId);
    if (!userDetail) {
      return res.status(200).json({ success: false, message: "User not found" });
    }

    if (!userDetail.loginOtp || userDetail.loginOtp !== otp) {
      return res.status(200).json({
        success: false,
        message: "Invalid verification OTP code. Please try again.",
      });
    }

    if (
      userDetail.otpExpiresAt &&
      new Date() > new Date(userDetail.otpExpiresAt)
    ) {
      return res.status(200).json({
        success: false,
        message: "Verification OTP code has expired. Please request a new code.",
      });
    }

    // OTP Valid! Register pending location as trusted
    const pendingLoc = userDetail.pendingLoginLocation || {
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      device: "Desktop Browser",
    };

    userDetail.knownLocations.push({ ...pendingLoc, verifiedAt: new Date() });
    userDetail.lastLocation = pendingLoc;
    userDetail.loginOtp = null;
    userDetail.otpExpiresAt = null;
    userDetail.pendingLoginLocation = null;

    await userDetail.save();

    return res.status(200).json({
      success: true,
      message: "Security verification successful!",
      result: userDetail,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ message: "Server error verifying OTP." });
  }
};

// Endpoint to resend OTP
export const resendOtp = async (req, res) => {
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const userDetail = await users.findById(userId);
    if (!userDetail) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateSecureOtp();
    userDetail.loginOtp = otp;
    userDetail.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await userDetail.save();

    sendSecurityOtpEmail(
      userDetail.email,
      userDetail.name,
      otp,
      userDetail.pendingLoginLocation || userDetail.lastLocation,
    );

    return res.status(200).json({
      success: true,
      message: "A new security OTP has been sent to your email.",
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({ message: "Failed to resend OTP." });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description, theme } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updateFields = {};
    if (channelname !== undefined) updateFields.channelname = channelname;
    if (description !== undefined) updateFields.description = description;
    if (theme !== undefined) updateFields.theme = theme;

    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: updateFields },
      { new: true },
    );

    if (channelname) {
      await videofiles.updateMany(
        { uploader: _id },
        { $set: { videochanel: channelname } },
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
