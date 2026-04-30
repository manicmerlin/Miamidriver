"use client";

import { Sparkle } from "./icons";
import { cn } from "@/lib/cn";

const POSITIONS = [
  { top: "8%", left: "6%", size: 14, delay: "0s" },
  { top: "18%", left: "82%", size: 10, delay: "0.6s" },
  { top: "42%", left: "12%", size: 8, delay: "1.1s" },
  { top: "62%", left: "88%", size: 12, delay: "0.3s" },
  { top: "76%", left: "20%", size: 10, delay: "1.6s" },
  { top: "30%", left: "48%", size: 7, delay: "2s" },
  { top: "85%", left: "62%", size: 9, delay: "0.9s" },
];

export function SparkleField({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {POSITIONS.map((p, i) => (
        <Sparkle
          key={i}
          className="absolute animate-sparkle-drift text-champagne/80"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
