"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/services", label: "Services" },
  { href: "/data", label: "Data" },
] as const;

type Props = Readonly<{ className?: string }>;

export default function NavCapsule({ className }: Props) {
  const pathname = usePathname();
  const items = ITEMS;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const linkRefs = React.useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = React.useState<{ left: number; width: number; height: number; visible: boolean }>({ left: 0, width: 0, height: 0, visible: false });

  const activeHref = React.useMemo(() => {
    const match = ITEMS.find(({ href }) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));
    return match?.href ?? "/";
  }, [pathname]);

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    const el = linkRefs.current[activeHref ?? "/"];
    if (!container || !el) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }
    const cRect = container.getBoundingClientRect();
    const aRect = el.getBoundingClientRect();
    const left = aRect.left - cRect.left;
    const width = aRect.width;
    const height = aRect.height;
    setIndicator({ left, width, height, visible: true });
  }, [activeHref]);

  React.useEffect(() => {
    measure();
  }, [measure]);

  React.useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  return (
    <nav className={`select-none ${className ?? ""}`}>
      <div ref={containerRef} className="relative isolate flex items-center gap-2 rounded-full border border-white/15 bg-black/40 backdrop-blur-lg px-2 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
    {indicator.visible && (
          <div
            aria-hidden
      className="pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ left: indicator.left, width: indicator.width, height: indicator.height }}
          />
        )}
    {items.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
      ref={(el) => { linkRefs.current[href] = el; }}
              className={(active
                ? "text-slate-900 font-semibold"
                : "text-white/90 hover:text-white font-medium") +
                " relative z-10 rounded-full px-5 py-2 text-base"}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
