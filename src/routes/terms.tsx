import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Prose } from "@/components/site/page-shell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use — Toolify" },
      {
        name: "description",
        content: "Plain-language terms for using Toolify's free, browser-based developer utilities.",
      },
      { property: "og:title", content: "Terms of use — Toolify" },
      { property: "og:description", content: "Plain-language terms for using Toolify." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PageShell title="Terms of use" kicker="Plain language, no lawyers required">
      <Prose>
        <h2>Free to use</h2>
        <p>
          Toolify is provided free of charge for personal and commercial work. You keep full
          ownership of anything you paste in or generate.
        </p>
        <h2>No warranty</h2>
        <p>
          Tools are provided as-is. Always double-check generated output before shipping it to
          production, especially security-related values.
        </p>
        <h2>Fair use</h2>
        <p>
          Don't use Toolify to process content you have no right to, and don't rebrand the site as
          your own service.
        </p>
        <h2>Changes</h2>
        <p>Tools may be added, changed, or retired at any time.</p>
      </Prose>
    </PageShell>
  );
}