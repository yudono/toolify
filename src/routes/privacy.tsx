import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Prose } from "@/components/site/page-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Toolify" },
      {
        name: "description",
        content:
          "Toolify collects nothing. No accounts, no cookies, no analytics — every tool processes your data locally in the browser.",
      },
      { property: "og:title", content: "Privacy — Toolify" },
      { property: "og:description", content: "No accounts, no cookies, no analytics." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell title="Privacy" kicker="The short version: we collect nothing">
      <Prose>
        <h2>No data collection</h2>
        <p>
          Toolify has no backend. Anything you paste into a tool stays in your browser's memory and
          is never transmitted.
        </p>
        <h2>No cookies, no analytics</h2>
        <p>
          We do not set cookies, fingerprint devices, or run analytics scripts by default. The only
          thing stored locally is your dark-mode preference.
        </p>
        <h2>No third parties</h2>
        <p>
          Tools do not call external APIs. If a future tool ever needs a network request, it will
          say so before doing anything.
        </p>
        <h2>Hosting logs</h2>
        <p>
          Static files are served by a CDN, which may keep standard request logs. We do not read or
          analyse them.
        </p>
      </Prose>
    </PageShell>
  );
}