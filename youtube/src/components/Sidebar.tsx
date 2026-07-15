"use client";
import React, { useState } from "react";
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
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

const Sidebar = () => {
  const { user, isSidebarCollapsed, toggleSidebar } = useUser();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  // Dynamic wrapper classes:
  // Desktop: toggle between w-64 and w-16
  // Mobile: toggle between w-64 block fixed drawer and hidden
  const sidebarClasses = isSidebarCollapsed
    ? "hidden md:block md:w-16 bg-white border-r min-h-screen transition-all duration-300 p-2 flex-shrink-0"
    : "w-64 block fixed md:relative left-0 top-14 md:top-0 z-50 md:z-0 h-[calc(100vh-56px)] md:h-auto md:min-h-screen bg-white shadow-lg md:shadow-none border-r transition-all duration-300 p-2 flex-shrink-0";

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
              variant="ghost"
              className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
            >
              <Home className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
              {!isSidebarCollapsed && <span>Home</span>}
            </Button>
          </Link>
          <Link href="/explore">
            <Button
              variant="ghost"
              className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
            >
              <Compass className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
              {!isSidebarCollapsed && <span>Explore</span>}
            </Button>
          </Link>
          <Link href="/subscriptions">
            <Button
              variant="ghost"
              className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
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
                    variant="ghost"
                    className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
                  >
                    <History className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>History</span>}
                  </Button>
                </Link>
                <Link href="/liked">
                  <Button
                    variant="ghost"
                    className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
                  >
                    <ThumbsUp className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>Liked videos</span>}
                  </Button>
                </Link>
                <Link href="/watch-later">
                  <Button
                    variant="ghost"
                    className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
                  >
                    <Clock className={`w-5 h-5 ${isSidebarCollapsed ? "" : "mr-3"}`} />
                    {!isSidebarCollapsed && <span>Watch later</span>}
                  </Button>
                </Link>
                {user?.channelname ? (
                  <Link href={`/channel/${user._id}`}>
                    <Button
                      variant="ghost"
                      className={`w-full ${isSidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
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
