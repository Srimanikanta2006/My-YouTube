import { Bell, Menu, Mic, Search, User, VideoIcon, ArrowLeft } from "lucide-react";
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
  const { user, logout, handlegooglesignin, toggleSidebar } = useUser();
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
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-4 py-2 bg-white border-b h-14">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setIsMobileSearchOpen(false)}
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
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
              className="rounded-l-full border border-gray-300 border-r-0 focus-visible:ring-0 w-full h-full bg-white text-sm"
              autoFocus
            />
            <Button
              type="submit"
              className="rounded-r-full px-5 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-300 border-l-0 h-full flex items-center justify-center"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-white border-b h-14">
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="w-6 h-6" />
        </Button>
        <Link href="/" className="flex items-center gap-1">
          <div className="bg-red-600 p-1 rounded">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-xl font-medium">YouTube</span>
          <span className="text-xs text-gray-400 ml-1 hidden sm:block">IN</span>
        </Link>
      </div>

      <form
        action="/search"
        method="GET"
        className="hidden sm:flex items-center gap-2 flex-1 max-w-2xl mx-4"
      >
        <div className="flex flex-1 h-10">
          <Input
            name="q"
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border border-gray-300 border-r-0 focus-visible:ring-0 w-full h-full bg-white text-sm"
          />
          <Button
            type="submit"
            className="rounded-r-full px-6 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-300 border-l-0 h-full flex items-center justify-center"
          >
            <Search className="w-5 h-5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Mic className="w-5 h-5" />
        </Button>
      </form>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden rounded-full"
          onClick={() => setIsMobileSearchOpen(true)}
        >
          <Search className="w-5 h-5 text-gray-600" />
        </Button>

        {user ? (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
              onClick={handleHeaderWatchPartyClick}
              title="Watch Party"
            >
              <VideoIcon className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="w-6 h-6" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-8 w-8 rounded-full flex items-center justify-center focus:outline-none hover:opacity-90 transition-opacity cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.image} />
                  <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 animate-in slide-in-from-top-2 duration-200" align="end">
                {user?.channelname ? (
                  <DropdownMenuItem 
                    className="cursor-pointer font-medium hover:bg-gray-100 transition-colors"
                    onClick={() => router.push(`/channel/${user?._id}`)}
                  >
                    Your channel
                  </DropdownMenuItem>
                ) : (
                  <div className="px-2 py-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full font-bold"
                      onClick={() => setisdialogeopen(true)}
                    >
                      Create Channel
                    </Button>
                  </div>
                )}
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => router.push("/history")}
                >
                  History
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => router.push("/liked")}
                >
                  Liked videos
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => router.push("/watch-later")}
                >
                  Watch later
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer text-red-600 focus:text-red-700 hover:bg-red-50 transition-colors"
                  onClick={logout}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button
              className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-1.5"
              onClick={handlegooglesignin}
            >
              <User className="w-4 h-4" />
              Sign in
            </Button>
          </>
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
