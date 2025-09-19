"use client";
import React from "react";

type Props = Readonly<{
  width?: number;
  height?: number;
  className?: string;
  title?: string;
}>;

export default function LogoFish({ width = 72, height = 72, className, title }: Props) {
  return (
    <svg
      viewBox="0 0 64 32"
      width={width}
      height={height}
      className={className}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      {}
      <path
        d="M4,16 C4,10 10,6 18,6 C28,6 36,9 42,13 C44,14.5 46,16 46,16 C46,16 44,17.5 42,19 C36,23 28,26 18,26 C10,26 4,22 4,16 Z"
    fill="#000000"
      />
      {}
      <g className="logo-tail-flick" transform="">
    <path d="M46,16 L60,8 L58,16 L60,24 Z" fill="#000000" />
      </g>
  {}
  <circle cx="20" cy="14" r="1.7" fill="#ffffff" />
    </svg>
  );
}
