"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, type VaultItem } from "@/lib/state";
import { PACKS } from "@/lib/packs";
import { Heart, Sparkle, Pearl } from "@/components/icons";
import { cn } from "@/lib/cn";

type Filter = "all" | "favorites" | "sfw" | "graded" | "video" | "sets";

export default function Vault() {
  const { state, toggleFavorite, removeVault } = useAccount();
  const [filter, setFilter] = useState<Filter>("all");
  const [packFilter, setPackFilter] = useState<string>("all");
  const [confirm, setConfirm] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const items = useMemo(() => {
    return state.vault.filter((v) => {
      if (filter === "favorites" && !v.favorite) return false;
      if (filter === "sfw" && v.grade !== "sfw") return false;
      if (filter === "graded" && v.grade !== "graded") return false;
      if (filter === "video" && v.type !== "video") return false;
      if (filter === "sets" && !v.setId) return false;
      if (packFilter !== "all" && v.packId !== packFilter) return false;
      return true;
    });
  }, [state.vault, filter, packFilter]);

  function selectWholeSet(setId: string) {
    setSelected((s) => {
      const next = new Set(s);
      state.vault.filter((v) => v.setId === setId).forEach((v) => next.add(v.id));
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkDelete() {
    removeVault(Array.from(selected));
    setSelected(new Set());
    setConfirm(false);
  }

  function downloadZip() {
    // stub — in production this hits /api/vault/zip and pipes a .zip with EXIF intact
    const lines = items.map(
      (i) => `${i.id}\t${i.packId}\t${i.presetId}\t${i.grade}\t${i.type}\t${new Date(i.createdAt).toISOString()}`,
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ladida-vault-manifest.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (state.vault.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <Pearl className="mx-auto h-10 w-10" />
        <h1 className="mt-3 font-display text-5xl italic">Your vault is waiting.</h1>
        <p className="mt-2 text-smoke">Generate your first look, darling.</p>
        <Link href="/atelier" className="btn-rose mt-6">Open the atelier ✦</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-smoke">Vault</p>
          <h1 className="font-display text-5xl italic">Your looks.</h1>
          <p className="mt-1 text-smoke">{state.vault.length.toLocaleString()} pieces, all yours.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadZip} className="btn-ghost text-sm">Export manifest</button>
          {selected.size > 0 && (
            <button onClick={() => setConfirm(true)} className="btn-rose text-sm">
              Remove {selected.size}
            </button>
          )}
        </div>
      </header>

      <div className="hairline my-6" />

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "favorites", "sfw", "graded", "sets", "video"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("chip", filter === f && "chip-active")}
          >
            {f === "sfw" ? "for the feed" : f === "graded" ? "for the platform" : f === "sets" ? "sets ✦" : f}
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-rose/30" />
        <button
          onClick={() => setPackFilter("all")}
          className={cn("chip", packFilter === "all" && "chip-active")}
        >
          all packs
        </button>
        {PACKS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPackFilter(p.id)}
            className={cn("chip", packFilter === p.id && "chip-active")}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => (
          <Tile
            key={it.id}
            item={it}
            selected={selected.has(it.id)}
            onSelect={() => toggleSelected(it.id)}
            onFavorite={() => toggleFavorite(it.id)}
            onSelectSet={selectWholeSet}
          />
        ))}
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-noir/40 p-6 backdrop-blur"
          onClick={() => setConfirm(false)}
        >
          <div className="silk-card marble-overlay max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-3xl italic">Are you sure, gorgeous?</h3>
            <p className="mt-2 text-smoke">{selected.size} look{selected.size === 1 ? "" : "s"} will be gone forever.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost text-sm" onClick={() => setConfirm(false)}>Keep them</button>
              <button className="btn-rose text-sm" onClick={bulkDelete}>Yes, remove</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Tile({
  item,
  selected,
  onSelect,
  onFavorite,
  onSelectSet,
}: {
  item: VaultItem;
  selected: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onSelectSet?: (setId: string) => void;
}) {
  const pack = PACKS.find((p) => p.id === item.packId);
  return (
    <div className={cn("silk-card marble-overlay aspect-[3/4]", selected && "ring-2 ring-hot-pink")}
    >
      <button onClick={onSelect} className="absolute inset-0" aria-label="select">
        <span className="sr-only">select</span>
      </button>
      <div className={`absolute inset-0 ${item.art}`} />
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <span className="rounded-full bg-pearl/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-smoke">
          {item.grade === "graded" ? "for the platform" : "for the feed"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="rounded-full bg-pearl/85 p-1.5 text-rose hover:text-hot-pink"
          aria-label="favorite"
        >
          <Heart className="h-3.5 w-3.5" filled={item.favorite} />
        </button>
      </div>
      {item.setId && item.setSize && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (item.setId && onSelectSet) onSelectSet(item.setId);
          }}
          className="absolute left-2 top-2 z-10 rounded-full bg-champagne-gold px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-noir transition hover:brightness-105"
          title="select the whole set"
        >
          set · {item.setIndex}/{item.setSize}
        </button>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="rounded-full bg-pearl/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-smoke">
          {pack?.name ?? item.packId}
        </span>
        <span className="rounded-full bg-pearl/85 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-smoke">
          {item.type === "video" ? "5s ▸" : <Sparkle className="inline h-2.5 w-2.5" />}
        </span>
      </div>
    </div>
  );
}
