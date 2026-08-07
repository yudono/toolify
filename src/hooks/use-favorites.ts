import { useState, useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "toolify-favorites";

function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFavorites(slugs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {}
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return JSON.stringify(readFavorites());
}

function getServerSnapshot() {
  return "[]";
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFavorites(readFavorites());
    setMounted(true);
  }, []);

  const toggle = useCallback((slug: string) => {
    setFavorites((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      writeFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((slug: string) => mounted && favorites.includes(slug), [favorites, mounted]);

  return { favorites, toggle, isFavorite };
}
