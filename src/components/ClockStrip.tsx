"use client";
import React from "react";
import Image from "next/image";

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
  const [now, setNow] = React.useState<Date>(() => new Date());
  const [stats, setStats] = React.useState<{ online: boolean; boundariesCount: number } | null>(null);

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) throw new Error("stats failed");
        const data = (await res.json()) as { online: boolean; boundariesCount: number };
        if (!ignore) setStats(data);
      } catch {
        if (!ignore) setStats({ online: false, boundariesCount: 0 });
      }
    })();
    return () => { ignore = true; };
  }, []);

  const { core: time, period } = getTimeParts(now, mode);
  const dateLine = formatDateLine(now);
  let backendStatusText = "…";
  if (stats) backendStatusText = stats.online ? "online" : "offline";

  return (
    <div className="w-full">
      <div className="w-full">
  <div className="relative w-full bg-transparent px-3 sm:px-6 py-3 sm:py-4 border-b border-black/10">
          {}
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

          {}
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

          {}
          <div className="mt-2 text-center text-sm text-black/70 select-none">
            {dateLine}
          </div>
        </div>

        <div className="w-full px-3 sm:px-6 py-3 sm:py-4">
          <div className="text-center select-none text-black font-extrabold tracking-tight text-[clamp(22px,4.2vw,48px)]">
            India&apos;s First AI-Enabled Marine Biodiversity Intelligence Platform
          </div>
        </div>

        {}
        <div className="w-full px-3 sm:px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a href="/map" aria-label="Open interactive world map" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-2xl">
            <div className="group relative overflow-hidden rounded-2xl bg-black text-white p-4 sm:p-5 ring-1 ring-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out transform-gpu will-change-transform hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:ring-white/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <span className="pointer-events-none absolute top-0 left-[-40%] h-full w-[40%] bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 transform translate-x-0 transition-transform duration-800 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[240%] motion-reduce:transition-none motion-reduce:transform-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="relative flex-shrink-0 w-[70px] h-[90px] sm:w-[80px] sm:h-[104px] rounded-xl overflow-hidden ring-1 ring-white/30 bg-white/95 shadow-sm transition-colors duration-300 group-hover:ring-white/60">
                  <Image
                    src="/pin.png"
                    alt="Location pin"
                    fill
                    sizes="(max-width: 640px) 70px, 80px"
                    className="object-contain p-2 drop-shadow-sm"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold mb-1">Interactive World Map</h3>
                  <div className="mt-2 text-xs text-white/70 flex flex-wrap items-center gap-2">
                    <span>Backend:</span>
                    <span className={stats?.online ? "text-emerald-400" : "text-rose-400"}>{backendStatusText}</span>
                    <span aria-hidden className="text-white/40">•</span>
                    <span>Boundaries:</span>
                    <span className="text-white">
                      {stats ? stats.boundariesCount : "…"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-white/70 flex items-center gap-2">
                  </div>
                </div>
                <span className="ml-auto text-white/70 text-2xl transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </div>
            </a>
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
