"use client";

import React from "react";
import { useUser } from "@/lib/AuthContext";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function AuthLoadingOverlay() {
  const { isAuthLoading, authLoadingMessage } = useUser();

  if (!isAuthLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm p-6 sm:p-8 relative shadow-2xl flex flex-col items-center text-center space-y-4 text-zinc-900 dark:text-white animate-in zoom-in-95 duration-200">
        
        {/* Animated Brand Shield Icon Container */}
        <div className="relative w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-500 shadow-md">
          <ShieldCheck className="w-8 h-8 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-red-500/40 border-t-red-600 animate-spin" />
        </div>

        {/* Status Text & Message */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            Authenticating...
          </h3>
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{authLoadingMessage || "Verifying security & location..."}</span>
          </p>
        </div>

        {/* Security Progress Helper Text */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-xl p-3 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed border border-zinc-200/60 dark:border-zinc-700/60">
          🔒 Checking device location and security credentials. Please wait a moment...
        </div>
      </div>
    </div>
  );
}
