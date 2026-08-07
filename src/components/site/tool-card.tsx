import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { accentClass, categoryById, type Tool } from "@/lib/tools";
import { Icon } from "./icon";
import { useFavoritesContext } from "@/components/favorites-provider";

export function ToolCard({ tool, index = 0 }: { tool: Tool; index?: number }) {
  const a = accentClass[tool.accent];
  const category = categoryById[tool.category];
  const { isFavorite, toggle } = useFavoritesContext();
  const fav = isFavorite(tool.slug);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.04, ease: [0.22, 1, 0.36, 1] }}>
      <Link to="/tools/$slug" params={{ slug: tool.slug }} className="lift group relative flex h-full flex-col gap-4 overflow-hidden rounded-lg border-2 border-foreground bg-surface p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${a.bg} ${a.text} border-2 border-foreground`}>
            <Icon name={tool.icon} className="size-5" />
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(tool.slug);
            }}
            className="shrink-0 rounded-md p-1 transition-colors hover:bg-pink/10"
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`size-4 transition-colors ${
                fav ? "fill-pink text-pink" : "text-muted-foreground/40 group-hover:text-pink"
              }`}
            />
          </button>
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{tool.name}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <span className={`rounded-sm px-2.5 py-1 text-xs font-medium border border-foreground/20 ${a.bg} ${a.text}`}>{category?.name}</span>
          {tool.isNew && (<span className="rounded-sm bg-green/12 px-2.5 py-1 text-xs font-medium text-green border border-green/30">New</span>)}
          {tool.trending && (<span className="rounded-sm bg-orange/12 px-2.5 py-1 text-xs font-medium text-orange border border-orange/30">Trending</span>)}
        </div>
      </Link>
    </motion.div>
  );
}
