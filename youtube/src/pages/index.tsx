import React, { Suspense, useState } from "react";
import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  return (
    <div className="w-full overflow-hidden">
      <CategoryTabs activeCategory={selectedCategory} setActiveCategory={setSelectedCategory} />
      <Suspense fallback={<div>Loading videos...</div>}>
        <Videogrid selectedCategory={selectedCategory} />
      </Suspense>
    </div>
  );
}
