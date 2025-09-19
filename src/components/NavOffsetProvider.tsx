"use client";
import React from 'react';

export default function NavOffsetProvider() {
  React.useEffect(() => {
    function compute() {

      const left = document.querySelector('header.fixed');
      const right = document.querySelector('div.fixed.top-0.right-0');
      const rects: number[] = [];
      if (left instanceof HTMLElement) rects.push(left.getBoundingClientRect().bottom);
      if (right instanceof HTMLElement) rects.push(right.getBoundingClientRect().bottom);
      const maxBottom = rects.length ? Math.max(...rects) : 0;
      const offset = Math.ceil(maxBottom + 24); // add breathing space
      document.documentElement.style.setProperty('--nav-offset', offset + 'px');
    }
    compute();
    window.addEventListener('resize', compute);
    const ro = new ResizeObserver(compute);
    document.querySelectorAll('header.fixed, div.fixed.top-0.right-0').forEach(el => ro.observe(el));
    return () => {
      window.removeEventListener('resize', compute);
      ro.disconnect();
    };
  }, []);
  return null;
}
