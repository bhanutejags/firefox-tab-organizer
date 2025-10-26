# CLAUDE.md

AI assistant guidance for Firefox Tab Organizer project.

## Quick Reference

**Tech Stack:** Bun + TypeScript (strict) + Vercel AI SDK + webextension-polyfill
**Linter/Formatter:** Biome (Rust-based, replaces ESLint/Prettier)
**Architecture:** See [docs/DESIGN.md](./docs/DESIGN.md) for details
**Tasks:** See [TODO.md](./TODO.md) for roadmap

## Key Commands

```bash
bun install              # Install dependencies
bun run dev              # Watch mode
bun run type-check       # TypeScript validation
bun run lint             # Biome linting
bun run build            # Production build
bun run package          # Create unsigned .xpi
bun run sign:1p          # Sign with Mozilla (1Password)
bun run start            # Build + run in Firefox
```

## Project Structure

```
src/
├── background.ts              # Service worker
├── lib/
│   ├── llm-provider.ts       # Abstract base class
│   ├── provider-registry.ts  # Factory pattern
│   ├── types.ts              # Shared types
│   └── providers/            # Claude, Bedrock, OpenAI (all implemented)
├── popup/                    # Extension popup UI
├── options/                  # Settings page
└── icons/                    # 16/48/128px icons
scripts/
├── get-mozilla-keys.sh       # Load signing credentials
└── set-github-secrets.sh     # Set GitHub secrets from 1Password
dist/                          # Build output (gitignored)
web-ext-artifacts/             # Signed extensions (gitignored)
```

## Build System

- **Entry points:** background.ts, popup/popup.ts, options/options.ts
- **Bundler:** Bun's native bundler (target: "browser", no code splitting)
- **Assets:** Copied via build:assets script (HTML, CSS, icons, manifest)
- **TypeScript:** Type-checking only (noEmit: true), Bun handles compilation

## LLM Providers

**Pattern:** Abstract base class (`LLMProvider`) + factory (`createProvider()`)
**Implemented:** Claude API, AWS Bedrock (bearer token), OpenAI
**Interface:** `categorize()`, `testConnection()`, `getConfigSchema()`

See [docs/DESIGN.md](./docs/DESIGN.md) for provider architecture details.

## CI/CD

**3 workflows:**

1. `build.yml` - Verify on push/PR (type-check, lint, build)
2. `release.yml` - Tag-triggered releases + Mozilla signing
3. `weekly-release.yml` - Auto-release every Sunday (bumps version, creates tag)

**Signing:** Automated via GitHub secrets (MOZILLA_API_KEY, MOZILLA_API_SECRET)
**Setup:** Run `./scripts/set-github-secrets.sh` to configure from 1Password

## Mozilla Signing

**Local:**

```bash
bun run build && bun run sign:1p  # Uses 1Password item "Mozilla Extension Sign"
```

**CI:** Automatic on tag push (v0.1.x) → unsigned + signed .xpi attached to release

**Output:** `web-ext-artifacts/[hash]-VERSION.xpi` (Mozilla-signed, ~5min review)

## Important Notes

- **TypeScript strict mode:** Use type guards, no `any` without biome-ignore
- **Import types:** Use `import type` for type-only imports
- **Browser target:** No Node.js APIs, use webextension-polyfill
- **Versioning:** package.json + manifest.json must stay in sync
- **Icons:** Generated via ImageMagick, tracked with git-lfs
- **1Password CLI:** Used for credential management (never expose secrets)

## Adding Features

1. Update TODO.md with task
2. Follow TypeScript strict patterns
3. Run type-check + lint before commit
4. Update docs/DESIGN.md if architecture changes
5. Test locally with `bun run start`

## Resources

- [docs/DESIGN.md](./docs/DESIGN.md) - Complete architecture
- [TODO.md](./TODO.md) - Roadmap and tasks
- [Vercel AI SDK](https://ai-sdk.dev/docs/foundations/overview)
- [Firefox Tab Groups API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group)
