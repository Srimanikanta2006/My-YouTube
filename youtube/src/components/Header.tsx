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
        <Link href="/" className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="font-extrabold text-xl tracking-tighter text-zinc-900 dark:text-white">YouTube</span>
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
