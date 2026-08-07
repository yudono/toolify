import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, PackageOpen } from "lucide-react";
import { motion } from "motion/react";
import { tools } from "@/lib/tools";
import { ToolCard } from "@/components/site/tool-card";
import { useFavoritesContext } from "@/components/favorites-provider";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Favorites — Toolify" },
      { name: "description", content: "Your saved developer tools." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites } = useFavoritesContext();
  const favTools = tools.filter((t) => favorites.includes(t.slug));

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-20">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-sm border-2 border-foreground bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Heart className="size-3.5 fill-pink text-pink" /> {favTools.length} saved
        </span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          Your <span className="text-brand">favorites</span>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Tools you've saved for quick access. Stored locally in your browser.
        </p>
      </div>

      {favTools.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mt-12 flex flex-col items-center rounded-lg border-2 border-dashed border-foreground bg-surface-muted px-6 py-16 text-center"
        >
          <span className="grid size-16 place-items-center rounded-lg bg-brand text-white border-2 border-foreground shadow-soft">
            <Heart className="size-7" />
          </span>
          <h3 className="mt-5 text-lg font-semibold">No favorites yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Click the heart icon on any tool to save it here for quick access.
          </p>
          <Link
            to="/tools"
            className="mt-6 rounded-lg border-2 border-foreground bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-transform duration-100 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-lift active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            Browse tools
          </Link>
        </motion.div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favTools.map((tool, i) => (
            <ToolCard key={tool.slug} tool={tool} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
