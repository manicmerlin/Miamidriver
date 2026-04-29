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
            <p className="font-script text-2xl text-rose">hello, here —</p>
            <h1 className="mt-2 font-display text-6xl italic leading-[0.95] tracking-tight text-noir md:text-7xl">
              Your AI <span className="gold-text not-italic">atelier.</span>
              <br />
              <span className="italic">Hot looks,</span>
              <br />
              no photographer.
            </h1>
            <p className="mt-6 max-w-md text-base text-smoke">
              Upload twenty selfies. Eight minutes later, you're shooting. A new outfit, a new room,
              a new city — whenever the feed runs dry or the OF needs a refresh. Built quietly,
              finally, for the girls.
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
              <span className="chip">made for the girls</span>
              <span className="chip">it's only ever you</span>
              <span className="chip">works on the platforms you actually use</span>
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
      <SectionHeading kicker="The packs" title="Three moods. Endless looks." />
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
                {p.supports.includes("graded") ? <span>for the feed · for the platform</span> : <span>for the feed</span>}
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
      <SectionHeading kicker="The wedge" title={<><span className="italic">One look.</span> <span className="italic gold-text">Two cuts.</span></>} />
      <p className="mx-auto mt-3 max-w-2xl text-center text-smoke">
        Every photo ships in two versions. The one that lives on your feed without getting nuked,
        and the one that lives behind the paywall and converts. You shoot once. You post twice.
        The funnel and the cash both eat.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="silk-card marble-overlay p-7">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blush p-2 text-hot-pink"><Heart className="h-4 w-4" /></div>
            <h3 className="font-display text-3xl italic">For the feed</h3>
          </div>
          <p className="mt-3 text-smoke">
            Made to survive IG, TikTok, and the public Twitter. No surprise takedowns, no
            shadowban spirals, no "why did this post get 200 views." The version that grows
            the audience.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip">IG-friendly</span>
            <span className="chip">TikTok-friendly</span>
            <span className="chip">stays up</span>
          </div>
        </div>

        <div className="silk-card marble-overlay p-7 ring-1 ring-champagne/60">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-champagne-gold p-2 text-noir"><FourPointStar className="h-4 w-4" /></div>
            <h3 className="font-display text-3xl italic gold-text">For the platforms that pay</h3>
          </div>
          <p className="mt-3 text-smoke">
            OF, Fanvue, Fansly. The version that drops in your PPV and actually converts. Made
            to play by each platform's rules so the account keeps the bag.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip">OF-ready</span>
            <span className="chip">Fanvue-ready</span>
            <span className="chip">made to convert</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Trial", price: "Free", desc: "A few looks on the house. See if she's the one.", cta: "Try it", emphasis: false },
    { name: "Darling", price: "$19.99", suffix: "/mo", desc: "About 200 looks a month. One face, both cuts. The side-hustle plan.", cta: "Choose Darling", emphasis: false },
    { name: "Bombshell", price: "$49.99", suffix: "/mo", desc: "Around 600 looks + 30 short videos. Skip the line. The plan most girls land on.", cta: "Choose Bombshell", emphasis: true },
    { name: "Icon", price: "$129", suffix: "/mo", desc: "Effectively unlimited. Two thousand looks, all the videos, first dibs on every new pack.", cta: "Choose Icon", emphasis: false, gold: true },
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
        Need more? $9.99 buys 100. $24.99 buys 300. Videos cost a few credits each — the math is friendly, we promise.
      </p>
    </section>
  );
}

function Compliance() {
  const items = [
    {
      icon: <LockKey className="h-4 w-4" />,
      title: "It's only ever you.",
      body: "Quick ID check before your atelier opens. No one can pretend to be you here. No one can use someone else's face, either. Your atelier, your face, your rules.",
    },
    {
      icon: <FourPointStar className="h-4 w-4" />,
      title: "The account stays safe.",
      body: "Every look comes platform-ready. No bans, no takedowns, no losing the followers you spent two years building. We've read the fine print so you don't have to.",
    },
    {
      icon: <Lipstick className="h-4 w-4" />,
      title: "A strict door policy.",
      body: "No celebrities. No minors. No exceptions, ever. The girls inside are real, verified, and protected — that's the whole point.",
    },
  ];
  return (
    <section className="relative mx-auto mt-24 max-w-6xl px-6">
      <SectionHeading kicker="A quiet promise" title="Built so you don't have to think about it." />
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
    { q: "Replaced two photoshoots a month. Paid for itself the first Wednesday.", who: "Vivienne · Miami" },
    { q: "First AI app I didn't delete in five minutes. It actually looks like me.", who: "Roxie · ATL" },
    { q: "The other cut saved my OF when IG kept blocking the same fit.", who: "N · Vegas" },
    { q: "Posted three Tuesdays in a row without a single takedown. New record.", who: "Sasha · NYC" },
  ];
  return (
    <section className="relative mx-auto mt-24 max-w-6xl px-6">
      <SectionHeading kicker="From the girls" title="A few notes from the dressing room." />
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {quotes.map((q) => (
          <figure key={q.who} className="silk-card marble-overlay p-6">
            <blockquote className="font-display text-xl italic leading-snug">“{q.q}”</blockquote>
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
        Twenty selfies. Eight minutes. Months of content.
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
