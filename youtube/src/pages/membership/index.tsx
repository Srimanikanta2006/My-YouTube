import React from "react";
import MembershipContent from "@/components/MembershipContent";
import Head from "next/head";

export default function MembershipPage() {
  return (
    <>
      <Head>
        <title>Subscription Plans & Membership - YouTube</title>
        <meta name="description" content="Upgrade to Free, Bronze, Silver, or Gold membership plans using Razorpay test payments." />
      </Head>
      <div className="flex-1 min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <MembershipContent />
      </div>
    </>
  );
}
