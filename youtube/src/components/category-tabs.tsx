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
      {categories.map((category) => (
        <Button
          key={category}
          variant={activeCategory === category ? "default" : "secondary"}
          className="whitespace-nowrap rounded-lg px-4 py-1 text-sm font-medium transition-colors"
          onClick={() => setActiveCategory(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
