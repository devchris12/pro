"use client";
import React from "react";

/**
 * Animated MagByte "M" loader.
 *
 * Six rectangular segments are arranged to form a blocky capital M.
 * Each segment "flips" via a scaleX collapse-and-expand animation,
 * staggered left-to-right to create a wave. Segments carry different
 * brand palette colours so the flipping reveals colour variety.
 *
 * Brand palette used:
 *   #001BB7 — primary blue (outer verticals)
 *   #1F7AFF — secondary blue (inner diagonals)
 *   #57FFDB — aqua (centre V pieces)
 */

interface Segment {
  x: number;
  y: number;
  h: number;
  color: string;
  delay: number;
}

// Heights descend toward the centre to approximate the M letter shape.
// All segments are top-anchored (y=2) and 9px wide.
const SEGMENTS: Segment[] = [
  { x: 0,  y: 2, h: 46, color: "#001BB7", delay: 0.00 }, // left outer vertical
  { x: 11, y: 2, h: 30, color: "#1F7AFF", delay: 0.14 }, // left diagonal
  { x: 22, y: 2, h: 17, color: "#57FFDB", delay: 0.28 }, // centre-left (V bottom)
  { x: 33, y: 2, h: 17, color: "#57FFDB", delay: 0.42 }, // centre-right (V bottom)
  { x: 44, y: 2, h: 30, color: "#1F7AFF", delay: 0.56 }, // right diagonal
  { x: 55, y: 2, h: 46, color: "#001BB7", delay: 0.70 }, // right outer vertical
];

interface MagByteMLoaderProps {
  size?: number;
}

export default function MagByteMLoader({ size = 36 }: MagByteMLoaderProps): React.ReactElement {
  return (
    <svg
      viewBox="0 0 64 52"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Loading…"
      role="status"
    >
      <style>{`
        @keyframes mb-flip {
          0%, 30%  { transform: scaleX(1); }
          48%      { transform: scaleX(0.05); }
          52%      { transform: scaleX(0.05); }
          70%, 100%{ transform: scaleX(1); }
        }
        .mb-seg {
          animation: mb-flip 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      {SEGMENTS.map((seg, i) => (
        <rect
          key={i}
          className="mb-seg"
          x={seg.x}
          y={seg.y}
          width={9}
          height={seg.h}
          rx={2.5}
          fill={seg.color}
          style={{
            animationDelay: `${seg.delay}s`,
            // Each rect flips around its own horizontal centre
            transformOrigin: `${seg.x + 4.5}px ${seg.y + seg.h / 2}px`,
          }}
        />
      ))}
    </svg>
  );
}
