export type CategoryId =
  | "json"
  | "text"
  | "converter"
  | "generator"
  | "security"
  | "css"
  | "date"
  | "api";

export type Accent = "brand" | "blue" | "purple" | "pink" | "orange" | "yellow" | "green" | "teal";

export type Category = {
  id: CategoryId;
  name: string;
  blurb: string;
  accent: Accent;
  icon: string;
};

export type Tool = {
  slug: string;
  name: string;
  description: string;
  category: CategoryId;
  icon: string;
  accent: Accent;
  trending?: boolean;
  isNew?: boolean;
  /** tools that produce output without input */
  generator?: boolean;
  inputLabel?: string;
  outputLabel?: string;
  placeholder?: string;
  sample?: string;
  actions: { id: string; label: string }[];
  run: (input: string, action: string) => string;
  faq: { q: string; a: string }[];
};

export const categories: Category[] = [
  { id: "json", name: "JSON", blurb: "Format, validate, convert", accent: "orange", icon: "Braces" },
  { id: "text", name: "Text", blurb: "Clean, count, transform", accent: "blue", icon: "Type" },
  {
    id: "converter",
    name: "Converter",
    blurb: "Encode between formats",
    accent: "purple",
    icon: "Repeat",
  },
  {
    id: "generator",
    name: "Generator",
    blurb: "IDs, passwords, filler",
    accent: "green",
    icon: "Sparkles",
  },
  { id: "security", name: "Security", blurb: "Tokens and hashes", accent: "pink", icon: "Shield" },
  { id: "css", name: "CSS", blurb: "Colors and styles", accent: "teal", icon: "Palette" },
  { id: "date", name: "Date", blurb: "Timestamps and clocks", accent: "yellow", icon: "Clock" },
  { id: "api", name: "API", blurb: "Query strings and URLs", accent: "brand", icon: "Plug" },
];

const F = { format: "Format", minify: "Minify", run: "Run", generate: "Generate" };

function parseJson(input: string) {
  if (!input.trim()) throw new Error("Paste some JSON to get started.");
  try {
    return JSON.parse(input);
  } catch (e) {
    throw new Error(`Invalid JSON — ${(e as Error).message}`);
  }
}

function tsTypeOf(value: unknown, name: string, out: string[], indent = ""): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    return `${tsTypeOf(value[0], name, out, indent)}[]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const body = entries
      .map(([k, v]) => `${indent}  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : `"${k}"`}: ${tsTypeOf(v, k, out, `${indent}  `)};`)
      .join("\n");
    return `{\n${body}\n${indent}}`;
  }
  return typeof value;
}

function b64encode(s: string) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}
function b64decode(s: string) {
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0)));
  } catch {
    throw new Error("That doesn't look like valid Base64.");
  }
}

function randomBytes(n: number) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

const LOREM =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum".split(
    " ",
  );

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error("Enter a hex color like #4F46E5.");
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export const tools: Tool[] = [
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    description: "Pretty-print, validate and minify JSON with helpful error messages.",
    category: "json",
    icon: "Braces",
    accent: "orange",
    trending: true,
    sample: '{"name":"toolify","tools":128,"private":true,"tags":["fast","local"]}',
    placeholder: '{ "paste": "your json here" }',
    actions: [
      { id: "format", label: F.format },
      { id: "minify", label: F.minify },
      { id: "sort", label: "Sort keys" },
    ],
    run: (input, action) => {
      const data = parseJson(input);
      if (action === "minify") return JSON.stringify(data);
      if (action === "sort") {
        const sort = (v: unknown): unknown =>
          Array.isArray(v)
            ? v.map(sort)
            : v && typeof v === "object"
              ? Object.fromEntries(
                  Object.entries(v as Record<string, unknown>)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, val]) => [k, sort(val)]),
                )
              : v;
        return JSON.stringify(sort(data), null, 2);
      }
      return JSON.stringify(data, null, 2);
    },
    faq: [
      {
        q: "Is my JSON uploaded anywhere?",
        a: "No. Parsing happens in your browser tab — nothing leaves your device.",
      },
      {
        q: "Why does it say invalid JSON?",
        a: "Usually a trailing comma, single quotes, or an unquoted key. The error message points at the offending position.",
      },
    ],
  },
  {
    slug: "json-to-typescript",
    name: "JSON to TypeScript",
    description: "Turn any JSON payload into a typed TypeScript interface instantly.",
    category: "json",
    icon: "FileCode2",
    accent: "blue",
    trending: true,
    sample: '{"id":1,"name":"Ada","active":true,"roles":["admin"],"meta":{"seen":"2026-01-02"}}',
    outputLabel: "TypeScript",
    actions: [{ id: "run", label: "Generate types" }],
    run: (input) => {
      const data = parseJson(input);
      return `export interface Root ${tsTypeOf(data, "Root", [])}\n`;
    },
    faq: [
      { q: "Does it infer optional fields?", a: "It types what's present. Mark optional keys yourself with `?`." },
      { q: "Arrays?", a: "The first element decides the element type, which covers most API responses." },
    ],
  },
  {
    slug: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64 with full Unicode support.",
    category: "converter",
    icon: "Binary",
    accent: "purple",
    trending: true,
    sample: "Toolify runs entirely in your browser ✨",
    actions: [
      { id: "encode", label: "Encode" },
      { id: "decode", label: "Decode" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Type or paste something first.");
      return action === "decode" ? b64decode(input) : b64encode(input);
    },
    faq: [
      { q: "Does it handle emoji?", a: "Yes — text is UTF-8 encoded before conversion." },
      { q: "Is Base64 encryption?", a: "No. It's an encoding, readable by anyone. Never use it to hide secrets." },
    ],
  },
  {
    slug: "url-encoder",
    name: "URL Encoder",
    description: "Percent-encode or decode URLs and query parameters safely.",
    category: "api",
    icon: "Link2",
    accent: "brand",
    sample: "https://toolify.dev/search?q=hello world&tags=json,css",
    actions: [
      { id: "encode", label: "Encode" },
      { id: "decode", label: "Decode" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Paste a URL or fragment first.");
      return action === "decode" ? decodeURIComponent(input) : encodeURIComponent(input);
    },
    faq: [
      { q: "encodeURI or encodeURIComponent?", a: "This uses encodeURIComponent, right for query values." },
      { q: "Why does it fail on decode?", a: "A stray `%` that isn't part of a valid escape sequence." },
    ],
  },
  {
    slug: "query-string-parser",
    name: "Query String Parser",
    description: "Split any URL into readable, formatted query parameters.",
    category: "api",
    icon: "ListTree",
    accent: "teal",
    isNew: true,
    sample: "https://api.toolify.dev/v1/search?q=json&page=2&sort=desc&safe=true",
    outputLabel: "Parameters",
    actions: [{ id: "run", label: "Parse" }],
    run: (input) => {
      if (!input.trim()) throw new Error("Paste a URL with a query string.");
      const qs = input.includes("?") ? input.slice(input.indexOf("?") + 1) : input;
      const params = new URLSearchParams(qs);
      const entries = [...params.entries()];
      if (!entries.length) throw new Error("No query parameters found in that URL.");
      return JSON.stringify(Object.fromEntries(entries), null, 2);
    },
    faq: [
      { q: "Repeated keys?", a: "The last value wins in the JSON output." },
      { q: "Does it fetch the URL?", a: "Never. The string is parsed locally; no request is made." },
    ],
  },
  {
    slug: "jwt-decoder",
    name: "JWT Decoder",
    description: "Inspect the header and payload of a JSON Web Token locally.",
    category: "security",
    icon: "KeyRound",
    accent: "pink",
    trending: true,
    placeholder: "eyJhbGciOi...",
    sample:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    outputLabel: "Decoded token",
    actions: [{ id: "run", label: "Decode" }],
    run: (input) => {
      const parts = input.trim().split(".");
      if (parts.length < 2) throw new Error("A JWT needs at least a header and a payload.");
      const dec = (p: string) => JSON.parse(b64decode(p.replace(/-/g, "+").replace(/_/g, "/")));
      return JSON.stringify({ header: dec(parts[0]), payload: dec(parts[1]) }, null, 2);
    },
    faq: [
      {
        q: "Is the signature verified?",
        a: "No — verification needs your secret key, which should never be pasted into a website.",
      },
      { q: "Is my token stored?", a: "No. It's decoded in memory and forgotten when you close the tab." },
    ],
  },
  {
    slug: "uuid-generator",
    name: "UUID Generator",
    description: "Generate cryptographically random v4 UUIDs, ten at a time.",
    category: "generator",
    icon: "Fingerprint",
    accent: "green",
    generator: true,
    outputLabel: "UUIDs",
    actions: [{ id: "generate", label: F.generate }],
    run: () => Array.from({ length: 10 }, () => crypto.randomUUID()).join("\n"),
    faq: [
      { q: "Are these secure?", a: "They use the browser's crypto random source, same as server-side generators." },
      { q: "Collision risk?", a: "Practically zero — v4 UUIDs carry 122 bits of randomness." },
    ],
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    description: "Create strong random passwords that never leave your machine.",
    category: "security",
    icon: "Lock",
    accent: "pink",
    generator: true,
    outputLabel: "Passwords",
    actions: [
      { id: "strong", label: "20 characters" },
      { id: "memorable", label: "Memorable" },
    ],
    run: (_i, action) => {
      if (action === "memorable") {
        return Array.from({ length: 5 }, () => {
          const words = Array.from(
            { length: 3 },
            () => LOREM[randomBytes(1)[0] % LOREM.length],
          );
          return `${words.join("-")}-${randomBytes(1)[0]}`;
        }).join("\n");
      }
      const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_";
      return Array.from({ length: 5 }, () =>
        [...randomBytes(20)].map((b) => alphabet[b % alphabet.length]).join(""),
      ).join("\n");
    },
    faq: [
      { q: "Do you log passwords?", a: "There is no server to log them. Generation happens locally." },
      { q: "Which should I pick?", a: "Random 20-character strings for vaults, memorable ones for typing by hand." },
    ],
  },
  {
    slug: "lorem-ipsum",
    name: "Lorem Ipsum",
    description: "Placeholder copy in paragraphs, sentences or list items.",
    category: "generator",
    icon: "AlignLeft",
    accent: "yellow",
    generator: true,
    outputLabel: "Filler text",
    actions: [
      { id: "paragraphs", label: "3 paragraphs" },
      { id: "list", label: "List items" },
    ],
    run: (_i, action) => {
      const sentence = () => {
        const n = 8 + (randomBytes(1)[0] % 8);
        const words = Array.from({ length: n }, () => LOREM[randomBytes(1)[0] % LOREM.length]);
        const s = words.join(" ");
        return s[0].toUpperCase() + s.slice(1) + ".";
      };
      if (action === "list") return Array.from({ length: 6 }, () => `- ${sentence()}`).join("\n");
      return Array.from({ length: 3 }, () =>
        Array.from({ length: 4 }, sentence).join(" "),
      ).join("\n\n");
    },
    faq: [
      { q: "Can I get more text?", a: "Press generate again — each run produces fresh copy." },
      { q: "Is it real Latin?", a: "It's the traditional scrambled Cicero filler, not meaningful prose." },
    ],
  },
  {
    slug: "case-converter",
    name: "Case Converter",
    description: "Switch text between camel, snake, kebab, title and constant case.",
    category: "text",
    icon: "CaseSensitive",
    accent: "blue",
    sample: "Toolify developer tools without the noise",
    actions: [
      { id: "camel", label: "camelCase" },
      { id: "snake", label: "snake_case" },
      { id: "kebab", label: "kebab-case" },
      { id: "constant", label: "CONSTANT" },
      { id: "title", label: "Title Case" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Type some text to convert.");
      const words = input
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((w) => w.toLowerCase());
      switch (action) {
        case "snake":
          return words.join("_");
        case "kebab":
          return words.join("-");
        case "constant":
          return words.join("_").toUpperCase();
        case "title":
          return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
        default:
          return words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join("");
      }
    },
    faq: [
      { q: "Does it keep punctuation?", a: "No — separators are dropped so the result is a clean identifier." },
      { q: "Multi-line input?", a: "Everything is treated as one phrase. Convert line by line for identifiers." },
    ],
  },
  {
    slug: "word-counter",
    name: "Word Counter",
    description: "Words, characters, sentences and reading time at a glance.",
    category: "text",
    icon: "Calculator",
    accent: "green",
    sample: "Toolify is a collection of developer utilities that run entirely in the browser.",
    outputLabel: "Stats",
    actions: [{ id: "run", label: "Analyse" }],
    run: (input) => {
      if (!input.trim()) throw new Error("Paste some text to analyse.");
      const words = input.trim().split(/\s+/).length;
      const sentences = input.split(/[.!?]+\s|[.!?]+$/).filter((s) => s.trim()).length;
      const lines = input.split("\n").length;
      return [
        `Characters      ${input.length}`,
        `Characters (no spaces)  ${input.replace(/\s/g, "").length}`,
        `Words           ${words}`,
        `Sentences       ${sentences}`,
        `Lines           ${lines}`,
        `Reading time    ~${Math.max(1, Math.round(words / 220))} min`,
      ].join("\n");
    },
    faq: [
      { q: "How is reading time计算?", a: "At roughly 220 words per minute, rounded up to a whole minute." },
      { q: "Does it count markdown syntax?", a: "Yes — characters are counted literally." },
    ],
  },
  {
    slug: "text-cleaner",
    name: "Text Cleaner",
    description: "Strip extra whitespace, duplicates or blank lines from messy text.",
    category: "text",
    icon: "Eraser",
    accent: "teal",
    isNew: true,
    sample: "  alpha\n\n\nbeta\nalpha\n   gamma   \n",
    actions: [
      { id: "trim", label: "Trim & squeeze" },
      { id: "dedupe", label: "Remove duplicates" },
      { id: "sort", label: "Sort lines" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Paste the text you want to tidy up.");
      const lines = input.split("\n").map((l) => l.trim());
      if (action === "dedupe") return [...new Set(lines.filter(Boolean))].join("\n");
      if (action === "sort") return lines.filter(Boolean).sort((a, b) => a.localeCompare(b)).join("\n");
      return lines.filter(Boolean).join("\n");
    },
    faq: [
      { q: "Is the original preserved?", a: "Your input stays in the left card until you clear it." },
      { q: "Case-sensitive dedupe?", a: "Yes, `Alpha` and `alpha` are treated as different lines." },
    ],
  },
  {
    slug: "color-converter",
    name: "Color Converter",
    description: "Convert a hex color into RGB, HSL and CSS-ready variables.",
    category: "css",
    icon: "Palette",
    accent: "purple",
    trending: true,
    sample: "#4F46E5",
    placeholder: "#4F46E5",
    outputLabel: "Formats",
    actions: [{ id: "run", label: "Convert" }],
    run: (input) => {
      const [r, g, b] = hexToRgb(input);
      const [h, s, l] = rgbToHsl(r, g, b);
      const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      return [
        `HEX   ${hex.toUpperCase()}`,
        `RGB   rgb(${r}, ${g}, ${b})`,
        `HSL   hsl(${h}, ${s}%, ${l}%)`,
        `CSS   --brand: ${hex.toUpperCase()};`,
      ].join("\n");
    },
    faq: [
      { q: "Shorthand hex?", a: "Yes, `#4F5` expands automatically." },
      { q: "Alpha channel?", a: "Not yet — 8-digit hex support is on the list." },
    ],
  },
  {
    slug: "css-minifier",
    name: "CSS Minifier",
    description: "Shrink stylesheets by removing comments and dead whitespace.",
    category: "css",
    icon: "FileCode",
    accent: "orange",
    sample: ".card {\n  border-radius: 24px; /* soft */\n  padding: 32px;\n}\n",
    actions: [
      { id: "minify", label: F.minify },
      { id: "format", label: "Beautify" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Paste some CSS first.");
      const stripped = input.replace(/\/\*[\s\S]*?\*\//g, "");
      if (action === "format") {
        return stripped
          .replace(/\s*{\s*/g, " {\n  ")
          .replace(/;\s*/g, ";\n  ")
          .replace(/\s*}\s*/g, "\n}\n\n")
          .replace(/\n\s+\n/g, "\n")
          .trim();
      }
      return stripped
        .replace(/\s+/g, " ")
        .replace(/\s*([{}:;,])\s*/g, "$1")
        .replace(/;}/g, "}")
        .trim();
    },
    faq: [
      { q: "Is it safe for production?", a: "It's a whitespace-level minifier — great for snippets, not a replacement for a build step." },
      { q: "Does it touch my selectors?", a: "No selectors or values are rewritten." },
    ],
  },
  {
    slug: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Translate Unix timestamps into human-readable dates and back.",
    category: "date",
    icon: "Clock",
    accent: "yellow",
    sample: "1767225600",
    placeholder: "1767225600 or 2026-01-01T00:00:00Z",
    outputLabel: "Result",
    actions: [
      { id: "run", label: "Convert" },
      { id: "now", label: "Now" },
    ],
    run: (input, action) => {
      const date =
        action === "now"
          ? new Date()
          : /^\d{10}$/.test(input.trim())
            ? new Date(Number(input.trim()) * 1000)
            : /^\d{13}$/.test(input.trim())
              ? new Date(Number(input.trim()))
              : new Date(input.trim());
      if (Number.isNaN(date.getTime())) throw new Error("Enter a Unix timestamp or an ISO date.");
      return [
        `Unix (s)   ${Math.floor(date.getTime() / 1000)}`,
        `Unix (ms)  ${date.getTime()}`,
        `ISO 8601   ${date.toISOString()}`,
        `Local      ${date.toString()}`,
        `UTC        ${date.toUTCString()}`,
      ].join("\n");
    },
    faq: [
      { q: "Which timezone is used?", a: "Local output uses your device timezone; ISO and UTC are absolute." },
      { q: "Seconds or milliseconds?", a: "Both — 10 digits is treated as seconds, 13 as milliseconds." },
    ],
  },
  {
    slug: "html-entity-encoder",
    name: "HTML Entity Encoder",
    description: "Escape HTML so snippets render as text instead of markup.",
    category: "converter",
    icon: "Code2",
    accent: "brand",
    sample: '<div class="card">Hello & welcome</div>',
    actions: [
      { id: "encode", label: "Escape" },
      { id: "decode", label: "Unescape" },
    ],
    run: (input, action) => {
      if (!input.trim()) throw new Error("Paste some markup first.");
      const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      if (action === "decode") {
        return input
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&");
      }
      return input.replace(/[&<>"']/g, (c) => map[c]);
    },
    faq: [
      { q: "Does it handle every entity?", a: "It covers the five characters that matter for safe HTML output." },
      { q: "Is this XSS protection?", a: "Escaping is one layer — always escape on the server too." },
    ],
  },
  {
    slug: "slug-generator",
    name: "Slug Generator",
    description: "Turn any headline into a clean, URL-safe slug.",
    category: "generator",
    icon: "Hash",
    accent: "green",
    sample: "Developer Tools, Without the Noise!",
    actions: [{ id: "run", label: "Slugify" }],
    run: (input) => {
      if (!input.trim()) throw new Error("Type a title to slugify.");
      return input
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    },
    faq: [
      { q: "Accented characters?", a: "They're transliterated — `Café` becomes `cafe`." },
      { q: "Max length?", a: "No limit, but shorter slugs read better in URLs." },
    ],
  },
];

export const toolsBySlug = Object.fromEntries(tools.map((t) => [t.slug, t]));
export const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

export const accentClass: Record<Accent, { bg: string; text: string; ring: string; grad: string }> = {
  brand: { bg: "bg-brand/12", text: "text-brand", ring: "ring-brand/20", grad: "from-brand to-purple" },
  blue: { bg: "bg-blue/12", text: "text-blue", ring: "ring-blue/20", grad: "from-blue to-teal" },
  purple: { bg: "bg-purple/12", text: "text-purple", ring: "ring-purple/20", grad: "from-purple to-pink" },
  pink: { bg: "bg-pink/12", text: "text-pink", ring: "ring-pink/20", grad: "from-pink to-orange" },
  orange: { bg: "bg-orange/12", text: "text-orange", ring: "ring-orange/20", grad: "from-orange to-yellow" },
  yellow: { bg: "bg-yellow/18", text: "text-yellow", ring: "ring-yellow/25", grad: "from-yellow to-orange" },
  green: { bg: "bg-green/12", text: "text-green", ring: "ring-green/20", grad: "from-green to-teal" },
  teal: { bg: "bg-teal/12", text: "text-teal", ring: "ring-teal/20", grad: "from-teal to-blue" },
};