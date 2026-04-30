import Link from "next/link";

// /trust — written for processors, partners, investors, and the policy-curious user.
// Different audience, different voice. The friendly version of this lives on /, in
// /welcome, and in the in-app sidecards.

export const metadata = {
  title: "How we keep you safe — La Di Da",
  description:
    "Identity verification, moderation, AI disclosure, and merchant practices behind La Di Da.",
};

export default function Trust() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">Trust & safety</p>
      <h1 className="mt-2 font-display text-5xl italic">How we keep you safe.</h1>
      <p className="mt-3 text-smoke">
        The friendly version of this is on the rest of the site. The version below is for the
        people who need the receipts — processors, partners, the policy-curious, lawyers.
      </p>

      <div className="hairline my-8" />

      <Section title="Identity verification (every account, no exceptions)">
        <p>
          Every account that uses La Di Da clears a government-ID + live-selfie verification flow
          before any model is trained. We integrate with{" "}
          <strong>Persona, Stripe Identity, or Veriff</strong> depending on geography. Verification
          state is the gate on every generation request — the absence of an active verified record
          is a <code>403</code>, server-side, on every call to <code>/api/generate</code>.
        </p>
        <p>
          We do not retain raw ID images. The verification provider stores them under their own
          retention policy; we hold the verification result, the issuer-anonymized hash, and the
          timestamp.
        </p>
      </Section>

      <Section title="Self-only generation">
        <p>
          La Di Da only generates likenesses of the verified account holder. This is enforced
          architecturally — every generation request is bound to a personal LoRA whose training
          set is the verified user's reference photos. Prompts that imply a third party (named
          public figures, descriptive likenesses of identifiable individuals, "looks like X")
          fail closed at the prompt-classifier stage before any inference begins.
        </p>
      </Section>

      <Section title="Moderation (pre-flight + post-output, fail closed)">
        <p>Every generation passes through two moderation stages:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            <strong>Pre-flight:</strong> a banned-term classifier plus the Hive Moderation prompt
            API. Hard-fails on minor / celebrity / non-consensual likeness language. No inference is
            run if pre-flight fails.
          </li>
          <li>
            <strong>Post-output:</strong> Hive Moderation and Thorn Safer in parallel on every
            asset. Either provider erroring out is treated as a failure (we fail closed). CSAM-class
            detections are immediate: the asset is suppressed, the account is suspended, the
            incident is escalated to a human reviewer, and a NCMEC report is filed where required.
          </li>
        </ul>
      </Section>

      <Section title="AI disclosure (immutable, on every output)">
        <p>
          Every still and clip carries an <code>aiGenerated: true</code> EXIF tag plus an
          <code> aiModel</code> identifier, the prompt that produced it, the verified user's
          opaque ID, and a creation timestamp. Users cannot disable the EXIF tag — it is required
          to keep their accounts in good standing on OnlyFans, Fanvue, Fansly, Meta and TikTok.
          Users can additionally opt in to a visible AI badge on the graded channel.
        </p>
      </Section>

      <Section title="Records & retention (a.k.a. 2257-style)">
        <p>
          For every account that uses the graded channel, we maintain a record permanently linked
          to the verified ID, capturing: the verification result and timestamp, signed consent
          that all reference photos are of the user and were taken at age 18+, an acknowledgement
          that all outputs are AI-disclosed, and an immutable index of every graded generation.
          Records are encrypted at rest. Custodian-of-records contact:{" "}
          <a href="mailto:records@ladida.studio">records@ladida.studio</a>.
        </p>
      </Section>

      <Section title="Merchant processing">
        <p>
          La Di Da uses adult-friendly processors only — <strong>CCBill, Segpay, Epoch</strong>{" "}
          for card processing, with <strong>NOWPayments / Coinbase Commerce</strong> for crypto
          fallback. We do not use Stripe or any processor whose AUP forbids adult content.
        </p>
      </Section>

      <Section title="Data residency, subprocessors, deletion">
        <p>
          Reference photos and generated assets live in Cloudflare R2. The Postgres primary lives
          in the user's region of residence where supported. Personal LoRA weights are
          user-exportable from the account page; deletion purges the LoRA and all associated
          assets within 14 days. We do not, ever, train a public or shared model on any user's
          reference data.
        </p>
      </Section>

      <Section title="What we don't do">
        <ul className="ml-6 list-disc space-y-1">
          <li>Generate likenesses of anyone other than the verified account holder.</li>
          <li>Generate minors. Pre- and post-flight CSAM detection runs on every job.</li>
          <li>Strip or weaken the AI EXIF tag.</li>
          <li>Sell, share, or fine-tune external models on user data.</li>
          <li>Process payments through providers whose AUP forbids the use case.</li>
        </ul>
      </Section>

      <div className="hairline my-10" />

      <p className="text-sm text-smoke">
        Questions for partners, processors, press:{" "}
        <a href="mailto:trust@ladida.studio" className="underline">trust@ladida.studio</a>. The
        friendlier version of all of this lives on the{" "}
        <Link href="/" className="underline">homepage</Link>.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl italic">{title}</h2>
      <div className="mt-2 space-y-3 text-sm text-noir/85">{children}</div>
    </section>
  );
}
