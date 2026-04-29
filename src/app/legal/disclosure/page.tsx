export default function Disclosure() {
  return (
    <article className="prose mx-auto max-w-3xl px-6 py-16 prose-headings:font-display prose-headings:italic prose-p:text-smoke">
      <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">policy</p>
      <h1 className="font-display text-5xl italic">AI disclosure.</h1>
      <p>
        Every still and clip generated through La Di Da is AI-assisted. We tag every output with an
        <code> aiGenerated: true </code> flag in EXIF metadata, an <code>aiModel</code> identifier,
        and the prompt that produced it. This is non-negotiable and cannot be disabled — it protects
        your account on OnlyFans, Fanvue, Fansly, Meta and TikTok, all of which require AI disclosure
        under their current policies.
      </p>
      <p>
        For the graded channel you may additionally enable a visible <em>✦ AI</em> badge in your
        account settings. We recommend it. Enforcement is increasing.
      </p>
      <h2 className="font-display text-3xl italic">What we never do</h2>
      <ul>
        <li>Generate likenesses of anyone other than the verified account holder.</li>
        <li>Generate minors. (Pre- and post-flight CSAM detection runs on every job.)</li>
        <li>Strip or weaken the AI EXIF tag.</li>
      </ul>
    </article>
  );
}
