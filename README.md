# Toolify

**150+ fast, private developer utilities that run entirely in your browser.**

No uploads. No backend. No tracking. Everything runs locally.

## Features

- **150+ tools** across 12 categories
- **100% client-side** — no data leaves your browser
- **Dark mode** — pure black theme with neobrutalism styling
- **Favorites** — save tools for quick access (stored in localStorage)
- **Syntax highlighting** — GitHub Dark theme with auto-detection
- **Command palette** — search tools with `Cmd+K`
- **Responsive** — works on desktop, tablet, and mobile

## Categories

| Category | Tools |
|----------|-------|
| JSON | Format, validate, merge, diff, convert |
| Text | Sort, count, case convert, diff, slugify |
| Converter | JSON↔TypeScript/Zod/Yup/Prisma/SQL/GraphQL + 12 languages |
| Generator | React, SolidJS, Docker, Nginx, GitHub Actions, tsconfig |
| Security | Hash (SHA/MD5/bcrypt), UUID, password generator |
| CSS | Grid, flexbox, gradients, shadows, glassmorphism, animations |
| Database | SQL↔ORM converters (Prisma, Drizzle, TypeORM, Sequelize) |
| Date & Time | Timestamps, timezones, cron, date difference |
| Image | Compress, resize, crop, rotate, flip, format convert, SVG tools |
| API | cURL→Fetch/Axios/Python/Go/Java/Dart |
| Encode/Decode | Base64, URL, HTML entities, Unicode, hex |
| Validator | JSON, YAML, XML, regex tester, JWT decoder |

## Tech Stack

- [TanStack Start](https://tanstack.com/start) — React meta-framework
- [Tailwind CSS](https://tailwindcss.com) — utility-first CSS
- [highlight.js](https://highlightjs.org) — syntax highlighting
- [Lucide](https://lucide.dev) — icons
- [Vitest](https://vitest.dev) — testing (157 tests)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- [pnpm](https://pnpm.io/), [npm](https://www.npmjs.com/), or [bun](https://bun.sh/)

### Install

```bash
git clone https://github.com/yudono/toolify.git
cd toolify
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## Deploy

Build output is static and can be deployed anywhere:

- [Vercel](https://vercel.com)
- [Cloudflare Pages](https://pages.cloudflare.com)
- [Netlify](https://netlify.com)
- GitHub Pages

## Project Structure

```
src/
├── components/
│   └── site/          # UI components (navbar, footer, cards, etc.)
├── hooks/             # Custom React hooks
├── lib/
│   └── tools.ts       # All 150+ tool definitions
├── routes/            # Page routes (TanStack Router)
├── styles.css         # Global styles + dark mode
└── __tests__/         # Vitest tests
```

## Privacy

- No data is sent to any server
- No cookies or tracking
- Favorites stored in localStorage only
- All processing happens in your browser

## License

MIT
