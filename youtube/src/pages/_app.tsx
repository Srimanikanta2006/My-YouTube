import "@/styles/globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { AuthProvider, useUser } from "@/lib/AuthContext";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

function Layout({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed } = useUser();
  const router = useRouter();
  
  // Detect if the user is inside an active Watch Party room (has room query)
  const isWatchPartyRoom = router.pathname === "/watch-party" && router.query.room;

  if (isWatchPartyRoom) {
    return (
      <div className="min-h-screen bg-gray-950 text-white w-full overflow-hidden">
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        </Head>
        <main className="w-full h-screen p-0 flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pt-14 w-full overflow-x-hidden transition-colors duration-200">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <Header />
      <div className="flex w-full overflow-x-hidden">
        <Sidebar />
        <main className={`flex-1 min-w-0 p-4 transition-all duration-200 ${
          isSidebarCollapsed ? "md:pl-[80px]" : "md:pl-[272px]"
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
}

import OtpModal from "@/components/OtpModal";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && (event.reason.isAxiosError || event.reason.name === "AxiosError")) {
        console.warn("Caught unhandled Axios rejection globally:", event.reason);
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
        <OtpModal />
      </Layout>
    </AuthProvider>
  );
}
