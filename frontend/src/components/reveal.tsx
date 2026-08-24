"use client";

import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
};

export function Reveal({ children, className = "" }: RevealProps) {
  return (
    <div className={`transition-opacity duration-500 ease-out ${className}`}>
      {children}
    </div>
  );
}

export function FloatLayer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      {children}
    </div>
  );
}


