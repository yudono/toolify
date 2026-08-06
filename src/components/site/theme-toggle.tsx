import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("toolify-theme", next ? "dark" : "light");
    } catch {
      /* storage blocked */
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="grid size-10 shrink-0 place-items-center rounded-2xl border border-border/70 bg-surface text-muted-foreground transition-colors hover:text-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}