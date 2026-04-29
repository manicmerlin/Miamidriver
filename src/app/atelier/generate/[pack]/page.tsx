"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getPack, type Grade, type Preset } from "@/lib/packs";
import { useAccount, type VaultItem } from "@/lib/state";
import { Bow, FourPointStar, Heart, Lipstick, LockKey, Sparkle } from "@/components/icons";
import { SparkleField } from "@/components/SparkleField";
import { cn } from "@/lib/cn";

type Mode = "single" | "set";

export default function GeneratePack({ params }: { params: Promise<{ pack: string }> }) {
  const { pack: packId } = use(params);
  const pack = getPack(packId);
  const { state, spend, topUp, pushVault } = useAccount();

  const [mode, setMode] = useState<Mode>("single");
  const [grade, setGrade] = useState<Grade>(pack?.defaultGrade ?? "sfw");
  const [count, setCount] = useState(4);            // single mode
  const [sfwCount, setSfwCount] = useState(3);      // set mode
  const [nsfwCount, setNsfwCount] = useState(3);    // set mode
  const [presetId, setPresetId] = useState(pack?.presets[0]?.id ?? "");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmGraded, setConfirmGraded] = useState(false);
  const [results, setResults] = useState<VaultItem[]>([]);

  // In Set mode show only presets that exist on both grades — those are the
  // ones we can render as a paired feed + platform set.
  const visiblePresets = useMemo(() => {
    if (!pack) return [];
    if (mode === "set") {
      return pack.presets.filter(
        (p) => p.grades.includes("sfw") && p.grades.includes("graded"),
      );
    }
    return pack.presets.filter((p) => p.grades.includes(grade));
  }, [pack, grade, mode]);

  const activePreset = visiblePresets.find((p) => p.id === presetId) ?? visiblePresets[0];
  const perImage = pack ? activePreset?.credits ?? pack.creditsPerImage : 0;
  const totalCount = mode === "single" ? count : sfwCount + nsfwCount;
  const cost = perImage * totalCount;

  if (!pack) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-4xl italic">That pack drifted off the vanity.</h1>
        <Link href="/atelier" className="btn-rose mt-6">Back to atelier</Link>
      </div>
    );
  }

  const setModeAvailable = pack.supports.includes("sfw") && pack.supports.includes("graded");
  const blocked = !state.idVerified || !state.modelTrained;
  const requiresGradedConfirm =
    pack.graded18Plus &&
    ((mode === "single" && grade === "graded") || (mode === "set" && nsfwCount > 0)) &&
    !confirmGraded;

  async function generate() {
    if (!pack || !activePreset) return;
    setError(null);

    if (blocked) {
      setError("Verify your ID and finish training first, love.");
      return;
    }
    if (requiresGradedConfirm) {
      setError("Quick check on the platform cut, darling.");
      return;
    }
    if (mode === "set" && sfwCount + nsfwCount === 0) {
      setError("Pick a few of each, gorgeous.");
      return;
    }
    if (!spend(cost)) {
      setError("You've used every drop. Top up?");
      return;
    }

    setSubmitting(true);
    try {
      const body =
        mode === "single"
          ? {
              packId: pack.id,
              presetId: activePreset.id,
              prompt: showCustom && customPrompt ? customPrompt : activePreset.prompt,
              mode,
              grade,
              count,
              watermark: state.watermark,
              visibleAiBadge: state.visibleAiBadge,
            }
          : {
              packId: pack.id,
              presetId: activePreset.id,
              prompt: showCustom && customPrompt ? customPrompt : activePreset.prompt,
              mode,
              sfwCount,
              nsfwCount,
              watermark: state.watermark,
              visibleAiBadge: state.visibleAiBadge,
            };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something didn't sit right. Let's try that again, love.");
        topUp(cost); // refund the spend if the provider failed
        return;
      }

      const items: VaultItem[] = (data.items as VaultItem[]).map((it) => ({
        ...it,
        watermark: state.watermark,
      }));
      items.forEach((it) => pushVault(it));
      setResults((r) => [...items, ...r]);
    } catch {
      setError("Network blinked. Try once more, gorgeous.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl px-6 py-10">
      <SparkleField />

      <Link href="/atelier" className="text-xs uppercase tracking-[0.22em] text-smoke hover:text-hot-pink">
        ← back to vanity
      </Link>

      <header className="mt-2 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-script text-2xl text-rose">{pack.descriptor.split(".")[0]}.</p>
          <h1 className="font-display text-6xl italic">{pack.oneWord}.</h1>
          <p className="mt-1 max-w-md text-smoke">{pack.blurb}</p>
        </div>

        <ModeToggle
          mode={mode}
          setAvailable={setModeAvailable}
          onChange={(m) => {
            setMode(m);
            setConfirmGraded(false);
            const allowed =
              m === "set"
                ? pack.presets.find((p) => p.grades.includes("sfw") && p.grades.includes("graded"))
                : pack.presets.find((p) => p.grades.includes(grade));
            if (allowed) setPresetId(allowed.id);
          }}
        />
      </header>

      <div className="hairline mt-6" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* LEFT — workspace */}
        <div>
          <SectionLabel>Choose a look</SectionLabel>
          <div className="mt-3 flex flex-wrap gap-2">
            {visiblePresets.map((p) => (
              <PresetChip
                key={p.id}
                preset={p}
                active={p.id === activePreset?.id}
                onClick={() => setPresetId(p.id)}
              />
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={() => setShowCustom((s) => !s)}
              className="text-xs uppercase tracking-[0.22em] gold-text"
            >
              {showCustom ? "hide customize" : "customize"}
            </button>
            {showCustom && (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={activePreset?.prompt}
                className="mt-2 w-full rounded-atelier border border-rose/30 bg-pearl/80 p-3 text-sm shadow-pearl outline-none transition focus:border-hot-pink"
                rows={3}
              />
            )}
          </div>

          {/* Mode-specific controls */}
          <div className="mt-8">
            {mode === "single" ? (
              <SingleControls
                grade={grade}
                supports={pack.supports}
                count={count}
                onGrade={(g) => {
                  setGrade(g);
                  setConfirmGraded(false);
                  const first = pack.presets.find((p) => p.grades.includes(g))?.id;
                  if (first) setPresetId(first);
                }}
                onCount={setCount}
              />
            ) : (
              <SetControls
                sfwCount={sfwCount}
                nsfwCount={nsfwCount}
                onSfw={setSfwCount}
                onNsfw={setNsfwCount}
              />
            )}
          </div>

          {requiresGradedConfirm && (
            <label className="mt-6 flex items-start gap-3 rounded-atelier bg-blush/40 p-4 text-sm">
              <input
                type="checkbox"
                checked={confirmGraded}
                onChange={(e) => setConfirmGraded(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-hot-pink"
              />
              <span>
                Quick check, gorgeous: I'm 18+, this is just for me, and the spicy ones are going
                to a platform that allows it (OF, Fanvue, Fansly).
              </span>
            </label>
          )}

          {error && (
            <div className="mt-5 rounded-atelier border border-hot-pink/30 bg-blush/40 p-3 text-sm text-noir">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.22em] text-smoke">
              {mode === "set" ? (
                <>
                  set · <span className="figs-old gold-text font-display text-base">{sfwCount}</span> feed +{" "}
                  <span className="figs-old gold-text font-display text-base">{nsfwCount}</span> platform · {" "}
                  <span className="figs-old gold-text font-display text-base">{cost}</span> credits
                </>
              ) : (
                <>
                  {count} {count === 1 ? "look" : "looks"} ·{" "}
                  <span className="figs-old gold-text font-display text-base">{cost}</span> credits
                </>
              )}
            </p>
            <button
              onClick={generate}
              disabled={submitting}
              className={cn("btn-rose", submitting && "opacity-70")}
            >
              {submitting ? (
                <><Bow className="h-4 w-6 animate-bow-spin" /> Cooking. ✦</>
              ) : mode === "set" ? (
                <>Make the set <Sparkle className="h-4 w-4" /></>
              ) : (
                <>Make the look <Sparkle className="h-4 w-4" /></>
              )}
            </button>
          </div>

          <ResultsGrid items={results} />
        </div>

        {/* RIGHT — sidecar */}
        <aside className="space-y-4">
          <Sidecard
            icon={<LockKey className="h-3.5 w-3.5" />}
            title="it's only ever you"
            body="Your atelier knows your face and only your face. Anyone else is a no, automatically."
          />
          <Sidecard
            icon={<FourPointStar className="h-3.5 w-3.5" />}
            title="platform-ready"
            body="Both cuts come ready for where they're going. You shoot once. The feed and the OF both eat."
          />
          <Sidecard
            icon={<Lipstick className="h-3.5 w-3.5" />}
            title="a soft-spoken bouncer"
            body="A quiet check happens before and after every look. Bad prompts don't make it past the door."
          />
        </aside>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">{children}</p>
  );
}

function ModeToggle({
  mode,
  setAvailable,
  onChange,
}: {
  mode: Mode;
  setAvailable: boolean;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center rounded-full border border-champagne/60 bg-pearl/80 p-1 shadow-pearl">
        <button
          onClick={() => onChange("single")}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition",
            mode === "single" ? "bg-blush text-noir" : "text-smoke hover:text-noir",
          )}
        >
          single
        </button>
        <button
          disabled={!setAvailable}
          onClick={() => onChange("set")}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition",
            mode === "set"
              ? "bg-champagne-gold text-noir"
              : setAvailable
                ? "text-smoke hover:text-noir"
                : "cursor-not-allowed text-smoke/40",
          )}
        >
          set ✦
        </button>
      </div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-smoke">
        {mode === "set" ? "feed + platform together" : "one cut at a time"}
      </p>
    </div>
  );
}

function SingleControls({
  grade,
  supports,
  count,
  onGrade,
  onCount,
}: {
  grade: Grade;
  supports: Grade[];
  count: number;
  onGrade: (g: Grade) => void;
  onCount: (n: number) => void;
}) {
  const has = (g: Grade) => supports.includes(g);
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center rounded-full border border-champagne/60 bg-pearl/80 p-1 shadow-pearl">
        <button
          disabled={!has("sfw")}
          onClick={() => onGrade("sfw")}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition",
            grade === "sfw" ? "bg-blush text-noir" : "text-smoke hover:text-noir",
          )}
        >
          for the feed
        </button>
        <button
          disabled={!has("graded")}
          onClick={() => onGrade("graded")}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition",
            grade === "graded"
              ? "bg-champagne-gold text-noir"
              : has("graded")
                ? "text-smoke hover:text-noir"
                : "cursor-not-allowed text-smoke/40",
          )}
        >
          for the platform
        </button>
      </div>

      <Stepper
        label="how many"
        value={count}
        min={1}
        max={8}
        onChange={onCount}
      />
    </div>
  );
}

function SetControls({
  sfwCount,
  nsfwCount,
  onSfw,
  onNsfw,
}: {
  sfwCount: number;
  nsfwCount: number;
  onSfw: (n: number) => void;
  onNsfw: (n: number) => void;
}) {
  return (
    <div className="rounded-vanity border border-champagne/40 bg-pearl/60 p-5 shadow-pearl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-smoke">
        a set · same scene, two cuts
      </p>
      <p className="mt-1 text-sm text-smoke">
        Tease on the feed, sell behind the paywall. Both cuts get generated together so the
        wardrobe and the room match.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Stepper
          label="for the feed"
          value={sfwCount}
          min={0}
          max={8}
          tone="blush"
          onChange={onSfw}
        />
        <Stepper
          label="for the platform"
          value={nsfwCount}
          min={0}
          max={8}
          tone="gold"
          onChange={onNsfw}
        />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  tone = "blush",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  tone?: "blush" | "gold";
  onChange: (n: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border bg-pearl/80 px-2 py-1.5 shadow-pearl",
        tone === "gold" ? "border-champagne/60" : "border-rose/30",
      )}
    >
      <span className="px-2 text-[11px] uppercase tracking-[0.22em] text-smoke">{label}</span>
      <button
        onClick={dec}
        className="h-7 w-7 rounded-full bg-blush/60 text-noir transition hover:bg-blush"
      >
        −
      </button>
      <span
        className={cn(
          "figs-old min-w-[1.5rem] text-center font-display text-xl",
          tone === "gold" ? "gold-text" : "text-noir",
        )}
      >
        {value}
      </span>
      <button
        onClick={inc}
        className="h-7 w-7 rounded-full bg-blush/60 text-noir transition hover:bg-blush"
      >
        +
      </button>
    </div>
  );
}

function PresetChip({
  preset,
  active,
  onClick,
}: {
  preset: Preset;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex max-w-[14rem] items-center gap-2 rounded-full border px-3 py-1.5 text-left transition",
        active
          ? "border-hot-pink/60 bg-blush text-noir shadow-pearl"
          : "border-rose/30 bg-pearl/80 text-smoke hover:text-noir",
      )}
    >
      <span className="text-xs">{preset.label}</span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-smoke">
        {preset.description}
      </span>
    </button>
  );
}

function Sidecard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="silk-card marble-overlay p-4">
      <div className="flex items-center gap-2 text-hot-pink">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.22em] text-smoke">{title}</span>
      </div>
      <p className="mt-2 text-sm text-noir/85">{body}</p>
    </div>
  );
}

function ResultsGrid({ items }: { items: VaultItem[] }) {
  if (items.length === 0) {
    return (
      <div className="mt-10 silk-card marble-overlay flex aspect-[16/7] flex-col items-center justify-center text-center">
        <Heart className="h-5 w-5 text-rose" />
        <p className="mt-2 font-display text-2xl italic">Your first look will appear here, darling.</p>
        <p className="mt-1 text-xs text-smoke">Polaroids develop slow on purpose.</p>
      </div>
    );
  }
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <AnimatePresence>
        {items.map((it) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, scale: 0.97, filter: "blur(8px) saturate(0.6)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px) saturate(1)" }}
            transition={{ duration: 0.7 }}
            className="silk-card marble-overlay aspect-[3/4]"
          >
            <div className={`absolute inset-0 ${it.art}`} />
            <div className="absolute right-2 top-2 flex gap-1">
              <span className="rounded-full bg-pearl/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-smoke">
                {it.grade === "graded" ? "for the platform" : "for the feed"}
              </span>
            </div>
            {it.setId && it.setSize && (
              <div className="absolute left-2 top-2">
                <span className="rounded-full bg-champagne-gold px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-noir">
                  set · {it.setIndex}/{it.setSize}
                </span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <Link href="/vault" className="rounded-full bg-pearl/85 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-noir">
                in your vault →
              </Link>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
