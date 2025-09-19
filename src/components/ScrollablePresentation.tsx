"use client";
import React from "react";
import ClockStrip from "@/components/ClockStrip";
import Link from "next/link";

const SECTION_IDS = ["clock", "about", "services", "data"] as const;

export default function ScrollablePresentation() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const sectionRefs = React.useRef<HTMLElement[]>([]);
  const [active, setActive] = React.useState(0);
  const sectionsCount = SECTION_IDS.length;
  sectionRefs.current = sectionRefs.current.slice(0, sectionsCount);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleEntries: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        const idx = sectionRefs.current.indexOf(entry.target as HTMLElement);
        if (idx !== -1 && entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          setActive(idx);
        }
      }
    };

    const observer = new IntersectionObserver(handleEntries, {
      root: container,
      threshold: [0.6],
    });

    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToIndex = React.useCallback((idx: number) => {
    const el = sectionRefs.current[idx];
    if (!el) return;
    const rm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: rm ? "auto" : "smooth", block: "start" });
  }, []);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onKey = (e: KeyboardEvent) => {
      const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const smooth = !rm;
      if (e.key === "PageDown" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(active + 1, sectionsCount - 1);
        if (smooth) scrollToIndex(next);
        else sectionRefs.current[next]?.scrollIntoView();
      } else if (e.key === "PageUp" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(active - 1, 0);
        if (smooth) scrollToIndex(prev);
        else sectionRefs.current[prev]?.scrollIntoView();
      }
    };

    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [active, scrollToIndex, sectionsCount]);

  return (
    <div className="relative">
      {}
      <nav aria-label="Section navigation" className="pointer-events-auto fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col gap-2">
        {SECTION_IDS.map((id, i) => (
          <button
            key={id}
            aria-label={`Go to section ${i + 1}`}
            aria-current={active === i ? "true" : undefined}
            onClick={() => scrollToIndex(i)}
            className={
              "relative h-3 w-3 rounded-full will-change-transform transition-[transform,background-color,box-shadow] duration-800 ease-[cubic-bezier(0.22,1,0.36,1)] " +
              (active === i
                ? "bg-black scale-110 shadow-[0_0_0_6px_rgba(0,0,0,0.06)]"
                : "bg-black/30 hover:bg-black/50 scale-90 shadow-none")
            }
          >
            <span
              aria-hidden
              className={
                "pointer-events-none absolute -inset-1 rounded-full ring-1 transition-all duration-800 ease-[cubic-bezier(0.22,1,0.36,1)] " +
                (active === i ? "ring-black/25 opacity-100 scale-105" : "ring-black/0 opacity-0 scale-90")
              }
            />
          </button>
        ))}
      </nav>

      {}
      <div
        ref={containerRef}
        className="h-[100svh] overflow-y-auto snap-y snap-mandatory scroll-smooth motion-reduce:scroll-auto bg-transparent"
      >
        {}
        <section
          ref={(el) => {
            if (el) sectionRefs.current[0] = el;
          }}
          className="relative snap-start min-h-[100svh] pt-32 px-3 sm:px-6 pb-24 sm:pb-28 overflow-hidden"
        >
          <div className="relative z-10">
            <ClockStrip />
          </div>
          {}
          <div aria-hidden className="pointer-events-none absolute left-[-12%] right-[-12%] bottom-0 z-0">
            <div className="opacity-70 animate-float-x-slow">
              <svg viewBox="0 0 1200 180" preserveAspectRatio="none" className="block w-full h-[140px] sm:h-[160px]">
                <path d="M0,180 C60,170 120,150 180,155 C240,160 280,175 340,165 C400,155 440,130 520,140 C600,150 620,175 700,170 C780,165 820,150 900,155 C980,160 1000,175 1080,170 C1160,165 1180,155 1200,150 L1200,180 L0,180 Z" fill="#0a4a6b" />
              </svg>
            </div>
          </div>
          {}
            <div aria-hidden className="pointer-events-none absolute left-[-12%] right-[-12%] bottom-0 z-0">
              <div className="opacity-80 -mb-[1px] -translate-y-1 sm:-translate-y-2 animate-float-x-slow">
                <svg viewBox="0 0 1200 180" preserveAspectRatio="none" className="block w-full h-[150px] sm:h-[170px]">
                  <path d="M0,180 C55,160 115,135 175,142 C235,149 275,168 335,158 C395,148 435,118 515,128 C595,138 615,168 695,163 C775,158 815,138 895,144 C975,150 995,168 1075,163 C1155,158 1175,146 1200,142 L1200,180 L0,180 Z" fill="#094a60" />
                </svg>
              </div>
            </div>
            {}
            <div aria-hidden className="pointer-events-none absolute left-[-12%] right-[-12%] bottom-0 z-0">
              <div className="opacity-82 -mb-[1px] -translate-y-2 sm:-translate-y-3 lg:-translate-y-5 animate-float-x">
                <svg viewBox="0 0 1200 180" preserveAspectRatio="none" className="block w-full h-[155px] sm:h-[175px]">
                  <path d="M0,180 C55,160 115,135 175,142 C235,149 275,168 335,158 C395,148 435,118 515,128 C595,138 615,168 695,163 C775,158 815,138 895,144 C975,150 995,168 1075,163 C1155,158 1175,146 1200,142 L1200,180 L0,180 Z" fill="#0a435c" />
                </svg>
              </div>
            </div>
          <div aria-hidden className="pointer-events-none absolute left-[-12%] right-[-12%] bottom-0 z-0">
            <div className="opacity-85 -mb-[1px] -translate-y-2 sm:-translate-y-4 lg:-translate-y-6 animate-float-x">
              <svg viewBox="0 0 1200 180" preserveAspectRatio="none" className="block w-full h-[160px] sm:h-[180px]">
                <path d="M0,180 C50,150 100,120 160,130 C220,140 260,170 320,160 C380,150 420,100 500,110 C580,120 600,170 680,165 C760,160 800,120 880,130 C960,140 980,170 1060,165 C1140,160 1180,140 1200,130 L1200,180 L0,180 Z" fill="#083651" />
              </svg>
            </div>
          </div>
        </section>

        {}
        <section
          ref={(el) => {
            if (el) sectionRefs.current[1] = el;
          }}
          className="relative snap-start min-h-[100svh] flex items-center"
        >
          <div className="w-full px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-black mb-6">About Samudriksha</h2>
              <p className="text-black/70 text-lg sm:text-xl max-w-3xl">
                We are building India&apos;s first AI-enabled Marine Biodiversity Intelligence Platform.
                Explore our mission, approach, and the science that powers our insights.
              </p>
              <div className="mt-8">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-3 rounded-full bg-black text-white px-6 py-3 text-sm font-semibold shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/10 hover:ring-white/30 transition"
                >
                  <span>Learn more</span>
                  <span aria-hidden="true" className="ml-1 inline-block">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {}
        <section
          ref={(el) => {
            if (el) sectionRefs.current[2] = el;
          }}
          className="relative snap-start min-h-[100svh] flex items-center"
        >
          <div className="w-full px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-black mb-6">Services</h2>
              <p className="text-black/70 text-lg sm:text-xl max-w-3xl">
                From data ingestion and curation to real-time analytics and visualization, we deliver
                end-to-end solutions tailored for marine research and operations.
              </p>
              <div className="mt-8">
                <Link
                  href="/services"
                  className="inline-flex items-center gap-3 rounded-full bg-black text-white px-6 py-3 text-sm font-semibold shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/10 hover:ring-white/30 transition"
                >
                  <span>Explore services</span>
                  <span aria-hidden="true" className="ml-1 inline-block">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {}
        <section
          ref={(el) => {
            if (el) sectionRefs.current[3] = el;
          }}
          className="relative snap-start min-h-[100svh] flex items-center"
        >
          <div className="w-full px-6">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-black mb-6">Data Intelligence</h2>
              <p className="text-black/70 text-lg sm:text-xl max-w-3xl">
                Discover structured datasets, APIs, and dashboards that bring ocean data to life.
                Access high-fidelity insights for conservation, policy, and industry.
              </p>
              <div className="mt-8">
                <Link
                  href="/data"
                  className="inline-flex items-center gap-3 rounded-full bg-black text-white px-6 py-3 text-sm font-semibold shadow-[0_8px_28px_rgba(0,0,0,0.35)] ring-1 ring-white/10 hover:ring-white/30 transition"
                >
                  <span>View data</span>
                  <span aria-hidden="true" className="ml-1 inline-block">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
