import Link from "next/link";
import { Sparkle } from "./icons";

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-rose/20 bg-pearl/60">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkle className="h-4 w-4 text-hot-pink" />
              <span className="font-display text-2xl italic">La Di Da</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-smoke">
              Your AI atelier. Hot looks, no photographer — built for the girls who already know.
            </p>
          </div>

          <FooterCol
            heading="Atelier"
            links={[
              { href: "/atelier", label: "The packs" },
              { href: "/vault", label: "Vault" },
              { href: "/salon", label: "Salon" },
            ]}
          />
          <FooterCol
            heading="The fine print"
            links={[
              { href: "/account", label: "Account" },
              { href: "/trust", label: "How we keep you safe" },
              { href: "/legal/privacy", label: "Privacy" },
              { href: "/legal/disclosure", label: "AI disclosure" },
              { href: "/legal/2257", label: "Records" },
            ]}
          />
          <FooterCol
            heading="Company"
            links={[
              { href: "/", label: "Home" },
              { href: "/welcome", label: "Get started" },
              { href: "mailto:hi@ladida.studio", label: "hi@ladida.studio" },
            ]}
          />
        </div>

        <div className="hairline my-10" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-smoke md:flex-row">
          <p className="font-script text-base text-rose">Made for the girls. ✦</p>
          <p>© {new Date().getFullYear()} La Di Da Atelier · It's only ever you. No celebrities, no minors, no exceptions.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-[0.22em] text-smoke">{heading}</h4>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-noir/80 transition hover:text-hot-pink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
