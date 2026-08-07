import { Link } from "@tanstack/react-router";
import { Github, Heart, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { categories, accentClass } from "@/lib/tools";
import { Icon } from "./icon";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette, useCommandPalette } from "./command-palette";
import { useFavoritesContext } from "@/components/favorites-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { open, setOpen } = useCommandPalette();
  const { favorites } = useFavoritesContext();
  const [mobile, setMobile] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:flex sm:gap-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-white border-2 border-foreground shadow-soft">
              <Icon name="Wrench" className="size-4.5" />
            </span>
            <span className="truncate text-lg font-semibold tracking-tight">Toolify</span>
          </Link>

          <button
            onClick={() => setOpen(true)}
            className="hidden min-w-0 flex-1 items-center gap-2.5 rounded-lg border-2 border-foreground bg-surface px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-brand sm:flex"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Search developer tools...</span>
            <kbd className="ml-auto hidden shrink-0 rounded border-2 border-foreground px-1.5 py-0.5 font-mono text-[10px] md:block">
              ⌘K
            </kbd>
          </button>

          <nav className="hidden shrink-0 items-center gap-1 md:flex">
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Categories
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-lg border-2 border-foreground p-2 shadow-soft">
                {categories.map((c) => (
                  <DropdownMenuItem key={c.id} asChild className="rounded-lg">
                    <Link to="/tools" search={{ category: c.id }} className="gap-2.5">
                      <Icon name={c.icon} className={`size-4 ${accentClass[c.accent].text}`} />
                      {c.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              to="/tools"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              All tools
            </Link>
            <Link
              to="/tools"
              search={{ category: "all", q: "favorites" }}
              className="relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Heart className={`size-3.5 ${favorites.length > 0 ? "fill-pink text-pink" : ""}`} />
              Favorites
              {favorites.length > 0 && (
                <span className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-pink text-[10px] font-bold text-white">
                  {favorites.length}
                </span>
              )}
            </Link>
            <Link
              to="/about"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              aria-label="Search"
              className="grid size-10 place-items-center rounded-lg border-2 border-foreground bg-surface text-muted-foreground sm:hidden"
            >
              <Search className="size-4" />
            </button>
            <ThemeToggle />
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="hidden size-10 place-items-center rounded-lg border-2 border-foreground bg-surface text-muted-foreground transition-colors hover:text-foreground sm:grid"
            >
              <Github className="size-4" />
            </a>
            <button
              onClick={() => setMobile((m) => !m)}
              aria-label="Menu"
              className="grid size-10 place-items-center rounded-lg border-2 border-foreground bg-surface text-muted-foreground md:hidden"
            >
              {mobile ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {mobile && (
          <div className="border-t-2 border-foreground px-5 py-3 md:hidden">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to="/tools"
                  search={{ category: c.id }}
                  onClick={() => setMobile(false)}
                  className={`rounded-sm px-3 py-1.5 text-sm font-medium border border-foreground/20 ${accentClass[c.accent].bg} ${accentClass[c.accent].text}`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
              <Link to="/tools" onClick={() => setMobile(false)}>
                All tools
              </Link>
              <Link to="/tools" search={{ category: "all", q: "favorites" }} onClick={() => setMobile(false)} className="inline-flex items-center gap-1">
                <Heart className={`size-3 ${favorites.length > 0 ? "fill-pink text-pink" : ""}`} />
                Favorites {favorites.length > 0 && `(${favorites.length})`}
              </Link>
              <Link to="/about" onClick={() => setMobile(false)}>
                About
              </Link>
              <Link to="/privacy" onClick={() => setMobile(false)}>
                Privacy
              </Link>
            </div>
          </div>
        )}
      </header>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}