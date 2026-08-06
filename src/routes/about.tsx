import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Prose } from "@/components/site/page-shell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Toolify — local-first developer utilities" },
      {
        name: "description",
        content:
          "Why Toolify exists: fast developer utilities that process everything locally in your browser, with no accounts and no telemetry.",
      },
      { property: "og:title", content: "About Toolify" },
      {
        property: "og:description",
        content: "Local-first developer utilities with no accounts and no telemetry.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell title="About Toolify" kicker="Small tools, built with care">
      <Prose>
        <p>
          Toolify started as a scratch pad. Every time we needed to pretty-print a payload or decode
          a token, we ended up on some ad-choked page that quietly shipped our data to a server.
          That felt wrong for something as ordinary as formatting text.
        </p>
        <p>
          So Toolify does the boring thing well: each utility is a plain JavaScript function that
          runs in your tab. There is no API, no queue, no worker farm. Your input is a string in
          memory, and it disappears when you close the page.
        </p>
        <h2>What we optimise for</h2>
        <ul>
          <li>Instant results — no round trips, no spinners.</li>
          <li>Privacy by architecture, not by policy.</li>
          <li>Interfaces that feel good to use ten times a day.</li>
        </ul>
        <p>
          The whole site is static. It works offline once loaded and deploys anywhere that can serve
          files.
        </p>
      </Prose>
    </PageShell>
  );
}