import { Bell, Menu, Mic, Search, User, VideoIcon, ArrowLeft, Sun, Moon } from "lucide-react";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";

const Header = () => {
  const { user, logout, handlegooglesignin, toggleSidebar, theme, toggleTheme } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const handleHeaderWatchPartyClick = () => {
    if (user) {
      router.push("/watch-party");
    } else {
      handlegooglesignin();
    }
  };

  if (isMobileSearchOpen) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 h-14 text-zinc-900 dark:text-zinc-100 transition-colors">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => setIsMobileSearchOpen(false)}
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
        </Button>
        <form
          action="/search"
          method="GET"
          className="flex items-center gap-2 flex-1"
        >
          <div className="flex flex-1 max-w-[600px] h-10">
            <Input
              name="q"
              type="search"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-l-full border border-gray-300 dark:border-zinc-700 border-r-0 focus-visible:ring-0 w-full h-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
              autoFocus
            />
            <Button
              type="submit"
              className="rounded-r-full px-5 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 border border-gray-300 dark:border-zinc-700 border-l-0 h-full flex items-center justify-center"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 h-14 text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <Menu className="w-6 h-6 text-zinc-800 dark:text-zinc-200" />
        </Button>
        <Link href="/" className="flex items-center gap-1.5 focus:outline-none select-none">
          <div className="flex items-center">
            <svg height="20" viewBox="0 0 28 20" width="28" className="flex-shrink-0">
              <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2192 0 14 0 14 0C14 0 4.7808 0 2.55319 0.597366C1.32318 0.926623 0.356573 1.89323 0.027316 3.12324C0 5.35085 0 10 0 10C0 10 0 14.6491 0.027316 16.8768C0.356573 18.1068 1.32318 19.0734 2.55319 19.4026C4.7808 20 14 20 14 20C14 20 23.2192 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28 14.6491 28 10 28 10C28 10 28 5.35085 27.9727 3.12324Z" fill="#FF0000"/>
              <path d="M11.2 14.2857L18.4 10L11.2 5.71429V14.2857Z" fill="#FFFFFF"/>
            </svg>
          </div>
          <div className="flex items-start">
            <span className="font-bold text-xl tracking-tighter text-zinc-900 dark:text-white font-sans leading-none">
              YouTube
            </span>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 font-sans ml-1 -mt-1 select-none">
              IN
            </span>
          </div>
        </Link>
      </div>

      <form
        action="/search"
        method="GET"
        className="hidden md:flex items-center gap-2 flex-1 max-w-[720px] mx-4"
      >
        <div className="flex flex-1 h-10">
          <Input
            name="q"
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border border-gray-300 dark:border-zinc-700 border-r-0 focus-visible:ring-0 w-full h-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm px-4"
          />
          <Button
            type="submit"
            className="rounded-r-full px-6 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border border-gray-300 dark:border-zinc-700 border-l-0 h-full flex items-center justify-center cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0">
          <Mic className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
        </Button>
      </form>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => setIsMobileSearchOpen(true)}
        >
          <Search className="w-5 h-5 text-gray-600 dark:text-zinc-400" />
        </Button>

        {user ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-zinc-700" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              onClick={handleHeaderWatchPartyClick}
              title="Watch Party"
            >
              <VideoIcon className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Bell className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-8 w-8 rounded-full flex items-center justify-center focus:outline-none hover:opacity-90 transition-opacity cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image} />
                  <AvatarFallback className="bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-300/50 dark:border-zinc-700/50">{user.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xl animate-in slide-in-from-top-2 duration-200" align="end">
                {user?.channelname ? (
                  <DropdownMenuItem 
                    className="cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => router.push(`/channel/${user?._id}`)}
                  >
                    Your channel
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                      onClick={() => setisdialogeopen(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => router.push("/history")}
                >
                  History
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => router.push("/liked")}
                >
                  Liked videos
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  onClick={() => router.push("/watch-later")}
                >
                  Watch later
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-zinc-800" />
                <DropdownMenuItem 
                  className="cursor-pointer font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  onClick={logout}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              onClick={toggleTheme}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-zinc-700" />
              )}
            </Button>
            <Button
              className="flex items-center gap-2 rounded-full px-5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold transition-all cursor-pointer shadow-md"
              onClick={handlegooglesignin}
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </Button>
          </div>
        )}
      </div>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </header>
  );
};

export default Header;
