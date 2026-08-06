import { Link } from "@tanstack/react-router";
import { Github } from "lucide-react";
import { Icon } from "./icon";

export function Footer() {
  return (
    <footer className="mt-24">
      <div className="h-1 w-full bg-gradient-brand" />
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-10 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-gradient-brand text-white">
            <Icon name="Wrench" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Toolify</p>
            <p className="text-xs text-muted-foreground">Local-first developer utilities.</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <Github className="size-4" /> GitHub
          </a>
        </nav>
      </div>
      <p className="pb-10 text-center text-xs text-muted-foreground">
        No accounts. No cookies. No tracking. © {new Date().getFullYear()} Toolify.
      </p>
    </footer>
  );
}