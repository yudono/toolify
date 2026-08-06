export function PageShell({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-20">
      <p className="text-sm font-medium text-brand">{kicker}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 text-base leading-relaxed text-muted-foreground [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
      {children}
    </div>
  );
}