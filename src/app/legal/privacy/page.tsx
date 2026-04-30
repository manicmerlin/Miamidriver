export default function Privacy() {
  return (
    <article className="prose mx-auto max-w-3xl px-6 py-16 prose-headings:font-display prose-headings:italic prose-p:text-smoke">
      <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">policy</p>
      <h1 className="font-display text-5xl italic">Privacy.</h1>
      <p>
        We collect only what we need to run your atelier — verified ID details (held by our
        verification provider, not by us), your reference selfies, your trained model, your
        generations, and your billing history.
      </p>
      <p>
        Your trained LoRA is yours. You can export the weights from <code>/account</code> and remove
        them from our systems at any time. Generations are kept 90 days on Darling, indefinitely on
        Bombshell and Icon, or until you delete them.
      </p>
      <p>
        We do not sell, share, or use your reference data to train a public model. Ever.
      </p>
    </article>
  );
}
