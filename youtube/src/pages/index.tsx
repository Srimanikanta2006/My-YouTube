import React, { Suspense } from "react";
import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";

export default function Home() {
  return (
    <div>
      <CategoryTabs />
      <Suspense fallback={<div>Loading videos...</div>}>
        <Videogrid />
      </Suspense>
    </div>
  );
}
