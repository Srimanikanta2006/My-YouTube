"use client";

import React, { useState, useRef, useEffect } from "react";
import { useUser } from "@/lib/AuthContext";
import { ShieldAlert, KeyRound, ArrowRight, RefreshCw, X, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";

export default function OtpModal() {
  const { otpData, setOtpData, verifyLoginOtp, resendLoginOtp } = useUser();
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (otpData) {
      setOtpValues(Array(6).fill(""));
      setErrorMsg("");
      setSuccessMsg("");
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [otpData]);

  if (!otpData || !otpData.required) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);
    setErrorMsg("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) {
      setErrorMsg("Please paste a valid 6-digit numeric OTP code.");
      return;
    }
    const digits = pasted.split("");
    setOtpValues(digits);
    inputRefs.current[5]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpValues.join("");
    if (fullOtp.length < 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }

    try {
      setIsVerifying(true);
      setErrorMsg("");
      const res = await verifyLoginOtp(fullOtp);
      if (!res.success) {
        setErrorMsg(res.message || "Invalid OTP code.");
      }
    } catch (err: any) {
      setErrorMsg("Error verifying OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      setErrorMsg("");
      setSuccessMsg("");
      const res = await resendLoginOtp();
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg("Failed to resend OTP.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl space-y-6 text-zinc-900 dark:text-white">
        <button
          onClick={() => setOtpData(null)}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full p-1.5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Security Shield Header */}
        <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Security Verification</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">New Location or Device Detected</p>
          </div>
        </div>

        {/* Details Box */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            For account protection, we sent a 6-digit OTP code to your registered email:
          </p>
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs space-y-1">
            <p className="font-bold text-amber-900 dark:text-amber-300 truncate">
              ✉️ {otpData.email}
            </p>
            {otpData.locationInfo && (
              <p className="text-[11px] text-amber-800 dark:text-amber-400 font-mono">
                📍 {otpData.locationInfo.city}, {otpData.locationInfo.state} ({otpData.locationInfo.device})
              </p>
            )}
          </div>
        </div>

        {/* 6-Digit OTP Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {otpValues.map((val, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                maxLength={1}
                value={val}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 outline-none transition-all"
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/50 p-2.5 rounded-lg border border-red-200 dark:border-red-900 text-center animate-in fade-in">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 p-2.5 rounded-lg border border-green-200 dark:border-green-900 text-center animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isVerifying || otpValues.join("").length < 6}
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl shadow-lg transition-transform hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <span>Verifying OTP...</span>
            ) : (
              <>
                <span>Complete Security Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Resend Link */}
        <div className="text-center border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-xs font-bold text-amber-600 hover:text-amber-500 dark:text-amber-400 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`} />
            <span>Didn't receive code? Resend OTP</span>
          </button>
        </div>
      </div>
    </div>
  );
}
