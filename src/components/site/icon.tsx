import * as Lucide from "lucide-react";
import type { LucideProps } from "lucide-react";

const registry = Lucide as unknown as Record<string, React.ComponentType<LucideProps>>;

export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Cmp = registry[name] ?? Lucide.Sparkles;
  return <Cmp {...props} />;
}