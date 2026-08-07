import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronRight, Copy, Download, Trash2, Wand2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { accentClass, categoryById, tools, toolsBySlug } from "@/lib/tools";
import { Icon } from "@/components/site/icon";
import { ToolCard } from "@/components/site/tool-card";
import { CodeEditor } from "@/components/site/code-editor";

export const Route = createFileRoute("/tools/$slug")({
  loader: ({ params }) => {
    const tool = toolsBySlug[params.slug];
    if (!tool) throw notFound();
    return { name: tool.name, description: tool.description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Tool not found — Toolify" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.name} — Toolify`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.description },
      ],
    };
  },
  component: ToolPage,
  notFoundComponent: ToolNotFound,
});

function ToolNotFound() {
  return (
    <div className="mx-auto max-w-md px-5 py-32 text-center">
      <h1 className="text-2xl font-semibold">That tool doesn’t exist yet</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have been renamed. Browse the full toolbox instead.
      </p>
      <Link
        to="/tools"
        className="mt-6 inline-flex rounded-lg border-2 border-foreground bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-soft"
      >
        Browse tools
      </Link>
    </div>
  );
}

function ToolPage() {
  const { slug } = Route.useParams();
  const tool = toolsBySlug[slug]!;
  const a = accentClass[tool.accent];
  const category = categoryById[tool.category]!;

  const [input, setInput] = useState(tool.sample ?? "");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const related = tools
    .filter((t) => t.slug !== tool.slug && t.category === tool.category)
    .concat(tools.filter((t) => t.slug !== tool.slug && t.category !== tool.category))
    .slice(0, 3);

  const runAction = async (action: string) => {
    try {
      const result = tool.run(input, action);
      const output = result instanceof Promise ? await result : result;
      setOutput(output);
      setError("");
    } catch (e) {
      setOutput("");
      setError((e as Error).message);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tool.slug}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link to="/tools" className="hover:text-foreground">
          Tools
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-foreground">{tool.name}</span>
      </nav>

      <header className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className={`grid size-14 shrink-0 place-items-center rounded-lg ${a.bg} ${a.text} border-2 border-foreground`}
          >
            <Icon name={tool.icon} className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {tool.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
          </div>
        </div>
        <Link
          to="/tools"
          search={{ category: tool.category }}
          className={`shrink-0 rounded-sm border border-foreground/20 px-3 py-1.5 text-xs font-medium ${a.bg} ${a.text}`}
        >
          {category.name}
        </Link>
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {!tool.generator && (
          <Panel
            title={tool.inputLabel ?? "Input"}
            action={
              input && (
                <button
                  onClick={() => (setInput(""), setOutput(""), setError(""))}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-3.5" /> Clear
                </button>
              )
            }
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tool.placeholder ?? "Paste your content here..."}
              spellCheck={false}
              className="h-72 w-full resize-none rounded-lg bg-surface-muted p-4 font-mono text-sm leading-relaxed outline-none border-2 border-foreground transition-shadow focus:ring-2 focus:ring-ring/50"
            />
          </Panel>
        )}

        <Panel
          title={tool.outputLabel ?? "Output"}
          className={tool.generator ? "lg:col-span-2" : ""}
          action={
            output && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/20 bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/70"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  Copy
                </button>
                <button
                  onClick={download}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/20 bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/70"
                >
                  <Download className="size-3.5" /> Download
                </button>
              </div>
            )
          }
        >
          {error ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-lg bg-destructive/8 p-6 text-center border-2 border-destructive/30">
              <span className="grid size-12 place-items-center rounded-lg bg-destructive/12 text-destructive">
                <Icon name="TriangleAlert" className="size-5" />
              </span>
              <p className="mt-4 max-w-sm text-sm font-medium text-destructive">{error}</p>
            </div>
          ) : output ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="h-72 w-full overflow-hidden rounded-lg"
            >
              <CodeEditor value={output} height="100%" />
            </motion.div>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center rounded-lg border-2 border-dashed border-foreground bg-surface-muted p-6 text-center">
              <span className="grid size-12 place-items-center rounded-lg bg-brand text-white border-2 border-foreground">
                <Wand2 className="size-5" />
              </span>
              <p className="mt-4 text-sm text-muted-foreground">
                Results appear here. Everything is processed in your browser.
              </p>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {tool.actions.map((action, i) => (
          <button
            key={action.id}
            onClick={() => runAction(action.id)}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold border-2 border-foreground transition-transform duration-100 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-lift active:translate-x-0 active:translate-y-0 active:shadow-none ${
              i === 0
                ? "bg-brand text-white shadow-soft"
                : "bg-surface text-foreground shadow-soft"
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="text-xl font-semibold tracking-tight">Frequently asked</h2>
        <Accordion type="single" collapsible className="mt-4 overflow-hidden rounded-lg border-2 border-foreground bg-surface px-5 shadow-soft">
          {tool.faq.map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border-border/60">
              <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="mt-16">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Related tools</h2>
          <Link
            to="/tools"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:gap-2 hover:underline"
          >
            All tools <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((t, i) => (
            <ToolCard key={t.slug} tool={t} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border-2 border-foreground bg-surface p-4 shadow-soft ${className}`}>
      <div className="mb-3 flex min-h-8 items-center justify-between gap-3 px-1">
        <span className="text-sm font-semibold">{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}