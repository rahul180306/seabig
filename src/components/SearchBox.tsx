"use client";
import React from "react";

type Props = Readonly<{
  placeholder?: string;
  className?: string;
}>;

export default function SearchBox({ placeholder = "Search", className }: Props) {
  return (
  <div className={`flex items-center gap-2.5 rounded-full border border-white/15 bg-black/40 backdrop-blur-lg px-5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.35)] text-white ${className ?? ""}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    className="opacity-80"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
  className="bg-transparent placeholder-white/70 focus:outline-none text-base min-w-[220px] text-white"
      />
    </div>
  );
}
