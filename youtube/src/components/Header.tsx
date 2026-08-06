import { Bell, Menu, Mic, Search, User, VideoIcon, ArrowLeft, Sun, Moon, Clock, X, Loader2 } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
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
import NotificationBell from "./NotificationBell";
import VoiceSearchModal from "./VoiceSearchModal";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const Header = () => {
  const { user, logout, handlegooglesignin, toggleSidebar, theme, toggleTheme } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Search History & Live Suggestions
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const historyKey = `searchHistory_${user?._id || "guest"}`;

  // Sync searchQuery with router query parameter
  useEffect(() => {
    if (router.isReady && router.query.q) {
      setSearchQuery(String(router.query.q));
    }
  }, [router.isReady, router.query.q]);

  // Load Search History on mount/user change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(historyKey);
      if (stored) {
        try {
          setSearchHistory(JSON.parse(stored));
        } catch (e) {
          setSearchHistory([]);
        }
      }
    }
  }, [historyKey]);

  // Save term to Search History (newest first, no duplicates)
  const saveToSearchHistory = (term: string) => {
    const cleaned = term.trim().replace(/\s+/g, " ");
    if (!cleaned) return;
    if (typeof window !== "undefined") {
      const existing = JSON.parse(localStorage.getItem(historyKey) || "[]");
      const updated = [cleaned, ...existing.filter((item: string) => item.toLowerCase() !== cleaned.toLowerCase())].slice(0, 10);
      setSearchHistory(updated);
      localStorage.setItem(historyKey, JSON.stringify(updated));
    }
  };

  // Remove individual term from Search History
  const removeFromSearchHistory = (e: React.MouseEvent, termToRemove: string) => {
    e.stopPropagation();
    const updated = searchHistory.filter((item) => item !== termToRemove);
    setSearchHistory(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(historyKey, JSON.stringify(updated));
    }
  };

  // 300ms Debounced Suggestions Fetching
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        if (Array.isArray(res.data)) {
          const qLower = searchQuery.trim().toLowerCase();
          const matchedTitles = new Set<string>();

          res.data.forEach((vid: any) => {
            if (vid.videotitle && vid.videotitle.toLowerCase().includes(qLower)) {
              matchedTitles.add(vid.videotitle);
            }
            if (vid.videochanel && vid.videochanel.toLowerCase().includes(qLower)) {
              matchedTitles.add(vid.videochanel);
            }
          });

          setSuggestions(Array.from(matchedTitles).slice(0, 8));
        }
      } catch (err) {
        console.error("Suggestions error:", err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePerformSearch = (queryStr: string) => {
    const sanitized = queryStr.trim().replace(/\s+/g, " ");
    if (!sanitized) return; // Do nothing if search box is empty!

    saveToSearchHistory(sanitized);
    setSearchQuery(sanitized);
    setIsFocused(false);
    setIsMobileSearchOpen(false);
    setIsVoiceModalOpen(false);

    router.push(`/search?q=${encodeURIComponent(sanitized)}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePerformSearch(searchQuery);
  };

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
        <div ref={searchContainerRef} className="flex-1 relative">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2 flex-1">
            <div className="flex flex-1 max-w-[600px] h-10 items-center">
              <div className="relative flex-1 h-10 flex items-center">
                <Input
                  name="q"
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onFocus={() => setIsFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`rounded-l-full border border-r-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm pl-4 pr-10 transition-all duration-200 ${
                    isFocused
                      ? "border-zinc-400 dark:border-zinc-500 shadow-sm"
                      : "border-gray-300 dark:border-zinc-700"
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                className={`rounded-r-full px-5 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300 border border-l-0 h-10 flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 ${
                  isFocused
                    ? "border-zinc-400 dark:border-zinc-500 shadow-sm"
                    : "border-gray-300 dark:border-zinc-700"
                }`}
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsVoiceModalOpen(true)}
              className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 flex-shrink-0 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 cursor-pointer active:scale-95 transition-all duration-200"
              title="Search with your voice"
            >
              <Mic className="w-5 h-5" />
            </Button>
          </form>

          {/* Search Dropdown Modal for Mobile */}
          {isFocused && (searchQuery.trim() || searchHistory.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-sm">
              {searchQuery.trim() ? (
                /* Live Suggestions */
                isLoadingSuggestions ? (
                  <div className="p-4 flex items-center justify-center text-zinc-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Loading suggestions...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handlePerformSearch(item)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-800 dark:text-zinc-200 font-medium"
                    >
                      <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-zinc-400 text-center">Press Enter to search "{searchQuery}"</div>
                )
              ) : (
                /* Recent Search History */
                searchHistory.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Recent Searches
                    </div>
                    {searchHistory.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handlePerformSearch(item)}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-800 dark:text-zinc-200 font-medium"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="truncate">{item}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => removeFromSearchHistory(e, item)}
                          className="text-xs text-blue-600 hover:text-red-600 font-bold px-2 py-0.5"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <VoiceSearchModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onSearch={handlePerformSearch}
        />
      </header>
    );
  }

  return (
    <>
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

        {/* Desktop Search Section */}
        <div ref={searchContainerRef} className="hidden md:flex relative flex-1 max-w-[720px] mx-4">
          <form
            onSubmit={handleFormSubmit}
            className="flex items-center gap-2 w-full"
          >
            <div className="flex flex-1 h-10 items-center">
              <div className="relative flex-1 h-10 flex items-center">
                <Input
                  name="q"
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onFocus={() => setIsFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`rounded-l-full border border-r-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm pl-4 pr-10 transition-all duration-200 ${
                    isFocused
                      ? "border-zinc-400 dark:border-zinc-500 shadow-sm"
                      : "border-gray-300 dark:border-zinc-700"
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                className={`rounded-r-full px-6 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border border-l-0 h-10 flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 ${
                  isFocused
                    ? "border-zinc-400 dark:border-zinc-500 shadow-sm"
                    : "border-gray-300 dark:border-zinc-700"
                }`}
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsVoiceModalOpen(true)}
              className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 flex-shrink-0 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 cursor-pointer active:scale-95 transition-all duration-200"
              title="Search with your voice"
            >
              <Mic className="w-5 h-5" />
            </Button>
          </form>

          {/* Search Dropdown Modal for Desktop */}
          {isFocused && (searchQuery.trim() || searchHistory.length > 0) && (
            <div className="absolute top-full left-0 right-14 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-150">
              {searchQuery.trim() ? (
                /* Live Suggestions */
                isLoadingSuggestions ? (
                  <div className="p-4 flex items-center justify-center text-zinc-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2 text-red-600" />
                    <span>Fetching suggestions...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handlePerformSearch(item)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-800 dark:text-zinc-200 font-medium transition-colors"
                    >
                      <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-zinc-400 text-center">Press Enter to search "{searchQuery}"</div>
                )
              ) : (
                /* Recent Search History */
                searchHistory.length > 0 && (
                  <div className="py-2">
                    <div className="px-4 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Recent Searches
                    </div>
                    {searchHistory.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handlePerformSearch(item)}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-800 dark:text-zinc-200 font-medium transition-colors"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="truncate">{item}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => removeFromSearchHistory(e, item)}
                          className="text-xs text-blue-600 hover:text-red-600 font-bold px-2 py-0.5 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {/* Default Mobile View: Search Icon only */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            onClick={() => setIsMobileSearchOpen(true)}
            title="Search"
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
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-8 w-8 rounded-full flex items-center justify-center focus:outline-none hover:opacity-90 transition-opacity cursor-pointer">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback className="bg-red-600 text-white font-bold text-xs">
                      {(user.name || user.channelname || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.name && <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{user.name}</p>}
                      {user.email && (
                        <p className="w-[200px] truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-zinc-800" />
                  <DropdownMenuItem 
                    className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => {
                      if (user?.channelname) {
                        router.push(`/channel/${user._id}`);
                      } else {
                        setisdialogeopen(true);
                      }
                    }}
                  >
                    {user?.channelname ? "Your Channel" : "Create Channel"}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={() => router.push("/membership")}
                  >
                    Purchases and Memberships
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

        <VoiceSearchModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onSearch={handlePerformSearch}
        />
      </header>
    </>
  );
};

export default Header;
