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
      <div className="flex gap-8 overflow-x-auto scrollbar-none border-b border-gray-100 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative py-3.5 text-sm font-semibold transition-all outline-none focus:outline-none focus:ring-0 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "text-gray-900 font-bold"
                  : "text-gray-500 hover:text-gray-800 font-medium"
              }`}
            >
              <span>{tab.label}</span>
              {/* Sleek YouTube-style active bottom indicator bar */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full animate-in fade-in zoom-in-95 duration-150" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Channeltabs;
