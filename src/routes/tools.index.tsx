import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal, PackageOpen } from "lucide-react";
import { motion } from "motion/react";
import { tools, categories, accentClass, type CategoryId } from "@/lib/tools";
import { ToolCard } from "@/components/site/tool-card";
import { Icon } from "@/components/site/icon";

type ToolsSearch = { category?: CategoryId; q?: string };

export const Route = createFileRoute("/tools")({
  validateSearch: (search: Record<string, unknown>): ToolsSearch => ({
    category: (search["category"] as CategoryId) || undefined,
    q: (search["q"] as string) || undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse all tools — Toolify" },
      {
        name: "description",
        content:
          "Search and filter every Toolify utility — JSON, text, CSS, security and converters that run entirely in your browser.",
      },
      { property: "og:title", content: "Browse all tools — Toolify" },
      {
        property: "og:description",
        content: "Fast, private developer utilities. Filter by category and start instantly.",
      },
    ],
  }),
  component: ToolsIndex,
});

function ToolsIndex() {
  const search = Route.useSearch();
  const [query, setQuery] = useState(search.q ?? "");
  const [active, setActive] = useState<CategoryId | "all">(search.category ?? "all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter(
      (t) =>
        (active === "all" || t.category === active) &&
        (!q || `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q)),
    );
  }, [query, active]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-20">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <SlidersHorizontal className="size-3.5" /> {tools.length} tools ready
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Browse the <span className="text-gradient">toolbox</span>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Everything runs locally in your tab. Nothing is uploaded, nothing is logged.
        </p>
      </div>

      <div className="sticky top-20 z-20 mt-8 rounded-3xl">
        <div className="glass-card flex items-center gap-3 rounded-3xl px-5 py-3 focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search developer tools..."
            className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterChip label="All" active={active === "all"} onClick={() => setActive("all")} />
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            label={c.name}
            icon={c.icon}
            accent={accentClass[c.accent].text}
            active={active === c.id}
            onClick={() => setActive(c.id)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState onReset={() => (setQuery(""), setActive("all"))} />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={i} />
          ))}
        </div>
      )}

      <p className="mt-12 text-center text-sm text-muted-foreground">
        Missing something?{" "}
        <Link to="/contact" className="font-medium text-brand hover:underline">
          Tell us what to build next
        </Link>
        .
      </p>
    </div>
  );
}

function FilterChip({
  label,
  icon,
  accent,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  accent?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "border-transparent bg-gradient-brand text-white shadow-soft"
          : "border-border/70 bg-surface text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon && <Icon name={icon} className={`size-4 ${active ? "" : accent}`} />}
      {label}
    </button>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="mt-12 flex flex-col items-center rounded-3xl border border-dashed border-border bg-surface-muted px-6 py-16 text-center"
    >
      <span className="grid size-16 place-items-center rounded-3xl bg-gradient-brand text-white shadow-soft">
        <PackageOpen className="size-7" />
      </span>
      <h3 className="mt-5 text-lg font-semibold">Nothing matched that search</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Try a broader term like “json”, “color” or “encode” — or reset the filters and browse
        everything.
      </p>
      <button
        onClick={onReset}
        className="mt-6 rounded-2xl bg-gradient-brand px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-transform duration-200 hover:scale-[1.03]"
      >
        Reset filters
      </button>
    </motion.div>
  );
}