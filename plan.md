# Toolify — Feature Plan

## Phase 0: Bug Fixes (DONE)
- [x] Fix output panel clipping (use direct pre/code instead of CodeEditor wrapper)
- [x] Fix dark mode — pure #0a0a0a black, no purple/blue tint
- [x] Fix category icon contrast — accent-colored icons on transparent bg
- [x] Load More on homepage (12 → 24, already implemented)
- [x] Favorite system with localStorage (hook + provider + heart buttons)

## Phase 1: Missing Conversion Tools (96 → ~115)
### Schema Converters
- [ ] JSON to C# Class
- [ ] Zod → Yup
- [ ] Yup → Zod
- [ ] Zod → Valibot
- [ ] Valibot → Zod
- [ ] JSON Schema → Zod
- [ ] JSON Schema → Yup
- [ ] JSON Schema → TypeScript
- [ ] OpenAPI → TypeScript Types

### Additional Converters
- [ ] CSV → Table (HTML)
- [ ] HTML → Markdown
- [ ] Markdown → HTML
- [ ] JSON → Properties
- [ ] Properties → JSON

## Phase 2: Config Generators (~15 tools)
### Web Server
- [ ] nginx Config Generator
- [ ] Apache VirtualHost Generator
- [ ] Caddyfile Generator
- [ ] Traefik Config Generator

### Docker
- [ ] Dockerfile Generator
- [ ] docker-compose Generator
- [ ] .dockerignore Generator

### Dev
- [ ] tsconfig.json Generator
- [ ] package.json Generator
- [ ] eslint.config.js Generator
- [ ] prettier.config.js Generator
- [ ] vite.config.ts Generator
- [ ] next.config.ts Generator
- [ ] tailwind.config.ts Generator
- [ ] postcss.config.js Generator
- [ ] biome.json Generator
- [ ] .gitignore Generator
- [ ] .editorconfig Generator
- [ ] .env Template Generator
- [ ] PM2 Ecosystem Generator

### CI/CD
- [ ] GitHub Actions Generator
- [ ] GitLab CI Generator

## Phase 3: Formatters (~7 tools)
- [ ] HTML Formatter
- [ ] XML Formatter
- [ ] YAML Formatter
- [ ] Markdown Formatter
- [ ] JSON Minifier (separate from formatter)

## Phase 4: Text Tools (~7 tools)
- [ ] Remove Duplicate Lines
- [ ] Sort Lines
- [ ] Unique Lines
- [ ] Character Counter
- [ ] Text to Slug
- [ ] Markdown Preview (read-only renderer)

## Phase 5: Date & Time (~3 tools)
- [ ] Timezone Converter
- [ ] Date Difference Calculator
- [ ] ISO 8601 Formatter

## Phase 6: Image Tools (~10 tools)
### Browser-side (Canvas API)
- [ ] Image Compressor (quality slider)
- [ ] Image Resize (width/height inputs)
- [ ] Crop Image (visual selection)
- [ ] Rotate Image (0/90/180/270)
- [ ] Flip Image (horizontal/vertical)
- [ ] Format Converter (PNG ↔ JPG ↔ WebP)
- [ ] Blur Image (radius slider)
- [ ] Image to Base64 (with preview)

### SVG
- [ ] SVG Sprite Generator

### Metadata
- [ ] EXIF Metadata Viewer

## Phase 7: CSS Generators (~8 tools)
- [ ] Box Shadow Generator
- [ ] Gradient Generator
- [ ] Glassmorphism Generator
- [ ] Border Radius Generator
- [ ] Flexbox Generator (visual playground)
- [ ] CSS Grid Generator (visual playground)
- [ ] Clip Path Generator
- [ ] CSS Filter Generator

## Phase 8: Code Generators (~12 tools)
### Flutter
- [ ] Model Class Generator
- [ ] Freezed Generator
- [ ] JSON Serializable Generator
- [ ] Hive Type Adapter Generator
- [ ] Isar Collection Generator
- [ ] Enum Generator

### React
- [ ] Component Generator
- [ ] Hook Generator
- [ ] Context Generator

### TypeScript
- [ ] Interface Generator
- [ ] DTO Generator
- [ ] Enum Generator
- [ ] Mock Data Generator

## Phase 9: API Enhancements
- [ ] Postman Collection → cURL
- [ ] OpenAPI → Axios Client
- [ ] OpenAPI → Fetch Client

## Phase 10: Additional Security
- [ ] SHA-1 Hash
- [ ] JWT Inspector (separate from Decoder)

---

## Tool Count Estimate
| Phase | New Tools | Running Total |
|-------|-----------|---------------|
| Phase 0 (Bugs) | 0 | 96 |
| Phase 1 (Conversions) | ~19 | ~115 |
| Phase 2 (Configs) | ~22 | ~137 |
| Phase 3 (Formatters) | ~7 | ~144 |
| Phase 4 (Text) | ~7 | ~151 |
| Phase 5 (Date) | ~3 | ~154 |
| Phase 6 (Image) | ~10 | ~164 |
| Phase 7 (CSS Gen) | ~8 | ~172 |
| Phase 8 (Code Gen) | ~12 | ~184 |
| Phase 9 (API) | ~3 | ~187 |
| Phase 10 (Security) | ~2 | ~189 |
