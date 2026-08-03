import Razorpay from "razorpay";
import crypto from "crypto";
import axios from "axios";
import user from "../Modals/auth.js";
import payment from "../Modals/payment.js";

// Plan pricing map in INR (amount in paise for Razorpay)
const PLAN_PRICES = {
  Bronze: 99, // ₹99
  Silver: 199, // ₹199
  Gold: 499, // ₹499
};

// Helper function to send subscription confirmation email via Brevo REST API
const sendSubscriptionEmail = async (invoice) => {
  const brevoApiKey = process.env.BREVO_API_KEY || process.env["BREVO_API_KEY"];
  const senderEmail = process.env.SENDER_EMAIL || process.env.EMAIL_USER || "subscriptions@myyoutube.com";

  if (!brevoApiKey) {
    console.warn("⚠️ BREVO_API_KEY missing in environment variables. Skipping subscription confirmation email.");
    return;
  }

  try {
    const formattedDate = new Date(invoice.paidAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const downloadsCount =
      invoice.plan === "Gold" ? "50" : invoice.plan === "Silver" ? "15" : "5";

    const payload = {
      sender: { name: "My YouTube Subscriptions", email: senderEmail },
      to: [{ email: invoice.userEmail, name: invoice.userName }],
      subject: `🎉 Subscription Confirmed - ${invoice.plan} Plan`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 16px; padding: 28px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px;">
            <h1 style="color: #d97706; margin: 0; font-size: 24px;">🎉 Subscription Confirmed</h1>
            <p style="color: #4b5563; font-size: 14px; margin-top: 6px;">My YouTube Platform</p>
          </div>
          
          <div style="padding: 24px 0;">
            <p style="font-size: 16px; color: #111827; margin-bottom: 16px;">Hi <strong>${invoice.userName}</strong> (${invoice.userEmail}),</p>
            <p style="font-size: 14px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Your <strong>${invoice.plan} Subscription</strong> is now active.
            </p>
            
            <div style="background-color: #fffbe6; border: 1px solid #ffe58f; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
              <pre style="font-family: monospace; font-size: 13px; color: #1f2937; margin: 0; white-space: pre-wrap;">
-----------------------------
Plan          : ${invoice.plan}
Amount Paid   : ₹${invoice.totalAmount}
Payment ID    : ${invoice.transactionId}
Order ID      : ${invoice.orderId}
Date          : ${formattedDate}
-----------------------------
              </pre>
            </div>
            
            <p style="font-size: 14px; font-weight: bold; color: #111827; margin-bottom: 10px;">You can now enjoy:</p>
            <ul style="padding-left: 0; font-size: 14px; color: #374151; line-height: 1.8; margin-bottom: 24px; list-style-type: none;">
              <li>✅ Premium Videos</li>
              <li>✅ ${downloadsCount} Downloads/Day</li>
              <li>${["Silver", "Gold"].includes(invoice.plan) ? "✅ Ad-Free Viewing" : "✅ Priority Video Streaming"}</li>
            </ul>

            <p style="font-size: 14px; color: #374151; margin-bottom: 24px;">
              Thank you for supporting our platform!
            </p>

            <p style="font-size: 14px; font-weight: bold; color: #111827;">
              — Video Platform Team
            </p>
          </div>
          
          <div style="text-align: center; border-top: 1px solid #f3f4f6; padding-top: 16px; font-size: 12px; color: #9ca3af;">
            <p>© ${new Date().getFullYear()} My YouTube Platform. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const res = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "accept": "application/json",
      },
      timeout: 5000,
    });

    console.log(`✉️ Brevo subscription confirmation email sent to ${invoice.userEmail}! MessageId: ${res.data?.messageId}`);
  } catch (emailErr) {
    console.error("Brevo Subscription Email Error:", emailErr.response?.data || emailErr.message);
  }
};

// Initialize Razorpay SDK instance
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) in environment variables.");
    }
  }

  return new Razorpay({
    key_id: key_id || "rzp_test_MyYouTubeKey",
    key_secret: key_secret || "rzp_test_secret_12345",
  });
};

// 1. Create Razorpay Order
export const createOrder = async (req, res) => {
  const { userId, plan } = req.body;

  if (!userId || !plan) {
    return res.status(400).json({ message: "User ID and Plan are required." });
  }

  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({ message: "Invalid plan selected. Allowed plans: Bronze, Silver, Gold." });
  }

  try {
    const basePrice = PLAN_PRICES[plan];
    const totalAmountWithGst = Math.round(basePrice * 1.18); // Base price + 18% GST
    const amountInPaise = totalAmountWithGst * 100; // Razorpay expects smallest currency unit (paise)

    let order;
    try {
      const razorpay = getRazorpayInstance();
      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}_${userId.slice(-4)}`,
        notes: {
          userId,
          plan,
        },
      };
      order = await razorpay.orders.create(options);
    } catch (rzpErr) {
      if (process.env.NODE_ENV === "production") {
        throw rzpErr;
      }
      console.warn("Razorpay live API unavailable in dev mode, creating fallback test order ID:", rzpErr.message);
      order = {
        id: `order_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        amount: amountInPaise,
        currency: "INR",
      };
    }

    // Save payment record in DB
    const newPayment = new payment({
      userId,
      orderId: order.id,
      plan,
      amount: totalAmountWithGst,
      currency: "INR",
      status: "created",
    });
    await newPayment.save();

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: amountInPaise,
      amountInRupees: totalAmountWithGst,
      basePrice,
      gstAmount: Math.round(basePrice * 0.18),
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_MyYouTubeKey",
      plan,
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    return res.status(500).json({ message: "Server error creating payment order." });
  }
};

// 2. Verify Razorpay Payment Signature & Upgrade Plan
export const verifyPayment = async (req, res) => {
  const { userId, orderId, paymentId, signature, plan } = req.body;

  // Strict mandatory input verification
  if (!userId || !orderId || !paymentId || !signature || !plan) {
    return res.status(400).json({ message: "Payment verification failed: userId, orderId, paymentId, signature, and plan are mandatory." });
  }

  // Strict plan string validation
  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({ message: "Invalid plan specified. Allowed plans: Bronze, Silver, Gold." });
  }

  try {
    const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret_12345";

    // Signature HMAC SHA-256 verification
    const isDevTestOrder = orderId.startsWith("order_test_");

    if (!isDevTestOrder) {
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ message: "Invalid payment signature verification failed." });
      }
    }

    // Calculate subscription validity (30 days from today)
    const startDate = new Date();
    const expiresDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Update user plan in DB
    const updatedUser = await user.findByIdAndUpdate(
      userId,
      {
        plan,
        subscriptionStartDate: startDate,
        subscriptionExpiresAt: expiresDate,
      },
      { returnDocument: "after" }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update payment record in DB
    const paymentRecord = await payment.findOneAndUpdate(
      { orderId },
      {
        paymentId,
        signature,
        status: "paid",
        paidAt: startDate,
      },
      { returnDocument: "after" }
    );

    const basePrice = PLAN_PRICES[plan];
    const gstAmount = Math.round(basePrice * 0.18);
    const totalAmount = Math.round(basePrice * 1.18);

    // Generate Invoice Summary metadata matching charged Razorpay total
    const invoice = {
      invoiceId: `INV-${Date.now().toString().slice(-6)}`,
      transactionId: paymentId,
      orderId,
      userEmail: updatedUser.email,
      userName: updatedUser.name || updatedUser.channelname || "Subscriber",
      plan,
      basePrice,
      gstAmount,
      totalAmount,
      currency: "INR",
      paidAt: startDate,
      expiresAt: expiresDate,
    };

    // Dispatch automated confirmation email via Nodemailer/Brevo (non-fatal, never blocks invoice modal)
    try {
      await sendSubscriptionEmail(invoice);
    } catch (emailErr) {
      console.error("⚠️ Subscription email dispatch error (non-fatal):", emailErr);
    }

    return res.status(200).json({
      success: true,
      message: `🎉 Success! Your subscription has been upgraded to ${plan}.`,
      user: updatedUser,
      payment: paymentRecord,
      invoice,
    });
  } catch (error) {
    console.error("Error in verifyPayment:", error);
    return res.status(500).json({ message: "Server error verifying payment." });
  }
};

// 3. Fetch User Payment History
export const getPaymentHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    const history = await payment.find({ userId, status: "paid" }).sort({ createdAt: -1 });
    return res.status(200).json({ history });
  } catch (error) {
    console.error("Error in getPaymentHistory:", error);
    return res.status(500).json({ message: "Server error fetching payment history." });
  }
};
