import React from "react";
import DownloadsContent from "@/components/DownloadsContent";
import Head from "next/head";

export default function DownloadsPage() {
  return (
    <>
      <Head>
        <title>Downloads - YouTube</title>
        <meta name="description" content="View and manage your offline downloaded videos and daily plan quota." />
      </Head>
      <div className="flex-1 min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <DownloadsContent />
      </div>
    </>
  );
}
