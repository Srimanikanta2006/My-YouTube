"use client";

import React, { useEffect, useState } from "react";
import { Crown, Check, Sparkles, ShieldCheck, Download, Zap, Printer, X, CreditCard } from "lucide-react";
import { useUser } from "../lib/AuthContext";
import axiosInstance from "../lib/axiosinstance";
import { Button } from "./ui/button";
import Head from "next/head";
import emailjs from "@emailjs/browser";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlanTier {
  name: string;
  price: number;
  badge?: string;
  color: string;
  downloadsLimit: string;
  features: string[];
  recommended?: boolean;
}

const PLANS: PlanTier[] = [
  {
    name: "Free",
    price: 0,
    color: "border-gray-200 bg-white",
    downloadsLimit: "1 download / day",
    features: [
      "Standard Video Watching",
      "1 Video Download Per 24 Hours",
      "Standard Resolution",
      "Contains Platform Ads",
    ],
  },
  {
    name: "Bronze",
    price: 99,
    badge: "Popular Starter",
    color: "border-amber-600/40 bg-gradient-to-b from-amber-500/5 to-white",
    downloadsLimit: "5 downloads / day",
    features: [
      "Everything in Free",
      "5 Video Downloads Per Day",
      "Access to Selected Premium Videos",
      "Faster Stream Buffering",
    ],
  },
  {
    name: "Silver",
    price: 199,
    badge: "Best Value",
    recommended: true,
    color: "border-slate-400 bg-gradient-to-b from-slate-200/20 via-white to-white shadow-lg ring-2 ring-slate-400",
    downloadsLimit: "15 downloads / day",
    features: [
      "15 Video Downloads Per Day",
      "Full Ad-Free Viewing Experience",
      "Access All Premium Exclusive Content",
      "HD Quality Stream Output",
      "Priority Customer Support",
    ],
  },
  {
    name: "Gold",
    price: 499,
    badge: "VIP Creator Access",
    color: "border-amber-400 bg-gradient-to-b from-amber-400/20 via-amber-500/5 to-white shadow-xl ring-2 ring-amber-400",
    downloadsLimit: "50 downloads / day",
    features: [
      "50 Video Downloads Per Day",
      "VIP Golden Account Profile Badge",
      "Ad-Free & Unlimited Premium Access",
      "Ultra HD 4K Content Playback",
      "Early Access to Beta Features",
    ],
  },
];

export default function MembershipContent() {
  const { user, updateUserData, login } = useUser();
  const [currentPlan, setCurrentPlan] = useState<string>("Free");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    // Inject Razorpay checkout.js script
    if (typeof window !== "undefined" && !document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }

    if (user?.plan) {
      setCurrentPlan(user.plan);
    }
  }, [user]);

  const handleSelectPlan = async (plan: PlanTier) => {
    if (!user?._id) {
      showToast("Please sign in to select a membership plan.");
      return;
    }

    if (plan.name === currentPlan) {
      showToast(`You are already subscribed to the ${plan.name} plan!`);
      return;
    }

    if (plan.price === 0) {
      // Free Plan downgrade request
      try {
        setLoadingPlan(plan.name);
        await axiosInstance.patch("/download/plan", {
          userId: user._id,
          plan: "Free",
        });
        setCurrentPlan("Free");
        showToast("Switched to Free plan.");
      } catch (err) {
        console.error("Error switching plan:", err);
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    // Paid Plan Checkout Flow (Razorpay)
    try {
      setLoadingPlan(plan.name);

      // 1. Create Razorpay order on backend
      const orderRes = await axiosInstance.post("/payment/create-order", {
        userId: user._id,
        plan: plan.name,
      });

      const { orderId, amount, currency, keyId } = orderRes.data;

      // Helper function to complete verification
      const completeVerification = async (paymentId: string, signature: string) => {
        const verifyRes = await axiosInstance.post("/payment/verify", {
          userId: user._id,
          orderId,
          paymentId,
          signature,
          plan: plan.name,
        });

        if (verifyRes.data.user) {
          if (updateUserData) {
            updateUserData(verifyRes.data.user);
          } else if (login) {
            login(verifyRes.data.user);
          }
        }

        // Send confirmation email directly to the signed-in user via EmailJS!
        if (user?.email) {
          const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_default";
          const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_subscription";
          const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "YOUR_PUBLIC_KEY";

          const templateParams = {
            to_name: user.name || user.channelname || "Subscriber",
            to_email: user.email,
            user_email: user.email,
            email: user.email,
            send_to: user.email,
            recipient: user.email,
            plan_name: plan.name,
            amount_paid: verifyRes.data.invoice?.totalAmount || plan.price,
            payment_id: paymentId,
            order_id: orderId,
            date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
            downloads_limit: plan.name === "Gold" ? "50" : plan.name === "Silver" ? "15" : "5",
          };

          emailjs.send(serviceId, templateId, templateParams, publicKey)
            .then((res) => {
              console.log("✉️ EmailJS Email dispatched successfully to:", user.email, res.status);
            })
            .catch((err) => {
              console.log("EmailJS note:", err);
            });
        }

        setCurrentPlan(plan.name);
        setInvoice(verifyRes.data.invoice);
        setShowInvoiceModal(true);
      };

      // 2. Open Official Razorpay Checkout Modal
      if (typeof window !== "undefined" && window.Razorpay) {
        const options = {
          key: keyId,
          amount,
          currency,
          name: "My YouTube Premium",
          description: `${plan.name} Membership Plan Subscription`,
          order_id: orderId,
          handler: async function (response: any) {
            await completeVerification(response.razorpay_payment_id, response.razorpay_signature);
          },
          prefill: {
            name: user.name || user.channelname || "Subscriber",
            email: user.email || "user@example.com",
          },
          theme: {
            color: "#D97706",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          alert("Razorpay Payment Failed: " + (response.error?.description || "Payment process cancelled."));
          setLoadingPlan(null);
        });
        rzp.open();
      } else {
        await completeVerification(`pay_test_${Date.now()}`, "simulated_test_sig");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      showToast("Could not process payment. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">
      {/* Header Banner */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 px-4 py-1.5 rounded-full text-xs font-bold border border-amber-300">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Flexible Membership Plans</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
          Unlock Premium YouTube Benefits
        </h1>
        <p className="text-sm md:text-base text-gray-600 leading-relaxed">
          Upgrade to unlock ad-free streaming, premium video access, and up to 50 daily offline downloads with Razorpay test payments.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.name;
          return (
            <div
              key={plan.name}
              className={`rounded-3xl p-6 relative flex flex-col justify-between border transition-all duration-300 ${plan.color}`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-md">
                  {plan.badge}
                </span>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-extrabold text-gray-900">{plan.name}</h3>
                  {isCurrent && (
                    <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-green-300">
                      Active Plan
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl md:text-4xl font-black text-gray-900">
                    ₹{plan.price}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">/ month</span>
                </div>

                <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60 text-xs font-bold text-amber-900 flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{plan.downloadsLimit}</span>
                </div>

                <ul className="space-y-2.5 pt-2 text-xs text-gray-700">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loadingPlan === plan.name || isCurrent}
                  className={`w-full rounded-2xl font-bold text-xs py-5 transition-all shadow-md ${
                    isCurrent
                      ? "bg-gray-200 text-gray-500 hover:bg-gray-200 cursor-not-allowed shadow-none"
                      : plan.recommended
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
                      : "bg-gray-900 hover:bg-black text-white"
                  }`}
                >
                  {loadingPlan === plan.name ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    `Subscribe to ${plan.name}`
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoice Receipt Modal */}
      {showInvoiceModal && invoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-invoice, #printable-invoice * {
                visibility: visible !important;
              }
              #printable-invoice {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 24px !important;
                box-shadow: none !important;
                border: 1px solid #ccc !important;
                background: white !important;
                color: black !important;
              }
              #printable-buttons {
                display: none !important;
              }
            }
          `}</style>
          <div
            id="printable-invoice"
            className="bg-white rounded-3xl w-full max-w-lg p-6 relative shadow-2xl border border-gray-100 space-y-6 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
                <p className="text-xs text-gray-500">Official Subscription Invoice Receipt</p>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-xs border border-gray-200/80">
              <div className="flex justify-between text-gray-500 font-mono">
                <span>Invoice ID:</span>
                <span className="font-bold text-gray-900">{invoice.invoiceId}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-mono">
                <span>Transaction ID:</span>
                <span className="font-bold text-gray-900">{invoice.transactionId}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Subscriber:</span>
                <span className="font-bold text-gray-900">{invoice.userName} ({invoice.userEmail})</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Plan Tier:</span>
                <span className="font-bold text-amber-600">{invoice.plan} Membership</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Validity:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(invoice.paidAt).toLocaleDateString()} - {new Date(invoice.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-sm text-gray-900">
                <span>Total Paid (incl. GST):</span>
                <span className="text-green-700">₹{invoice.totalAmount} INR</span>
              </div>
            </div>

            <div id="printable-buttons" className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl font-bold text-xs border-gray-300"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print / Save PDF
              </Button>
              <Button
                className="flex-1 rounded-xl font-bold text-xs bg-gray-900 hover:bg-black text-white"
                onClick={() => setShowInvoiceModal(false)}
              >
                Close Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
