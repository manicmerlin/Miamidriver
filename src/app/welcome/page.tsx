"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "@/lib/state";
import { Bow, FourPointStar, LockKey, Pearl, Sparkle } from "@/components/icons";
import { SparkleField } from "@/components/SparkleField";
import { cn } from "@/lib/cn";

type Step = "intro" | "id" | "consent" | "upload" | "training" | "done";

export default function Welcome() {
  const [step, setStep] = useState<Step>("intro");
  const { state, set } = useAccount();
  const router = useRouter();

  const motivations = [
    "Your face. Your model. Your moment. ✦",
    "We're teaching the model your jawline, darling.",
    "Memorizing your light. Memorizing your angles.",
    "Eight minutes from here. Promise.",
    "Cooking. ✦",
  ];
  const [tickIdx, setTickIdx] = useState(0);

  useEffect(() => {
    if (step !== "training") return;
    const t = setInterval(() => {
      set({ trainingProgress: Math.min(100, state.trainingProgress + 4) });
    }, 280);
    const m = setInterval(() => setTickIdx((i) => (i + 1) % motivations.length), 1900);
    return () => {
      clearInterval(t);
      clearInterval(m);
    };
  }, [step, state.trainingProgress, set]);

  useEffect(() => {
    if (step === "training" && state.trainingProgress >= 100) {
      set({ modelTrained: true });
      const t = setTimeout(() => setStep("done"), 700);
      return () => clearTimeout(t);
    }
  }, [state.trainingProgress, step, set]);

  return (
    <section className="relative mx-auto max-w-3xl px-6 py-16">
      <SparkleField />
      <header className="text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">welcome to the atelier</p>
        <h1 className="mt-2 font-display text-5xl italic">
          Hi, <span className="gold-text">gorgeous.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-smoke">
          A few quick steps. We do this once — then it's just generating, darling.
        </p>
      </header>

      <Stepper step={step} />

      <div className="mt-10">
        <AnimatePresence mode="wait">
          {step === "intro" && (
            <Card key="intro">
              <h2 className="font-display text-3xl italic">What you'll do.</h2>
              <ol className="mt-4 space-y-3 text-smoke">
                <li><span className="font-medium text-noir">1.</span> Verify your ID. (~2 min)</li>
                <li><span className="font-medium text-noir">2.</span> Sign the consent record. (~1 min)</li>
                <li><span className="font-medium text-noir">3.</span> Upload 20–30 selfies. (~3 min)</li>
                <li><span className="font-medium text-noir">4.</span> Let the model train. (~8 min)</li>
              </ol>
              <p className="mt-6 text-xs text-smoke">
                We only ever generate looks of <em>you</em>. That's the whole product. No celebrities,
                no other people, no exceptions.
              </p>
              <button onClick={() => setStep("id")} className="btn-rose mt-6 w-full">
                Begin <Sparkle className="h-4 w-4" />
              </button>
            </Card>
          )}

          {step === "id" && (
            <Card key="id">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blush p-2 text-hot-pink"><LockKey className="h-4 w-4" /></div>
                <h2 className="font-display text-3xl italic">Quick "it's you" check.</h2>
              </div>
              <p className="mt-3 text-smoke">
                Takes about 90 seconds — the only thing we'll ever ask for. It's how we make sure
                no one else can pretend to be you here, and the only way the atelier opens.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <FauxField label="Legal name" placeholder="Jane Vivienne Doe" />
                <FauxField label="Date of birth" placeholder="01 / 14 / 2000" />
                <FauxField label="Country" placeholder="United States" />
                <FauxField label="ID type" placeholder="Driver's license" />
              </div>
              <button
                onClick={() => {
                  set({ idVerified: true });
                  setStep("consent");
                }}
                className="btn-rose mt-6 w-full"
              >
                Run verification ✦
              </button>
              <p className="mt-3 text-center text-[11px] text-smoke">
                Demo build — no ID is actually transmitted. Wire `ID_VERIFY_PROVIDER` in production.
              </p>
            </Card>
          )}

          {step === "consent" && (
            <Card key="consent">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-champagne-gold p-2 text-noir"><FourPointStar className="h-4 w-4" /></div>
                <h2 className="font-display text-3xl italic gold-text">The little yes.</h2>
              </div>
              <p className="mt-3 text-smoke">
                One quick agreement so we can open the platform-ready cut for you. Kept private,
                kept forever, only ever shown to your account.
              </p>
              <ul className="mt-5 list-inside list-[circle] space-y-1 text-sm text-noir/85">
                <li>The girl in the selfies is me.</li>
                <li>I'm 18+, and was 18+ in every photo I uploaded.</li>
                <li>It's only ever me — no one else's face goes through here.</li>
                <li>Looks I make are mine to use, on the platforms that allow them.</li>
              </ul>
              <label className="mt-5 flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={state.consent2257}
                  onChange={(e) => set({ consent2257: e.target.checked })}
                  className="h-4 w-4 accent-hot-pink"
                />
                I sign the record, darling.
              </label>
              <button
                onClick={() => state.consent2257 && setStep("upload")}
                disabled={!state.consent2257}
                className={cn("btn-gold mt-6 w-full", !state.consent2257 && "opacity-50")}
              >
                Sign & continue
              </button>
            </Card>
          )}

          {step === "upload" && (
            <Card key="upload">
              <h2 className="font-display text-3xl italic">Drop in your selfies.</h2>
              <p className="mt-3 text-smoke">
                20–30 photos. Front, side, three-quarter. Varied lighting. Clean face. No filters.
              </p>
              <UploadDrop />
              <button onClick={() => setStep("training")} className="btn-rose mt-6 w-full">
                Train my model ✦
              </button>
              <p className="mt-3 text-center text-[11px] text-smoke">
                Demo build — files stay in your browser; nothing uploads.
              </p>
            </Card>
          )}

          {step === "training" && (
            <Card key="training">
              <div className="flex items-center justify-center">
                <Bow className="h-12 w-20 animate-bow-spin text-hot-pink" />
              </div>
              <h2 className="mt-3 text-center font-display text-3xl italic">Cooking. ✦</h2>
              <p className="mx-auto mt-2 max-w-xs text-center text-smoke">
                {motivations[tickIdx]}
              </p>
              <div className="pearl-progress mt-6">
                <span style={{ width: `${state.trainingProgress}%` }} />
              </div>
              <p className="mt-2 text-center text-[11px] uppercase tracking-[0.22em] text-smoke">
                {state.trainingProgress}%
              </p>
            </Card>
          )}

          {step === "done" && (
            <Card key="done">
              <div className="flex items-center justify-center"><Pearl className="h-10 w-10" /></div>
              <h2 className="mt-3 text-center font-display text-4xl italic">Your model is ready.</h2>
              <p className="mx-auto mt-2 max-w-md text-center text-smoke">
                Welcome to the atelier, darling. Three packs are queued up on the vanity for you.
              </p>
              <button onClick={() => router.push("/atelier")} className="btn-rose mt-6 w-full">
                Open the atelier ✦
              </button>
            </Card>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Card({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      {...(rest as object)}
    >
      <div className="silk-card marble-overlay p-7">{children}</div>
    </motion.div>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ["intro", "id", "consent", "upload", "training", "done"];
  const idx = order.indexOf(step);
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      {order.map((s, i) => (
        <div
          key={s}
          className={cn(
            "h-1.5 w-8 rounded-full transition",
            i <= idx ? "bg-gradient-to-r from-rose to-hot-pink" : "bg-blush/60",
          )}
        />
      ))}
    </div>
  );
}

function FauxField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-smoke">{label}</span>
      <input
        className="mt-1 w-full rounded-full border border-rose/30 bg-pearl/80 px-4 py-2 text-sm shadow-pearl outline-none transition focus:border-hot-pink"
        placeholder={placeholder}
      />
    </label>
  );
}

function UploadDrop() {
  const [count, setCount] = useState(0);
  return (
    <label className="mt-5 flex h-44 cursor-pointer flex-col items-center justify-center rounded-vanity border-2 border-dashed border-rose/40 bg-pearl/60 text-center transition hover:border-hot-pink/60 hover:bg-blush/30">
      <input
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => setCount((c) => c + (e.target.files?.length ?? 0))}
      />
      <p className="font-display text-2xl italic">drop your selfies, darling</p>
      <p className="mt-1 text-xs text-smoke">{count} added · 20–30 recommended</p>
    </label>
  );
}
