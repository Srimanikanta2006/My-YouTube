"use client";
import React, { useState, useEffect } from "react";
import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  Crown,
  Download,
  ThumbsUp,
  History,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

const Sidebar = () => {
  const { user, isSidebarCollapsed, setIsSidebarCollapsed, toggleSidebar } = useUser();
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Automatically close the sidebar drawer on mobile navigations
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      if (setIsSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    }
  }, [pathname]);

  const sidebarClasses = isSidebarCollapsed
    ? "hidden md:block md:w-16 fixed left-0 top-14 bottom-0 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 p-2 z-40 overflow-y-auto flex-shrink-0 scrollbar-none transition-colors"
    : "w-64 block fixed left-0 top-14 bottom-0 bg-white dark:bg-zinc-900 shadow-lg md:shadow-none border-r border-gray-200 dark:border-zinc-800 p-2 z-40 overflow-y-auto flex-shrink-0 scrollbar-none transition-colors";

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  const getButtonClass = (href: string) => {
    const active = isActive(href);
    const base = `w-full transition-colors cursor-pointer ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"}`;
    if (active) {
      return `${base} font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800`;
    }
    return `${base} font-normal text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white`;
  };

  return (
    <>
      {/* Mobile Drawer Backdrop overlay */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden top-14 backdrop-blur-xs"
          onClick={toggleSidebar}
        />
      )}

      <aside className={sidebarClasses}>
        <nav className="space-y-1">
          <Link href="/">
            <Button variant="ghost" className={getButtonClass("/")}>
              <Home className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
              {!isSidebarCollapsed && <span>Home</span>}
            </Button>
          </Link>
          <Link href="/explore">
            <Button variant="ghost" className={getButtonClass("/explore")}>
              <Compass className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
              {!isSidebarCollapsed && <span>Explore</span>}
            </Button>
          </Link>
          <Link href="/subscriptions">
            <Button variant="ghost" className={getButtonClass("/subscriptions")}>
              <PlaySquare className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
              {!isSidebarCollapsed && <span>Subscriptions</span>}
            </Button>
          </Link>

          {user && (
            <>
              <div className={`border-t border-gray-200 dark:border-zinc-800 pt-2 mt-2`}>
                <Link href="/history">
                  <Button variant="ghost" className={getButtonClass("/history")}>
                    <History className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>History</span>}
                  </Button>
                </Link>
                <Link href="/liked">
                  <Button variant="ghost" className={getButtonClass("/liked")}>
                    <ThumbsUp className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>Liked videos</span>}
                  </Button>
                </Link>
                <Link href="/watch-later">
                  <Button variant="ghost" className={getButtonClass("/watch-later")}>
                    <Clock className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>Watch later</span>}
                  </Button>
                </Link>
                <Link href="/downloads">
                  <Button variant="ghost" className={getButtonClass("/downloads")}>
                    <Download className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>Downloads</span>}
                  </Button>
                </Link>
                <Link href="/membership">
                  <Button variant="ghost" className={getButtonClass("/membership")}>
                    <Crown className={`w-5 h-5 text-amber-500 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>Membership Plans</span>}
                  </Button>
                </Link>
                {user?.channelname ? (
                  <Link href={`/channel/${user._id}`}>
                    <Button variant="ghost" className={getButtonClass(`/channel/${user._id}`)}>
                      <User className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                      {!isSidebarCollapsed && <span>Your channel</span>}
                    </Button>
                  </Link>
                ) : (
                  <div className={isSidebarCollapsed ? "px-0 flex justify-center py-2" : "px-2 py-1.5"}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className={isSidebarCollapsed ? "w-10 h-10 p-0 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700" : "w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold"}
                      onClick={() => setisdialogeopen(true)}
                    >
                      {isSidebarCollapsed ? <User className="w-5 h-5" /> : "Create Channel"}
                    </Button>
                  </div>
                )}

                {/* Sidebar Active Plan Badge Card */}
                {!isSidebarCollapsed && (
                  <div className="mt-4 p-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Current Plan</span>
                      <span className="text-xs font-black text-amber-900 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                        {user?.plan || "Free"} {user?.plan && user.plan !== "Free" ? "⭐" : ""}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight">
                      {user?.plan === "Gold"
                        ? "50 Downloads/day • VIP Access"
                        : user?.plan === "Silver"
                        ? "15 Downloads/day • Ad-Free"
                        : user?.plan === "Bronze"
                        ? "5 Downloads/day"
                        : "1 Download/day"}
                    </p>
                    {user?.plan === "Free" && (
                      <Link href="/membership" className="block pt-1">
                        <Button size="sm" className="w-full h-7 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-black rounded-xl cursor-pointer">
                          Upgrade Plan
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
        <Channeldialogue
          isopen={isdialogeopen}
          onclose={() => setisdialogeopen(false)}
          mode="create"
        />
      </aside>
    </>
  );
};

export default Sidebar;
