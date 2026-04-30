import type { SVGProps } from "react";

export function Sparkle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 2c.7 4.4 3.6 7.3 8 8-4.4.7-7.3 3.6-8 8-.7-4.4-3.6-7.3-8-8 4.4-.7 7.3-3.6 8-8z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FourPointStar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M12 2l1.6 8.4L22 12l-8.4 1.6L12 22l-1.6-8.4L2 12l8.4-1.6L12 2z" fill="currentColor" />
    </svg>
  );
}

export function Bow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 40" fill="none" aria-hidden {...props}>
      <path
        d="M4 20c0-8 8-14 14-12s10 8 14 12c4-4 8-10 14-12s14 4 14 12-8 14-14 12-10-8-14-12c-4 4-8 10-14 12S4 28 4 20z"
        fill="currentColor"
        opacity="0.85"
      />
      <ellipse cx="32" cy="20" rx="3.6" ry="5" fill="currentColor" />
    </svg>
  );
}

export function Heart({ filled = false, ...props }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M12 21s-7.5-4.6-9.6-9.4C1 7.7 4 4 7.4 4c2 0 3.5 1.1 4.6 2.7C13.1 5.1 14.6 4 16.6 4 20 4 23 7.7 21.6 11.6 19.5 16.4 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}

export function Pearl(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <defs>
        <radialGradient id="pearl-grad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F8D7DA" />
          <stop offset="100%" stopColor="#E8A5B0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill="url(#pearl-grad)" />
    </svg>
  );
}

export function Lipstick(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path d="M9 3l4-1 3 5-2 1-1.5 2H9V3z" fill="currentColor" />
      <rect x="8" y="10" width="8" height="11" rx="1.2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function Ribbon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 12" fill="none" aria-hidden {...props}>
      <path
        d="M0 6c20-8 40 8 60 0s40-8 60 0 40 8 60 0 20 0 20 0"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function LockKey(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="4.5" y="10" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function Mirror(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 80" fill="none" aria-hidden {...props}>
      <ellipse cx="32" cy="34" rx="28" ry="32" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="32" cy="34" rx="22" ry="26" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
      <path d="M28 66h8v8h-8z" fill="currentColor" opacity="0.4" />
      <path d="M22 74h20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
