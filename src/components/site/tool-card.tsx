import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { accentClass, categoryById, type Tool } from "@/lib/tools";
import { Icon } from "./icon";

export function ToolCard({ tool, index = 0 }: { tool: Tool; index?: number }) {
  const a = accentClass[tool.accent];
  const category = categoryById[tool.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to="/tools/$slug"
        params={{ slug: tool.slug }}
        className="lift group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl border border-border/70 bg-surface p-5 shadow-soft"
      >
        <div
          className={`pointer-events-none absolute -right-14 -top-14 size-32 rounded-full bg-gradient-to-br ${a.grad} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-25`}
        />
        <div className="flex items-start justify-between gap-3">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-2xl ${a.bg} ${a.text} ring-1 ${a.ring}`}
          >
            <Icon name={tool.icon} className="size-5" />
          </span>
          <Heart className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-pink" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{tool.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {tool.description}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${a.bg} ${a.text}`}>
            {category?.name}
          </span>
          {tool.isNew && (
            <span className="rounded-full bg-green/12 px-2.5 py-1 text-xs font-medium text-green">
              New
            </span>
          )}
          {tool.trending && (
            <span className="rounded-full bg-orange/12 px-2.5 py-1 text-xs font-medium text-orange">
              Trending
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}