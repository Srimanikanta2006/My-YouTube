"use client";
import React, { useState, useEffect } from "react";
import {
  Home,
  Compass,
  PlaySquare,
  Clock,
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

  // Dynamic wrapper classes:
  // Desktop/Mobile: fixed to the left viewport, scrollable internally if overflowing
  const sidebarClasses = isSidebarCollapsed
    ? "hidden md:block md:w-16 fixed left-0 top-14 bottom-0 bg-white border-r p-2 z-40 overflow-y-auto flex-shrink-0 scrollbar-none"
    : "w-64 block fixed left-0 top-14 bottom-0 bg-white shadow-lg md:shadow-none border-r p-2 z-40 overflow-y-auto flex-shrink-0 scrollbar-none";

  // Helper function to check if link is active
  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop overlay */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden top-14"
          onClick={toggleSidebar}
        />
      )}

      <aside className={sidebarClasses}>
        <nav className="space-y-1">
          <Link href="/">
            <Button
              variant={isActive("/") ? "secondary" : "ghost"}
              className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"} ${isActive("/") ? "font-semibold text-black" : "text-gray-700"}`}
            >
              <Home className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
              {!isSidebarCollapsed && <span>Home</span>}
            </Button>
          </Link>
          <Link href="/explore">
            <Button
              variant={isActive("/explore") ? "secondary" : "ghost"}
              className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"} ${isActive("/explore") ? "font-semibold text-black" : "text-gray-700"}`}
            >
              <Compass className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
              {!isSidebarCollapsed && <span>Explore</span>}
            </Button>
          </Link>
          <Link href="/subscriptions">
            <Button
              variant={isActive("/subscriptions") ? "secondary" : "ghost"}
              className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"} ${isActive("/subscriptions") ? "font-semibold text-black" : "text-gray-700"}`}
            >
              <PlaySquare className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
              {!isSidebarCollapsed && <span>Subscriptions</span>}
            </Button>
          </Link>

          {user && (
            <>
              <div className={`border-t pt-2 mt-2 ${isSidebarCollapsed ? "border-gray-200" : ""}`}>
                <Link href="/history">
                  <Button
                    variant={isActive("/history") ? "secondary" : "ghost"}
                    className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"} ${isActive("/history") ? "font-semibold text-black" : "text-gray-700"}`}
                  >
                    <History className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>History</span>}
                  </Button>
                </Link>
                <Link href="/liked">
                  <Button
                    variant={isActive("/liked") ? "secondary" : "ghost"}
                    className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"} ${isActive("/liked") ? "font-semibold text-black" : "text-gray-700"}`}
                  >
                    <ThumbsUp className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>Liked videos</span>}
                  </Button>
                </Link>
                <Link href="/watch-later">
                  <Button
                    variant={isActive("/watch-later") ? "secondary" : "ghost"}
                    className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"} ${isActive("/watch-later") ? "font-semibold text-black" : "text-gray-700"}`}
                  >
                    <Clock className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>Watch later</span>}
                  </Button>
                </Link>
                {user?.channelname ? (
                  <Link href={`/channel/${user._id}`}>
                    <Button
                      variant={isActive(`/channel/${user._id}`) ? "secondary" : "ghost"}
                      className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"} ${isActive(`/channel/${user._id}`) ? "font-semibold text-black" : "text-gray-700"}`}
                    >
                      <User className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                      {!isSidebarCollapsed && <span>Your channel</span>}
                    </Button>
                  </Link>
                ) : (
                  <div className={isSidebarCollapsed ? "px-0 flex justify-center py-2" : "px-2 py-1.5"}>
                    <Button
                      variant="secondary"
                      size="sm"
                      className={isSidebarCollapsed ? "w-10 h-10 p-0 rounded-full flex items-center justify-center" : "w-full"}
                      onClick={() => setisdialogeopen(true)}
                    >
                      {isSidebarCollapsed ? <User className="w-5 h-5" /> : "Create Channel"}
                    </Button>
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
