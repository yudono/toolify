import { createFileRoute } from "@tanstack/react-router";
import { Github, Mail, MessageSquare } from "lucide-react";
import { PageShell } from "@/components/site/page-shell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Toolify" },
      {
        name: "description",
        content: "Request a tool, report a bug, or say hello to the people behind Toolify.",
      },
      { property: "og:title", content: "Contact — Toolify" },
      { property: "og:description", content: "Request a tool or report a bug." },
    ],
  }),
  component: ContactPage,
});

const channels = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@toolify.dev",
    href: "mailto:hello@toolify.dev",
    accent: "text-blue",
  },
  {
    icon: Github,
    label: "Issues",
    value: "Open a GitHub issue",
    href: "https://github.com",
    accent: "text-purple",
  },
  {
    icon: MessageSquare,
    label: "Requests",
    value: "Suggest a tool",
    href: "mailto:hello@toolify.dev?subject=Tool%20request",
    accent: "text-pink",
  },
];

function ContactPage() {
  return (
    <PageShell title="Contact" kicker="Tell us which tool to build next">
      <div className="grid gap-4 sm:grid-cols-3">
        {channels.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="lift flex flex-col gap-3 rounded-3xl border border-border/70 bg-surface p-5 shadow-soft"
          >
            <item.icon className={`size-5 ${item.accent}`} />
            <div>
              <p className="font-semibold">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.value}</p>
            </div>
          </a>
        ))}
      </div>
      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        There's no contact form here on purpose — a form would need a backend, and Toolify doesn't
        have one.
      </p>
    </PageShell>
  );
}