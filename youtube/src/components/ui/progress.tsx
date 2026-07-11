"use client";

import * as React from "react";

export function Progress({
  value,
  className,
}: {
  value?: number;
  className?: string;
}) {
  return (
    <progress
      value={value}
      max={100}
      className={className}
      aria-label="progress"
    />
  );
}

export default Progress;
