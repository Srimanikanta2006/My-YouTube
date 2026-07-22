"use client";

import React from "react";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { useUser } from "../lib/AuthContext";
import Link from "next/link";
import { Button } from "./ui/button";

export default function Advertisement() {
  const { user, handlegooglesignin } = useUser();

  // Ad-Free Perk: Hide advertisement banner for Silver & Gold subscribers!
  if (user?.plan === "Silver" || user?.plan === "Gold") {
    return null;
  }

  return (
    <div className="my-4 bg-gradient-to-r from-zinc-900 via-amber-950 to-zinc-900 text-white rounded-2xl p-4 md:p-5 shadow-md border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group">
      <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-1 text-center md:text-left z-10">
        <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
          <span>📢 ADVERTISEMENT</span>
        </div>
        <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
          Master Full-Stack Web Development with React & Node.js!
        </h3>
        <p className="text-xs text-gray-300">
          Build production-ready apps. <span className="text-amber-400 font-semibold">Upgrade to Silver or Gold to remove all platform ads!</span>
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 z-10 w-full md:w-auto">
        {!user ? (
          <Button
            size="sm"
            onClick={handlegooglesignin}
            className="w-full md:w-auto bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl px-4 text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sign In to Remove Ads</span>
          </Button>
        ) : (
          <Link href="/membership" className="w-full md:w-auto">
            <Button
              size="sm"
              className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl px-4 text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Remove Ads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
