import Link from "next/link";
import { PACKS } from "@/lib/packs";
import { Bow, FourPointStar, Heart, Lipstick, LockKey, Pearl, Ribbon, Sparkle } from "@/components/icons";
import { SparkleField } from "@/components/SparkleField";

export default function Home() {
  const featured = PACKS.filter((p) => ["boudoir", "stage", "vacation"].includes(p.id));

  return (
    <div className="relative">
      <Hero />
      <PackShowcase packs={featured} />
      <DualOutput />
      <Pricing />
      <Compliance />
      <Testimonials />
      <CTA />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative">
      <SparkleField />
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="font-script text-2xl text-rose">hello, love —</p>
            <h1 className="mt-2 font-display text-6xl italic leading-[0.95] tracking-tight text-noir md:text-7xl">
              Your AI <span className="gold-text not-italic">atelier.</span>
              <br />
              <span className="italic">Bombshell looks</span>
              <br />
              on demand.
            </h1>
            <p className="mt-6 max-w-md text-base text-smoke">
              A credit-based photo + video studio for verified dancers and adult creators.
              Train a model on your own face. Generate IG-safe and platform-graded looks in seconds.
              Wrapped in something that finally feels made for the girls.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/welcome" className="btn-rose">
                <Sparkle className="h-4 w-4" />
                Try it, gorgeous
              </Link>
              <Link href="/atelier" className="btn-ghost">
                Tour the atelier
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs text-smoke">
              <span className="chip"><LockKey className="h-3 w-3" /> ID-verified</span>
              <span className="chip">Self-only</span>
              <span className="chip">SFW + Graded</span>
              <span className="chip">Adult-friendly billing</span>
            </div>
          </div>

          <VanityMirror />
        </div>
      </div>
      <Ribbon className="mx-auto h-3 w-full max-w-6xl px-6 text-rose/50 animate-ribbon-pulse" />
    </section>
  );
}

function VanityMirror() {
  return (
    <div className="relative">
      <div className="silk-card marble-overlay aspect-[4/5] w-full">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,#FFFFFF_0%,#F8D7DA_55%,#E8A5B0_100%)]" />
        {/* simulated polaroid stack */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-3/4 w-3/4">
            <Polaroid
              className="absolute -left-2 top-2 -rotate-6"
              gradient="bg-[radial-gradient(120%_80%_at_30%_20%,#F8D7DA_0%,#E8A5B0_45%,#6B4F5E_100%)]"
              caption="Boudoir · suite"
            />
            <Polaroid
              className="absolute right-0 top-10 rotate-3"
              gradient="bg-[radial-gradient(120%_80%_at_70%_30%,#D63384_0%,#1A0F1A_55%,#C9A961_120%)]"
              caption="Stage · headline"
            />
            <Polaroid
              className="absolute left-6 bottom-0 -rotate-2"
              gradient="bg-[linear-gradient(160deg,#FBF7F2_0%,#E8D5B7_45%,#E8A5B0_100%)]"
              caption="Vacay · golden hour"
            />
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-champagne/60 bg-pearl/90 px-4 py-1.5 shadow-pearl">
          <Pearl className="h-3.5 w-3.5" />
          <span className="text-[11px] uppercase tracking-[0.22em] text-smoke">on the vanity</span>
          <Pearl className="h-3.5 w-3.5" />
        </div>
      </div>
      <Bow className="absolute -top-6 left-1/2 h-10 w-16 -translate-x-1/2 text-hot-pink drop-shadow-md" />
    </div>
  );
}

function Polaroid({
  className,
  gradient,
  caption,
}: {
  className?: string;
  gradient: string;
  caption: string;
}) {
  return (
    <div
      className={`${className} aspect-[3/4] w-44 rounded-md bg-pearl p-2 shadow-vanity ring-1 ring-blush/40`}
    >
      <div className={`${gradient} h-[78%] w-full rounded-sm`} />
      <p className="mt-1 text-center font-script text-sm text-rose">{caption}</p>
    </div>
  );
}

function PackShowcase({ packs }: { packs: typeof PACKS }) {
  return (
    <section className="relative mx-auto mt-10 max-w-6xl px-6">
      <SectionHeading kicker="The packs" title="Three looks. Endless variations." />
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {packs.map((p) => (
          <Link key={p.id} href={`/atelier/generate/${p.id}`} className="group">
            <div className="silk-card marble-overlay aspect-[4/5]">
              <div className={`absolute inset-0 ${p.hero}`} />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="font-display text-3xl italic text-pearl drop-shadow">{p.oneWord}.</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-pearl/85">
                  {p.descriptor}
                </p>
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-pearl/85 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-smoke">
                {p.supports.includes("graded") ? <span>SFW · Graded</span> : <span>SFW</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function DualOutput() {
  return (
    <section className="relative mx-auto mt-24 max-w-6xl px-6">
      <SectionHeading kicker="The wedge" title={<><span className="italic">SFW.</span> & <span className="italic gold-text">Graded.</span></>} />
      <p className="mx-auto mt-3 max-w-2xl text-center text-smoke">
        Every look ships in two cuts — one for the public socials that shadowban a shoulder, and one for
        the platforms that pay. AI disclosure baked into EXIF; visible badge optional.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="silk-card marble-overlay p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blush p-2 text-hot-pink"><Heart className="h-4 w-4" /></div>
            <h3 className="font-display text-3xl italic">Safe for socials</h3>
          </div>
          <p className="mt-3 text-smoke">
            IG, TikTok, public Twitter. Pre-flagged through a moderation pass — no NIP slips, no
            outerwear-as-underwear violations. The look that grows the funnel.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip">IG-safe</span>
            <span className="chip">TikTok-safe</span>
            <span className="chip">Auto-tagged</span>
          </div>
        </div>

        <div className="silk-card marble-overlay p-7 ring-1 ring-champagne/60">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-champagne-gold p-2 text-noir"><FourPointStar className="h-4 w-4" /></div>
            <h3 className="font-display text-3xl italic gold-text">Graded</h3>
          </div>
          <p className="mt-3 text-smoke">
            OnlyFans, Fanvue, Fansly. Adult-platform compliant, watermarked, AI-disclosed per ToS — so
            the account survives. The look that gets paid.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip">OF-allowed</span>
            <span className="chip">Fanvue-allowed</span>
            <span className="chip">EXIF + visible AI tag</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Trial", price: "Free", desc: "5 credits to test. Watermarked. No model.", cta: "Try it", emphasis: false },
    { name: "Darling", price: "$19.99", suffix: "/mo", desc: "200 credits + 1 personal model. SFW + Graded.", cta: "Choose Darling", emphasis: false },
    { name: "Bombshell", price: "$49.99", suffix: "/mo", desc: "600 credits, 2 models, 30 video credits. Priority queue.", cta: "Choose Bombshell", emphasis: true },
    { name: "Icon", price: "$129", suffix: "/mo", desc: "2,000 credits, unlimited models, 150 video, early packs.", cta: "Choose Icon", emphasis: false, gold: true },
  ];

  return (
    <section className="relative mx-auto mt-24 max-w-6xl px-6">
      <SectionHeading kicker="Pricing" title="A beauty subscription, not SaaS." />
      <div className="mt-10 grid gap-5 md:grid-cols-4">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`silk-card marble-overlay p-6 ${
              t.emphasis ? "ring-2 ring-hot-pink/60" : ""
            } ${t.gold ? "bg-gradient-to-br from-pearl to-champagne/30" : ""}`}
          >
            {t.emphasis && (
              <span className="chip chip-active absolute -top-3 left-6">most chosen</span>
            )}
            <h4 className={`font-display text-3xl italic ${t.gold ? "gold-text" : ""}`}>{t.name}</h4>
            <p className="mt-3">
              <span className={`figs-old font-display text-5xl ${t.gold ? "gold-text" : ""}`}>
                {t.price}
              </span>
              {t.suffix && <span className="text-smoke">{t.suffix}</span>}
            </p>
            <p className="mt-3 text-sm text-smoke">{t.desc}</p>
            <Link
              href="/welcome"
              className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium ${
                t.gold ? "btn-gold" : t.emphasis ? "btn-rose" : "btn-ghost"
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-smoke">
        Top-ups: $9.99 / 100 credits · $24.99 / 300 credits. Image = 1 · Kling video = 8 · Veo Lite = 12.
      </p>
    </section>
  );
}

function Compliance() {
  const items = [
    {
      icon: <LockKey className="h-4 w-4" />,
      title: "Verified self.",
      body: "Government ID + selfie before any model trains. Persona / Stripe Identity / Veriff. No verification, no atelier.",
    },
    {
      icon: <FourPointStar className="h-4 w-4" />,
      title: "AI-disclosed.",
      body: "Auto EXIF tag + optional visible badge per OF, Fanvue, and Meta ToS. We protect the account so the account keeps paying.",
    },
    {
      icon: <Lipstick className="h-4 w-4" />,
      title: "No celebrities, no minors.",
      body: "Hive + Thorn Safer on every prompt and every output. CSAM-adjacent attempts hard-fail and trigger review.",
    },
  ];
  return (
    <section className="relative mx-auto mt-24 max-w-6xl px-6">
      <SectionHeading kicker="Built-in care" title="The compliance you don't have to think about." />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {items.map((i) => (
          <div key={i.title} className="silk-card marble-overlay p-6">
            <div className="flex items-center gap-2 text-hot-pink">{i.icon}<span className="text-[11px] uppercase tracking-[0.2em] text-smoke">protected</span></div>
            <h4 className="mt-3 font-display text-2xl italic">{i.title}</h4>
            <p className="mt-2 text-sm text-smoke">{i.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    { q: "Replaced two photoshoots a month. Pays for itself in a Wednesday.", who: "Vivienne · Miami" },
    { q: "First AI app I didn't immediately delete because it felt cringe.", who: "Sloane · ATL" },
    { q: "Graded export saved my OF when IG kept shadowbanning the same fit.", who: "K · Vegas" },
  ];
  return (
    <section className="relative mx-auto mt-24 max-w-6xl px-6">
      <SectionHeading kicker="From the girls" title="A few notes from the dressing room." />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {quotes.map((q) => (
          <figure key={q.who} className="silk-card marble-overlay p-6">
            <blockquote className="font-display text-2xl italic leading-snug">“{q.q}”</blockquote>
            <figcaption className="mt-4 font-script text-base text-rose">— {q.who}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative mx-auto mt-24 max-w-4xl px-6 pb-20 text-center">
      <Bow className="mx-auto h-12 w-20 text-hot-pink" />
      <h2 className="mt-4 font-display text-5xl italic">Hi, gorgeous. Let's get you a look.</h2>
      <p className="mx-auto mt-3 max-w-md text-smoke">
        20 selfies. 8 minutes of training. A vault that fills itself.
      </p>
      <Link href="/welcome" className="btn-rose mt-8 text-base">
        Start your atelier ✦
      </Link>
    </section>
  );
}

function SectionHeading({
  kicker,
  title,
}: {
  kicker: string;
  title: React.ReactNode;
}) {
  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">{kicker}</p>
      <h2 className="mt-2 font-display text-5xl italic md:text-6xl">{title}</h2>
      <div className="hairline mx-auto mt-5 max-w-xs" />
    </div>
  );
}
