"use client";
import { useEffect } from 'react';

export default function SetNavOffsetClient() {
  useEffect(() => {
    const setOffset = () => {
      try {
        const header = document.querySelector('header') || document.querySelector('nav');
        const height = header ? Math.ceil(header.getBoundingClientRect().height) : 120;
        document.documentElement.style.setProperty('--nav-offset', `${height + 8}px`);
      } catch {
        // fallback — don't block
        document.documentElement.style.setProperty('--nav-offset', '140px');
      }
    };

    setOffset();
    const ro = new ResizeObserver(() => setOffset());
    const headerEl = document.querySelector('header') || document.querySelector('nav');
    if (headerEl) ro.observe(headerEl);

    window.addEventListener('resize', setOffset);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setOffset);
    };
  }, []);

  return null;
}
