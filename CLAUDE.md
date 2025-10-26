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

### Bun Build Configuration

```typescript
await Bun.build({
  entrypoints: [entry],
  outdir: "dist",
  target: "browser", // Browser environment (no Node.js APIs)
  minify: false, // Keep readable for debugging
  sourcemap: "external", // Separate .map files
  splitting: false, // No code splitting (Firefox limitation)
});
```

### Asset Copying

After bundling TypeScript, the build process copies:

- `manifest.json` → `dist/`
- HTML/CSS files → `dist/`
- Icons → `dist/icons/`

## TypeScript Configuration

**Key settings:**

- `target`: ES2022 (modern JavaScript)
- `module`: ESNext
- `moduleResolution`: bundler (Bun-specific)
- `strict`: true (full type safety)
- `noEmit`: true (Bun handles compilation)

**Why noEmit?** TypeScript is used for type checking only. Bun's bundler compiles directly from `.ts` files without intermediate `.js` output.

## LLM Provider Architecture

### Abstract Base Class

`LLMProvider` defines the interface:

- `categorize(tabs, userPrompt?)` - Main tab organization logic
- `testConnection()` - Credential validation before use
- `getConfigSchema()` - Dynamic UI generation for options page

### Concrete Providers

**Implemented (all via Vercel AI SDK):**

- ✅ Claude API - Direct Anthropic API
- ✅ AWS Bedrock - Claude via AWS with bearer token support
- ✅ OpenAI - GPT-4/GPT-3.5

### Factory Pattern

`createProvider(type, config)` - Runtime provider selection based on user config

### Adding a New Provider

1. Create `src/lib/providers/[name]-provider.ts`
2. Extend `LLMProvider` abstract class
3. Implement required methods
4. Register in `provider-registry.ts`
5. Update UI in options page

## AWS Bedrock Bearer Token Authentication

### Overview

The Bedrock provider supports **two authentication methods**:

1. **Bearer Token (Recommended)** - Pre-generated token from AWS credentials
2. **AWS Credentials** - Direct access key, secret key, session token

### Bearer Token Benefits

- More secure (no raw credentials in browser)
- Short-lived tokens (12-hour expiration)
- Supports AWS Bedrock API Keys feature

### Token Generation

Use `~/.local/bin/fetch-bedrock-token` script:

```bash
# Generate bearer token
~/.local/bin/fetch-bedrock-token
```

This script:

1. Uses AWS SigV4 signing with IAM credentials
2. Creates presigned URL for Bedrock API access
3. Base64-encodes URL as bearer token
4. Token valid for 12 hours

### Implementation

The `BedrockProvider` auto-detects authentication method:

```typescript
if (config.bearerToken) {
  // Direct HTTP call to Bedrock Converse API
  // Authorization: Bearer <token>
} else {
  // Vercel AI SDK with AWS credentials (SigV4 signing)
}
```

### Supported Models

Cross-region invocation model IDs:

- `us.anthropic.claude-sonnet-4-5-20250929-v1:0` (default)
- `us.anthropic.claude-haiku-4-5-20251001-v1:0`
- `us.anthropic.claude-opus-4-1-20250805-v1:0`

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

### Signing Workflow

```
bun run sign
  ↓
web-ext uploads to Mozilla
  ↓
Automated review (~5 minutes)
  ↓
Signed .xpi downloaded to web-ext-artifacts/
  ↓
Ready for distribution
```

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

## Dependencies

### Production

- `ai` - Vercel AI SDK core
- `@ai-sdk/anthropic` - Claude provider
- `@ai-sdk/amazon-bedrock` - AWS Bedrock provider
- `@ai-sdk/openai` - OpenAI provider
- `webextension-polyfill` - Typed browser APIs

### Development

- `@biomejs/biome` - Fast linter & formatter (Rust-based)
- `typescript` - Type checking
- `@types/webextension-polyfill` - Type definitions
- `web-ext` - Firefox extension tooling

## Important Gotchas

### Module Resolution

Use `import type` for type-only imports to optimize bundle size:

```typescript
import type { TabData } from "./types"; // ✅ Good (type-only)
import { TabData } from "./types"; // ⚠️ Includes runtime code
```

### Browser Compatibility

- **Target:** Firefox 109+ (Tab Groups API requirement)
- **No Node.js APIs** in browser context
- Use `webextension-polyfill` for consistent API across browsers

### Bun Build Caveats

- Code splitting disabled (Firefox doesn't handle it well in extensions)
- Always use `target: "browser"`
- Watch mode: Use `bun --watch build.ts` (not built into build script)

### TypeScript Strict Mode

- Use type guards, avoid `any` without `biome-ignore` comment
- Non-null assertions (`!`) require proper filtering first
- Optional chaining preferred over type assertions

### Version Sync

**CRITICAL:** package.json and manifest.json versions must stay in sync.

- Weekly release workflow updates both automatically
- Manual version bumps require updating both files

## Development Workflow

### Adding Features

1. Update TODO.md with task
2. Follow TypeScript strict patterns
3. Run type-check + lint before commit
4. Update docs/DESIGN.md if architecture changes
5. Test locally with `bun run start`

### Debugging

```bash
# Run with browser console open
bun run start

# Check build output
ls -lh dist/

# View signed extensions
ls -lh web-ext-artifacts/
```

### Updating Dependencies

```bash
bun update
```

## Security Practices

- **API keys:** Never commit to git, use browser.storage.local (encrypted by Firefox)
- **1Password CLI:** Used for secure credential access
- **GitHub secrets:** Encrypted at rest, piped directly without display
- **Bearer tokens:** Preferred over raw AWS credentials for browser extensions

## Resources

- [docs/DESIGN.md](./docs/DESIGN.md) - Complete architecture and implementation details
- [TODO.md](./TODO.md) - Roadmap and task tracking
- [Vercel AI SDK](https://ai-sdk.dev/docs/foundations/overview) - LLM abstraction
- [Vercel AI SDK - LLMs](https://ai-sdk.dev/llms.txt) - Provider overview
- [Firefox Tab Groups API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group) - Browser API
- [AWS Bedrock API Keys](https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started-api-keys.html) - Bedrock auth
