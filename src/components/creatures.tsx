"use client";
import React from "react";

export type CreatureProps = Readonly<{ title?: string }>;

export function Fish({ title }: CreatureProps) {
  return (
    <svg viewBox="0 0 64 32" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g>
        <path d="M8,16 C14,8 24,6 34,9 C40,11 44,14 48,16 C44,18 40,21 34,23 C24,26 14,24 8,16 Z" />
        <path d="M48,16 L60,9 L58,16 L60,23 Z" />
        <circle cx="18" cy="15" r="1" />
        <path d="M14,19 C18,18 21,18 26,18" />
        <path d="M14,13 C18,12.5 21,12.5 26,12.5" />
      </g>
    </svg>
  );
}

export function Turtle({ title }: CreatureProps) {
  return (
    <svg viewBox="0 0 72 40" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g>
        <path d="M18,22 C18,12 28,8 36,8 C44,8 54,12 54,22 C54,30 46,34 36,34 C26,34 18,30 18,22 Z" />
        <path d="M14,22 C12,20 12,18 14,16 C16,14 18,14 20,16" />
        <circle cx="17" cy="19" r="0.8" />
        <path d="M26,34 C24,36 20,36 18,34" />
        <path d="M46,34 C48,36 52,36 54,34" />
        <path d="M26,10 C24,8 20,8 18,10" />
        <path d="M46,10 C48,8 52,8 54,10" />
        <path d="M26,18 C28,20 30,22 36,22 C42,22 44,20 46,18" />
        <path d="M28,26 C32,28 40,28 44,26" />
      </g>
    </svg>
  );
}

export function Jellyfish({ title }: CreatureProps) {
  return (
    <svg viewBox="0 0 48 60" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g>
        <path d="M8,20 C8,10 16,4 24,4 C32,4 40,10 40,20 C40,22 8,22 8,20 Z" />
        <path d="M12,22 C10,30 12,40 10,50" />
        <path d="M18,22 C16,32 20,42 18,54" />
        <path d="M24,22 C24,34 24,44 24,56" />
        <path d="M30,22 C32,32 28,44 30,54" />
        <path d="M36,22 C38,30 36,42 38,50" />
      </g>
    </svg>
  );
}

export function Seahorse({ title }: CreatureProps) {
  return (
    <svg viewBox="0 0 40 72" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g>
        <path d="M22,12 C24,10 26,10 28,12 C30,14 28,16 26,16 C24,16 22,14 22,12 Z" />
        <path d="M26,12 C30,10 34,11 34,14 C32,16 30,16 28,15" />
        {}
        <path d="M22,12 C20,14 18,18 18,22 C18,28 22,32 22,38 C22,46 18,50 16,56 C15,60 18,64 22,66" />
        {}
        <path d="M24,18 C26,22 26,28 24,32 C22,36 20,42 22,46 C24,50 26,54 24,60 C22,64 18,66 16,64" />
        <circle cx="26" cy="13.5" r="0.8" />
      </g>
    </svg>
  );
}

export function MantaRay({ title }: CreatureProps) {
  return (
    <svg viewBox="0 0 96 48" aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g>
        {}
        <path d="M8,24 C20,8 40,8 48,16 C56,8 76,8 88,24 C76,20 64,22 48,24 C32,22 20,20 8,24 Z" />
        {}
        <path d="M44,20 C48,22 48,26 44,28 C40,30 36,28 36,24 C36,20 40,18 44,20 Z" />
        {}
        <path d="M48,24 C56,28 64,34 72,44" />
      </g>
    </svg>
  );
}
