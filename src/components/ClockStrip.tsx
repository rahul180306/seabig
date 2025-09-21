"use client";
import React from "react";
import Link from "next/link";

type Mode = "12h" | "24h";

function getTimeParts(date: Date, mode: Mode): { core: string; period?: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: mode === "12h",
    timeZone: "Asia/Kolkata",
  });
  const parts = fmt.formatToParts(date);
  const period = parts.find((p) => p.type === "dayPeriod")?.value.toUpperCase();
  const core = parts
    .filter((p) => p.type !== "dayPeriod")
    .map((p) => p.value)
    .join("")
    .trim();
  return { core, period };
}

function formatDateLine(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default function ClockStrip() {
  const [mode, setMode] = React.useState<Mode>("12h");
  // Start with null so server and initial client render match (prevents hydration mismatch).
  const [now, setNow] = React.useState<Date | null>(null);
  const mountedRef = React.useRef(false);

  React.useEffect(() => {
    mountedRef.current = true;
    // Initialize time immediately on mount and update every second.
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(id);
      mountedRef.current = false;
    };
  }, []);

  const { core: time, period } = now ? getTimeParts(now, mode) : { core: '00:00:00', period: undefined };
  const dateLine = now ? formatDateLine(now) : '';

  return (
    <div className="w-full">
      <div className="w-full">
  <div className="relative w-full bg-transparent px-3 sm:px-6 py-3 sm:py-4 border-b border-black/10">
          {/* Mode toggle - right edge, vertically centered */}
          <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10">
            <div className="flex items-center rounded-full bg-white/70 ring-1 ring-black/10 p-1 shadow-sm">
              <button
                type="button"
                aria-pressed={mode === "12h"}
                onClick={() => setMode("12h")}
                className={(mode === "12h"
                  ? "bg-black text-white"
                  : "text-black/70 hover:text-black") +
                  " rounded-full px-3 py-1 text-xs font-semibold transition-colors"}
              >
                12h
              </button>
              <button
                type="button"
                aria-pressed={mode === "24h"}
                onClick={() => setMode("24h")}
                className={(mode === "24h"
                  ? "bg-black text-white"
                  : "text-black/70 hover:text-black") +
                  " rounded-full px-3 py-1 text-xs font-semibold transition-colors"}
              >
                24h
              </button>
            </div>
          </div>

          {/* Big time */}
          <div
            aria-label="Time in India Standard Time"
            className="w-full whitespace-nowrap text-center text-black font-bold tabular-nums tracking-[-0.02em] leading-none select-none text-[clamp(80px,18vw,200px)]"
          >
            {time}
            {mode === "12h" && period && (
              <span className="ml-3 align-top font-bold text-black/80 text-[clamp(14px,3.2vw,36px)] tracking-wide">
                {period}
              </span>
            )}
          </div>

          {/* Date line */}
          <div className="mt-2 text-center text-sm text-black/70 select-none">
            {dateLine}
          </div>
        </div>

        <div className="w-full px-3 sm:px-6 py-3 sm:py-4">
          <div className="text-center select-none text-black font-extrabold tracking-tight text-[clamp(22px,4.2vw,48px)]">
            India&apos;s First AI-Enabled Marine Biodiversity Intelligence Platform
          </div>
        </div>

        {/* Three cards */}
        <div className="w-full px-3 sm:px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/map" className="group relative overflow-hidden rounded-2xl bg-black text-white p-4 sm:p-5 ring-1 ring-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out transform-gpu will-change-transform hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:ring-white/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0 block">
              <span className="pointer-events-none absolute top-0 left-[-40%] h-full w-[40%] bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 transform translate-x-0 transition-transform duration-800 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[240%] motion-reduce:transition-none motion-reduce:transform-none" />
              <div className="flex items-center gap-4 relative z-10">
                {/* passport size image */}
                <div className="relative flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden ring-1 ring-white/20 bg-white/10 transition-colors duration-300 group-hover:ring-white/40">
                  <div className="absolute inset-0 grid place-items-center text-white/50 text-xs">Image</div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold mb-1">Card One</h3>
                  <p className="text-white/80 text-sm">Add content here.</p>
                </div>
              </div>
            </Link>
            <div className="group relative overflow-hidden rounded-2xl bg-black text-white p-4 sm:p-5 ring-1 ring-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out transform-gpu will-change-transform hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:ring-white/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <span className="pointer-events-none absolute top-0 left-[-40%] h-full w-[40%] bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 transform translate-x-0 transition-transform duration-800 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[240%] motion-reduce:transition-none motion-reduce:transform-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="relative flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden ring-1 ring-white/20 bg-white/10 transition-colors duration-300 group-hover:ring-white/40">
                  <div className="absolute inset-0 grid place-items-center text-white/50 text-xs">Image</div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold mb-1">Card Two</h3>
                  <p className="text-white/80 text-sm">Add content here.</p>
                </div>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-2xl bg-black text-white p-4 sm:p-5 ring-1 ring-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out transform-gpu will-change-transform hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:ring-white/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <span className="pointer-events-none absolute top-0 left-[-40%] h-full w-[40%] bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 transform translate-x-0 transition-transform duration-800 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[240%] motion-reduce:transition-none motion-reduce:transform-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="relative flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden ring-1 ring-white/20 bg-white/10 transition-colors duration-300 group-hover:ring-white/40">
                  <div className="absolute inset-0 grid place-items-center text-white/50 text-xs">Image</div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold mb-1">Card Three</h3>
                  <p className="text-white/80 text-sm">Add content here.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
