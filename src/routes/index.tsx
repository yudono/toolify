import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Flame, ShieldCheck, Zap } from "lucide-react";
import { motion } from "motion/react";
import { tools, categories, accentClass } from "@/lib/tools";
import { ToolCard } from "@/components/site/tool-card";
import { Icon } from "@/components/site/icon";
import { HeroArt } from "@/components/site/hero-art";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Toolify — Developer Tools, Without the Noise" },
      {
        name: "description",
        content:
          "Fast, private developer utilities that run entirely in your browser. Format JSON, decode JWTs, convert colors — no uploads, no backend, no tracking.",
      },
      { property: "og:title", content: "Toolify — Developer Tools, Without the Noise" },
      {
        property: "og:description",
        content: "100% local developer utilities. No uploads. No backend. No tracking.",
      },
    ],
  }),
  component: Index,
});

const INITIAL_COUNT = 12;
const LOAD_MORE_COUNT = 24;

function Index() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const trending = tools.filter((t) => t.trending);
  const allTools = tools;
  const visibleTrending = trending.slice(0, visibleCount);
  const hasMore = visibleCount < tools.length;

  return (
    <div className="overflow-x-clip">
      <section className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Developer Tools,
              <br />
              <span className="text-brand">Without the Noise.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Fast, private developer utilities that run entirely in your browser. No uploads. No
              backend. No tracking.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/tools"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-brand px-6 py-3 text-sm font-semibold text-white shadow-soft transition-transform duration-100 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-lift active:translate-x-0 active:translate-y-0 active:shadow-none"
              >
                Browse Tools <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-surface px-6 py-3 text-sm font-semibold shadow-soft transition-transform duration-100 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-lift active:translate-x-0 active:translate-y-0 active:shadow-none"
              >
                Explore
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-green" /> Private by design
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap className="size-4 text-orange" /> Instant results
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <HeroArt />
          </motion.div>
        </div>
      </section>

      <Section
        eyebrow={<Flame className="size-4 text-orange" />}
        title="Trending this week"
        subtitle="The utilities developers keep coming back to."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={i} />
          ))}
        </div>
      </Section>

      <Section title="All tools" subtitle="Browse every utility — all run locally in your browser.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allTools.slice(0, visibleCount).map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={i} />
          ))}
        </div>
        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisibleCount((c) => Math.min(c + LOAD_MORE_COUNT, tools.length))}
              className="rounded-lg border-2 border-foreground bg-surface px-6 py-3 text-sm font-semibold shadow-soft transition-transform duration-100 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-lift active:translate-x-0 active:translate-y-0 active:shadow-none"
            >
              Load more ({Math.min(visibleCount + LOAD_MORE_COUNT, tools.length)} of {tools.length})
            </button>
          </div>
        )}
        {!hasMore && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Showing all {tools.length} tools.{" "}
            <Link to="/tools" className="font-medium text-brand hover:underline">
              Browse with filters
            </Link>
          </p>
        )}
      </Section>

      <Section title="Popular categories" subtitle="Jump straight to the kind of work you're doing.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => {
            const a = accentClass[c.accent];
            const count = tools.filter((t) => t.category === c.id).length;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.35, delay: (i % 4) * 0.05 }}
              >
                <Link
                  to="/tools"
                  search={{ category: c.id }}
                  className="lift flex h-full flex-col gap-3 rounded-lg border-2 border-foreground bg-surface p-5 shadow-soft"
                >
                  <span
                    className={`grid size-11 place-items-center rounded-lg ${a.bg} ${a.text} border-2 border-foreground shadow-soft`}
                  >
                    <Icon name={c.icon} className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.blurb}</p>
                  </div>
                  <span className="mt-auto text-xs font-medium text-muted-foreground">
                    {count} {count === 1 ? "tool" : "tools"}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </Section>

      <section className="mx-auto w-full max-w-6xl px-5 pt-20">
        <div className="relative overflow-hidden rounded-lg border-2 border-foreground bg-brand px-8 py-14 text-center shadow-lift">
          <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your data never leaves this tab.
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/80">
            Every Toolify utility is plain JavaScript running on your machine. Turn off your wifi
            and it still works.
          </p>
          <Link
            to="/tools"
            className="relative mt-8 inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-white px-6 py-3 text-sm font-semibold text-brand shadow-soft transition-transform duration-100 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-lift active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            Start with a tool <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  cta,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  subtitle: string;
  cta?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-20">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {eyebrow}
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {cta && (
          <Link
            to="/tools"
            className="shrink-0 text-sm font-medium text-brand hover:underline"
          >
            {cta.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
