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

## Tech Stack Rationale

### Why Bun?

1. **Built-in TypeScript** - No ts-node or separate transpilation needed
2. **Native bundler** - No webpack, esbuild, or other bundler config
3. **Fast installs** - 10-100x faster than npm
4. **Simpler toolchain** - Fewer dependencies, less configuration

### Why Biome?

- 10-100x faster than ESLint + Prettier
- Single tool for linting AND formatting
- Written in Rust, zero Node.js dependencies
- Configuration in `biome.json`

## Build System

### Entry Points

1. `src/background.ts` → `dist/background.js` (service worker)
2. `src/popup/popup.ts` → `dist/popup.js` (popup UI)
3. `src/options/options.ts` → `dist/options.js` (settings page)

### Build Process

See `build.ts` for implementation details. Key points:

- Bundles TypeScript to browser-compatible JavaScript
- Copies static assets (manifest, HTML/CSS, icons) to `dist/`

## TypeScript Configuration

Strict mode enabled for full type safety. Bun handles compilation directly from `.ts` files (see `tsconfig.json`).

## LLM Provider Architecture

### Abstract Base Class

`LLMProvider` defines the interface:

- `categorize(tabs, userPrompt?)` - Main tab organization logic
- `testConnection()` - Credential validation before use
- `getConfigSchema()` - Dynamic UI generation for options page

### Concrete Providers

**Implemented (all via Vercel AI SDK):**

- ✅ Claude API - Direct Anthropic API
- ✅ AWS Bedrock - Claude via AWS
- ✅ OpenAI - GPT-4/GPT-3.5
- ✅ Google Gemini - Gemini 2.5 Pro/Flash and other models
- ✅ Cerebras - Fast inference with Llama and other models

### Factory Pattern

`createProvider(type, config)` - Runtime provider selection based on user config

### Adding a New Provider

1. Create `src/lib/providers/[name]-provider.ts`
2. Extend `LLMProvider` abstract class
3. Implement required methods
4. Register in `provider-registry.ts`
5. Update UI in options page

## Provider Authentication & Configuration

### AWS Bedrock

**Authentication:** AWS credentials

- AWS Access Key ID (required)
- AWS Secret Access Key (required)
- AWS Session Token (optional, for temporary credentials)

**Implementation:** Uses Vercel AI SDK with AWS SigV4 signing

**Supported Models:**

- `us.anthropic.claude-sonnet-4-5-20250929-v1:0` (default)
- `us.anthropic.claude-haiku-4-5-20251001-v1:0`
- `us.anthropic.claude-opus-4-1-20250805-v1:0`

### Google Gemini

**Authentication:** API key from [Google AI Studio](https://aistudio.google.com/)

**Supported Models:**

- `gemini-2.5-flash` (default - best balance of speed/quality)
- `gemini-2.5-pro` (highest quality)
- `gemini-2.0-flash`
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-1.5-flash-8b` (fastest)

**Free Tier:** Available with rate limits

### Cerebras

**Authentication:** API key from [Cerebras Cloud](https://cerebras.ai/)

**Supported Models:**

- `llama-3.3-70b` (default - good quality)
- `llama3.1-8b` (fastest)
- `gpt-oss-120b`
- `qwen-3-235b-a22b-instruct-2507`
- `qwen-3-235b-a22b-thinking-2507`
- `qwen-3-32b`
- `qwen-3-coder-480b`

**Note:** Free tier has 8192 token context limit. May require caution with large numbers of tabs.

## Mozilla Extension Signing

### Local Signing

**Using 1Password (Recommended):**

```bash
bun run build && bun run sign:1p
```

This fetches credentials from 1Password item "Mozilla Extension Sign" (fields: "JWT issuer", "JWT secret") and signs automatically.

**Manual Signing:**

```bash
export WEB_EXT_API_KEY="your-jwt-issuer"
export WEB_EXT_API_SECRET="your-jwt-secret"
bun run build && bun run sign
```

**Output:** `web-ext-artifacts/[hash]-VERSION.xpi` (signed by Mozilla)

### GitHub Actions Automation

Release workflow (`release.yml`) automatically signs on every tag push:

1. Builds extension
2. Signs with Mozilla using GitHub secrets
3. Attaches both unsigned and signed .xpi to GitHub Release

**Setup GitHub Secrets:**

```bash
./scripts/set-github-secrets.sh
```

This pipes credentials from 1Password directly to `gh secret set` (never displayed in terminal).

## CI/CD

### GitHub Actions Workflows

1. **build.yml** - Runs on push/PR
   - Type checking
   - Biome linting
   - Build verification
   - Artifact upload

2. **release.yml** - Runs on version tags (v0.1.x)
   - Full build + type check
   - **Mozilla signing** (requires GitHub secrets)
   - Creates GitHub Release
   - Attaches unsigned + signed .xpi

3. **weekly-release.yml** - Runs every Sunday at 00:00 UTC
   - Checks for commits since last release
   - Auto-bumps version (patch)
   - Updates package.json + manifest.json
   - Creates and pushes new tag
   - Triggers release.yml workflow

### Bun in CI

Uses `oven-sh/setup-bun@v1` action for fast, cached Bun installation.

## Important Gotchas

### Code Quality

- Use `import type` for type-only imports to optimize bundle size
- TypeScript strict mode - use type guards, avoid `any`
- Target Firefox 109+ (Tab Groups API requirement)
- No Node.js APIs in browser context

### Version Sync

**CRITICAL:** package.json and manifest.json versions must stay in sync.

- Weekly release workflow updates both automatically
- Manual version bumps require updating both files

## Development Workflow

1. Run type-check + lint before commit
2. Update docs/DESIGN.md if architecture changes
3. Test locally with `bun run start`

## Security Practices

- **API keys:** Never commit to git, use browser.storage.local (encrypted by Firefox)
- **1Password CLI:** Used for secure credential access
- **GitHub secrets:** Encrypted at rest, piped directly without display

## Resources

- [docs/DESIGN.md](./docs/DESIGN.md) - Complete architecture and implementation details
- [TODO.md](./TODO.md) - Roadmap and task tracking
- [Vercel AI SDK](https://ai-sdk.dev/docs/foundations/overview) - LLM abstraction
- [Vercel AI SDK - LLMs](https://ai-sdk.dev/llms.txt) - Provider overview
- [Firefox Tab Groups API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group) - Browser API
- [AWS Bedrock API Keys](https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started-api-keys.html) - Bedrock auth
