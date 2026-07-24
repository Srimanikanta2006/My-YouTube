"use client";

import { useState } from "react";
import { Button } from "./ui/button";

const categories = [
  "All",
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

interface CategoryTabsProps {
  activeCategory?: string;
  setActiveCategory?: (category: string) => void;
}

export default function CategoryTabs({
  activeCategory: propActiveCategory,
  setActiveCategory: propSetActiveCategory,
}: CategoryTabsProps) {
  const [internalActiveCategory, setInternalActiveCategory] = useState("All");

  const activeCategory = propActiveCategory !== undefined ? propActiveCategory : internalActiveCategory;
  const setActiveCategory = propSetActiveCategory !== undefined ? propSetActiveCategory : setInternalActiveCategory;

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none w-full max-w-full">
      {categories.map((category) => {
        const isActive = activeCategory === category;
        return (
          <Button
            key={category}
            variant="ghost"
            className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-xs md:text-sm transition-all cursor-pointer ${
              isActive
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow"
                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium"
            }`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </Button>
        );
      })}
    </div>
  );
}
