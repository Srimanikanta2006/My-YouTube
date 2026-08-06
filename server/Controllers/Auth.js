import mongoose from "mongoose";
import users from "../Modals/auth.js";
import videofiles from "../Modals/video.js";
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

// Real Location Resolver: Client location (GPS/Reverse-Geo/IP) with Geo-IP fallback
const resolveRealLocation = async (req) => {
  // Use client payload whenever present
  if (req.body?.location?.city && req.body.location.city !== "Unknown") {
    return {
      city: req.body.location.city,
      state: req.body.location.state || req.body.location.city,
      country: req.body.location.country || "India",
    };
  }

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

  if (!isLocal) {
    // Provider 1: ipwho.is
    try {
      const res = await axios.get(`https://ipwho.is/${ip}`, { timeout: 3000 });
      if (res.data && res.data.success && res.data.city) {
        return {
          city: res.data.city,
          state: res.data.region || res.data.city,
          country: res.data.country || "India",
        };
      }
    } catch (err) {}

    // Provider 2: ipapi.co fallback
    try {
      const res = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
      if (res.data && res.data.city) {
        return {
          city: res.data.city,
          state: res.data.region || res.data.region_code || "Telangana",
          country: res.data.country_name || "India",
        };
      }
    } catch (err) {}
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

// Helper to send security OTP email via Brevo REST API
const sendSecurityOtpEmail = async (userEmail, userName, otp, locationInfo) => {
  const brevoApiKey = process.env.BREVO_API_KEY || process.env["BREVO_API_KEY"];
  const senderEmail =
    process.env.SENDER_EMAIL ||
    process.env.EMAIL_USER ||
    "security@myyoutube.com";

  if (!brevoApiKey) {
    console.warn(
      "⚠️ BREVO_API_KEY missing in environment variables. Skipping live email dispatch.",
    );
    console.log(`🔑 [DEV MODE] Security OTP Code for ${userEmail}: ${otp}`);
    return;
  }

  const locationText = locationInfo
    ? `${locationInfo.city || "Unknown City"}, ${locationInfo.state || "Unknown State"} (${locationInfo.device || "Unknown Device"})`
    : "New Device / Location";

  try {
    const payload = {
      sender: { name: "My YouTube Security", email: senderEmail },
      to: [{ email: userEmail, name: userName || "User" }],
      subject: "🔒 Security Check: Verification Code for New Login",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 16px;">
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

    const res = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 5000,
      },
    );
  } catch (err) {
    console.error(
      "❌ Brevo Email Dispatch Error:",
      err.response?.data || err.message,
    );
  }
};

// Diagnostic test endpoint for Brevo email dispatch
export const testEmailDispatcher = async (req, res) => {
  const targetEmail = req.query.email || "test@gmail.com";
  const brevoApiKey = process.env.BREVO_API_KEY || process.env["BREVO_API_KEY"];
  const senderEmail =
    process.env.SENDER_EMAIL ||
    process.env.EMAIL_USER ||
    "security@myyoutube.com";

  if (!brevoApiKey) {
    return res.status(400).json({
      success: false,
      error: "Missing BREVO_API_KEY in server environment variables.",
    });
  }

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: "My YouTube Security Test", email: senderEmail },
        to: [{ email: targetEmail }],
        subject: "🧪 Brevo Security OTP Live Test Dispatch",
        textContent:
          "This is a live test email from your deployed My YouTube server via Brevo API!",
      },
      {
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 5000,
      },
    );

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully via Brevo to ${targetEmail}!`,
      messageId: response.data?.messageId,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
};

export const login = async (req, res) => {
  const { email, name, image, deviceId } = req.body;
  const rawUserAgent = req.headers["user-agent"] || "Standard Web Browser";
  const device = parseUserAgentDetailed(rawUserAgent);

  // Parse real location info (via payload or Geo-IP)
  const realLoc = await resolveRealLocation(req);
  const currentLocation = {
    ...realLoc,
    device,
    deviceId: deviceId || "unknown_device",
  };

  const calculatedTheme = getIstTheme();

  try {
    let existingUser = await users.findOne({ email });

    if (!existingUser) {
      // First-time user creation: Auto-trust initial location/device
      const newUser = await users.create({
        email,
        name,
        image,
        plan: "Free",
        theme: calculatedTheme,
        lastLocation: currentLocation,
        knownLocations: [{ ...currentLocation, verifiedAt: new Date() }],
        knownDevices: deviceId ? [deviceId] : [],
      });
      return res.status(201).json({ result: newUser });
    } else {
      let updateFields = {};

      if (image && image !== existingUser.image) {
        updateFields.image = image;
      }

      // Check subscription expiry
      if (
        existingUser.subscriptionExpiresAt &&
        new Date() > new Date(existingUser.subscriptionExpiresAt)
      ) {
        updateFields.plan = "Free";
      }

      // If user hasn't explicitly set a custom theme preference, dynamically re-evaluate theme on login based on IST time
      if (!existingUser.themeIsUserSet) {
        updateFields.theme = calculatedTheme;
      }

      const knownLocationsList = existingUser.knownLocations || [];
      const knownDevicesList = existingUser.knownDevices || [];

      // A login is TRUSTED ONLY IF:
      // 1. deviceId matches an entry in knownDevices, OR
      // 2. Both exact City AND State match a previously verified knownLocation entry
      const isKnownDevice =
        (deviceId && knownDevicesList.includes(deviceId)) ||
        knownLocationsList.some(
          (loc) =>
            (deviceId && loc.deviceId === deviceId) ||
            (loc.city?.toLowerCase() === currentLocation.city.toLowerCase() &&
              loc.state?.toLowerCase() === currentLocation.state.toLowerCase())
        );

      if (!isKnownDevice) {
        // UNKNOWN DEVICE / NEW LOCATION: Require Security OTP Verification!
        const isRecentOtp =
          existingUser.loginOtp &&
          existingUser.otpExpiresAt &&
          new Date(existingUser.otpExpiresAt).getTime() - Date.now() >
            9 * 60 * 1000;

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

          // Dispatch OTP email asynchronously via Brevo REST API
          sendSecurityOtpEmail(
            existingUser.email,
            existingUser.name,
            otp,
            currentLocation,
          ).catch((err) => console.error("Brevo Email Error:", err));
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

      // RECOGNIZED TRUSTED DEVICE & LOCATION: Log in directly without requiring OTP!
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
      return res
        .status(200)
        .json({ success: false, message: "User not found" });
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
        message:
          "Verification OTP code has expired. Please request a new code.",
      });
    }

    // OTP Valid! Register pending location and deviceId as trusted
    const pendingLoc = userDetail.pendingLoginLocation || {
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      device: "Desktop Browser",
    };

    userDetail.knownLocations.push({ ...pendingLoc, verifiedAt: new Date() });
    if (pendingLoc.deviceId) {
      if (!userDetail.knownDevices) userDetail.knownDevices = [];
      if (!userDetail.knownDevices.includes(pendingLoc.deviceId)) {
        userDetail.knownDevices.push(pendingLoc.deviceId);
      }
    }
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

// Endpoint to resend 6-Digit Security OTP
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

    try {
      await sendSecurityOtpEmail(
        userDetail.email,
        userDetail.name,
        otp,
        userDetail.pendingLoginLocation || userDetail.lastLocation,
      );
    } catch (emailErr) {
      console.error(
        "⚠️ Resend OTP email dispatch error (non-fatal):",
        emailErr,
      );
    }

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
    if (theme !== undefined) {
      updateFields.theme = theme;
      updateFields.themeIsUserSet = true;
    }

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

export const toggleSubscription = async (req, res) => {
  const { subscriberId, targetChannelId, targetChannelName } = req.body;

  if (!subscriberId) {
    return res.status(400).json({ message: "Subscriber ID is required." });
  }

  try {
    const subscriberUser = await users.findById(subscriberId);
    if (!subscriberUser) {
      return res.status(404).json({ message: "Subscriber user not found." });
    }

    let targetUser = null;
    if (targetChannelId && mongoose.Types.ObjectId.isValid(targetChannelId)) {
      targetUser = await users.findById(targetChannelId);
    }
    if (!targetUser && targetChannelName) {
      targetUser = await users.findOne({
        $or: [{ channelname: targetChannelName }, { name: targetChannelName }],
      });
    }

    const targetIdStr = targetUser ? targetUser._id.toString() : targetChannelId || targetChannelName;

    const isSubbed = Array.isArray(subscriberUser.subscriptions) && subscriberUser.subscriptions.includes(targetIdStr);

    if (isSubbed) {
      // Unsubscribe
      subscriberUser.subscriptions = (subscriberUser.subscriptions || []).filter((id) => id !== targetIdStr);
      await subscriberUser.save();

      if (targetUser) {
        targetUser.subscribers = (targetUser.subscribers || []).filter((id) => id !== subscriberId);
        await targetUser.save();
      }
    } else {
      // Subscribe
      if (!subscriberUser.subscriptions) subscriberUser.subscriptions = [];
      if (!subscriberUser.subscriptions.includes(targetIdStr)) {
        subscriberUser.subscriptions.push(targetIdStr);
      }
      await subscriberUser.save();

      if (targetUser) {
        if (!targetUser.subscribers) targetUser.subscribers = [];
        if (!targetUser.subscribers.includes(subscriberId)) {
          targetUser.subscribers.push(subscriberId);
        }
        await targetUser.save();

        // Dispatch targeted notification stored in MongoDB for the creator
        const subName = subscriberUser.channelname || subscriberUser.name || "A user";
        try {
          const { sendTargetedNotification } = await import("./notification.js");
          await sendTargetedNotification(req, {
            recipientUserId: targetUser._id.toString(),
            type: "subscribe",
            title: `🎉 ${subName} subscribed to your channel.`,
            message: "You have a new subscriber!",
            actionUrl: `/channel/${subscriberId}`,
            senderImage: subscriberUser.image || "",
          });
        } catch (e) {
          console.error("Error sending subscribe notification:", e);
        }
      }
    }

    const updatedSubCount = targetUser
      ? (targetUser.subscribers ? targetUser.subscribers.length : 0)
      : (isSubbed ? 0 : 1);

    // Broadcast WebSocket event to all active devices
    try {
      const { broadcastWebSocketMessage } = await import("./notification.js");
      broadcastWebSocketMessage(req, {
        type: "subscribe-updated",
        targetChannelId: targetIdStr,
        subscriberCount: updatedSubCount,
        subscribed: !isSubbed,
      });
    } catch (e) {
      console.error("WebSocket broadcast error:", e);
    }

    return res.status(200).json({
      subscribed: !isSubbed,
      subscriberCount: updatedSubCount,
      subscriptions: subscriberUser.subscriptions,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
