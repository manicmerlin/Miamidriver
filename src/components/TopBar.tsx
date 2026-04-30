"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCredits } from "@/lib/state";
import { Sparkle } from "./icons";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/atelier", label: "Atelier" },
  { href: "/vault", label: "Vault" },
  { href: "/salon", label: "Salon" },
  { href: "/account", label: "Account" },
];

export function TopBar() {
  const pathname = usePathname();
  const { credits, tier } = useCredits();

  const isMarketing = pathname === "/" || pathname?.startsWith("/welcome");

  return (
    <header className="relative z-30 border-b border-rose/20 bg-pearl/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2">
          <Sparkle className="h-4 w-4 text-hot-pink transition group-hover:rotate-12" />
          <span className="font-display text-2xl italic text-noir">La Di Da</span>
        </Link>

        {!isMarketing && (
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition",
                  pathname?.startsWith(n.href)
                    ? "bg-blush text-noir"
                    : "text-smoke hover:bg-blush/40 hover:text-noir",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {!isMarketing ? (
            <div className="flex items-center gap-2 rounded-full border border-champagne/60 bg-pearl px-3 py-1.5 shadow-pearl">
              <span className="text-[10px] uppercase tracking-[0.2em] text-smoke">{tier}</span>
              <span className="hidden h-3 w-px bg-champagne/60 sm:block" />
              <span className="figs-old font-display text-lg leading-none gold-text">
                {credits.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-smoke">credits</span>
            </div>
          ) : (
            <Link href="/welcome" className="btn-rose text-sm">
              Start your atelier
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
