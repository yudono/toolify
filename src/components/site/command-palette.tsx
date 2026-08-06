import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { tools, categories, categoryById, accentClass } from "@/lib/tools";
import { Icon } from "./icon";

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search developer tools..." />
      <CommandList>
        <CommandEmpty>Nothing matched. Try “json” or “base64”.</CommandEmpty>
        <CommandGroup heading="Tools">
          {tools.map((tool) => {
            const a = accentClass[tool.accent];
            return (
              <CommandItem
                key={tool.slug}
                value={`${tool.name} ${tool.description} ${categoryById[tool.category]?.name}`}
                onSelect={() => {
                  onOpenChange(false);
                  navigate({ to: "/tools/$slug", params: { slug: tool.slug } });
                }}
                className="gap-3 rounded-xl py-2.5"
              >
                <span className={`grid size-7 place-items-center rounded-lg ${a.bg} ${a.text}`}>
                  <Icon name={tool.icon} className="size-4" />
                </span>
                <span className="font-medium">{tool.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {categoryById[tool.category]?.name}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Categories">
          {categories.map((c) => (
            <CommandItem
              key={c.id}
              value={`category ${c.name}`}
              onSelect={() => {
                onOpenChange(false);
                navigate({ to: "/tools", search: { category: c.id } });
              }}
              className="gap-3 rounded-xl py-2.5"
            >
              <Icon name={c.icon} className={`size-4 ${accentClass[c.accent].text}`} />
              {c.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}