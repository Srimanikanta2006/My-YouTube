import React, { useState } from "react";

const tabs = [
  { id: "home", label: "Home" },
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
  { id: "playlists", label: "Playlists" },
  { id: "community", label: "Community" },
  { id: "about", label: "About" },
];

interface ChannelTabsProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const Channeltabs = ({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }: ChannelTabsProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState("videos");
  
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = propSetActiveTab !== undefined ? propSetActiveTab : setInternalActiveTab;

  return (
    <div className="w-full">
      <div className="flex gap-8 overflow-x-auto scrollbar-none border-b border-gray-200 dark:border-zinc-800 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-3.5 text-sm transition-all outline-none focus:outline-none focus:ring-0 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "text-zinc-900 dark:text-white font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium"
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-white rounded-full animate-in fade-in zoom-in-95 duration-150" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Channeltabs;
