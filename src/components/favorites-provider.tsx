import { createContext, useContext } from "react";
import { useFavorites } from "@/hooks/use-favorites";

type FavoritesCtx = ReturnType<typeof useFavorites>;

const FavoritesContext = createContext<FavoritesCtx | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const favorites = useFavorites();
  return (
    <FavoritesContext.Provider value={favorites}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavoritesContext must be used within FavoritesProvider");
  return ctx;
}
