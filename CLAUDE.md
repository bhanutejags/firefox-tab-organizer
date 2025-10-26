# CLAUDE.md

This file provides guidance to Claude Code when working with this Firefox WebExtension project.

## Project Overview

This is a Firefox WebExtension that uses AI (LLM) to automatically organize browser tabs into Tab Groups. The project uses modern TypeScript and Bun tooling.

## Tech Stack

- **Runtime**: Bun (replaces Node.js)
- **Language**: TypeScript (strict mode)
- **Bundler**: Bun's built-in bundler (no webpack/esbuild needed)
- **Package Manager**: Bun (uses `bun.lock` text-based lockfile)
- **LLM Integration**: Vercel AI SDK
- **Browser API**: webextension-polyfill

## Key Design Decisions

### Why Bun?

1. **Built-in TypeScript**: No need for ts-node or separate transpilation
2. **Native bundler**: No webpack, esbuild, or other bundler configuration
3. **Fast installs**: 10-100x faster than npm
4. **Simpler toolchain**: Fewer dependencies, less configuration

### Build System

- Custom build script: `build.ts` (runs with `bun build.ts`)
- Uses Bun's native `Bun.build()` API
- No webpack config needed
- Direct TypeScript execution

### Lockfile Format

- **Uses**: `bun.lock` (text-based, human-readable)
- **Configured in**: `bunfig.toml`
- **Why**: Text-based lockfiles are diff-friendly and easier to review

## Project Structure

```
firefox-tab-organizer/
├── src/
│   ├── background.ts           # Service worker
│   ├── lib/
│   │   ├── types.ts           # Type definitions
│   │   ├── llm-provider.ts    # Abstract LLM provider
│   │   ├── provider-registry.ts
│   │   └── providers/
│   │       ├── bedrock-provider.ts  # ✅ Implemented
│   │       ├── claude-provider.ts   # ✅ Implemented
│   │       └── openai-provider.ts   # ✅ Implemented
│   ├── popup/
│   │   ├── popup.ts
│   │   ├── popup.html
│   │   └── popup.css
│   ├── options/
│   │   ├── options.ts
│   │   ├── options.html
│   │   └── options.css
│   └── icons/                  # Extension icons (16/48/128px)
├── scripts/
│   ├── get-mozilla-keys.sh    # Load signing credentials from 1Password
│   └── set-github-secrets.sh  # Set GitHub secrets from 1Password
├── docs/
│   └── DESIGN.md              # Architecture documentation
├── dist/                       # Build output (gitignored)
│   ├── firefox-tab-organizer.xpi  # Unsigned package
│   └── *.js, *.html, *.css    # Built files
├── web-ext-artifacts/          # Signed extensions (gitignored)
│   └── [hash]-0.1.x.xpi       # Mozilla-signed package
├── build.ts                    # Bun build script
├── manifest.json              # Extension manifest
├── package.json
├── tsconfig.json
├── bunfig.toml               # Bun configuration
├── bun.lock                  # Text lockfile (committed)
├── LICENSE                    # MIT License
├── TODO.md                    # Task tracking
└── .github/workflows/         # CI/CD
    ├── build.yml              # Build verification
    ├── release.yml            # Tag-triggered releases + signing
    └── weekly-release.yml     # Automated weekly releases
```

## Development Workflow

### Installation

```bash
bun install
```

### Development

```bash
# Watch mode (auto-rebuild on changes)
bun run dev

# Type checking only
bun run type-check

# Full build
bun run build

# Build and run in Firefox
bun run start
```

### Code Quality

```bash
# Lint code
bun run lint

# Lint and auto-fix
bun run lint:fix

# Format code
bun run format
```

**Using Biome (Bun-native linter/formatter):**

- 10-100x faster than ESLint + Prettier
- Single tool for linting AND formatting
- Written in Rust, zero Node.js dependencies
- Configuration in `biome.json`

### Building for Production

```bash
# Create production build
bun run build

# Package as unsigned .xpi
bun run package

# Sign extension with Mozilla (requires credentials)
bun run sign

# Sign using 1Password credentials (one command)
bun run sign:1p
```

## Build Process Details

### Entry Points

The build script (`build.ts`) bundles three entry points:

1. `src/background.ts` → `dist/background.js`
2. `src/popup/popup.ts` → `dist/popup.js`
3. `src/options/options.ts` → `dist/options.js`

### Asset Copying

After bundling TypeScript, the build process copies:

- `manifest.json` → `dist/`
- HTML files → `dist/`
- CSS files → `dist/`
- Icons → `dist/icons/`

### Bun Build Configuration

```typescript
await Bun.build({
  entrypoints: [entry],
  outdir: "dist",
  target: "browser", // Browser environment
  minify: process.env.NODE_ENV === "production",
  sourcemap: "external", // Separate .map files
  splitting: false, // No code splitting (Firefox limitation)
});
```

## CI/CD

### GitHub Actions

Three workflows configured:

1. **build.yml**: Runs on push/PR to main
   - Type checking
   - Linting with Biome
   - Build verification
   - Artifact upload (unsigned .xpi)

2. **release.yml**: Runs on version tags (v0.1.x)
   - Full build and type check
   - **Mozilla signing** (requires GitHub secrets)
   - Creates GitHub Release
   - Attaches both unsigned and signed .xpi files

3. **weekly-release.yml**: Runs every Sunday at 00:00 UTC
   - Checks for commits since last release
   - Auto-bumps version (patch)
   - Updates package.json and manifest.json
   - Creates and pushes new tag
   - Triggers release.yml workflow

### Bun in CI

Uses `oven-sh/setup-bun@v1` action for fast, cached Bun installation.

### Mozilla Signing in CI

Release workflow automatically signs extensions using:

- **GitHub Secret**: `MOZILLA_API_KEY` (JWT issuer)
- **GitHub Secret**: `MOZILLA_API_SECRET` (JWT secret)

Set secrets using: `./scripts/set-github-secrets.sh`

## TypeScript Configuration

### Key Settings

- **target**: ES2022 (modern JavaScript)
- **module**: ESNext
- **moduleResolution**: bundler (Bun-specific)
- **strict**: true (full type safety)
- **noEmit**: true (Bun handles compilation)

### Why noEmit?

TypeScript is used for type checking only. Bun's bundler handles compilation directly from `.ts` files.

## LLM Provider Architecture

### Abstract Base Class

`LLMProvider` defines the interface:

- `categorize()`: Main tab organization logic
- `testConnection()`: Credential validation
- `getConfigSchema()`: Dynamic UI generation

### Concrete Providers

Implemented providers (all via Vercel AI SDK):

- ✅ **Claude API** - Direct Anthropic API (claude-provider.ts)
- ✅ **AWS Bedrock** - Claude via AWS Bedrock with bearer token support (bedrock-provider.ts)
- ✅ **OpenAI** - GPT-4/GPT-3.5 (openai-provider.ts)
- 🔄 **Ollama** - Local LLM support (planned)

### Provider Registry

Factory pattern for runtime provider selection based on user config.

## Extension Manifest

- **Version**: Manifest V3
- **Permissions**: `tabs`, `tabGroups`, `storage`
- **Background**: Service worker with module support
- **Browser**: Firefox 109+ (for Tab Groups API)

## Dependencies

### Production

- `ai`: Vercel AI SDK core
- `@ai-sdk/anthropic`: Claude provider
- `@ai-sdk/amazon-bedrock`: Bedrock provider
- `@ai-sdk/openai`: OpenAI provider
- `ollama-ai-provider`: Local LLM support
- `webextension-polyfill`: Typed browser APIs

### Development

- `@biomejs/biome`: Fast linter & formatter (Rust-based)
- `typescript`: Type checking
- `@types/webextension-polyfill`: Type definitions
- `web-ext`: Firefox extension tooling

## Common Tasks

### Adding a New Provider

1. Create `src/lib/providers/[name]-provider.ts`
2. Extend `LLMProvider` abstract class
3. Implement required methods
4. Register in `provider-registry.ts`
5. Update UI in options page

### Updating Dependencies

```bash
bun update
```

### Debugging

```bash
# Run with browser console open
bun run start

# Check build output
ls -lh dist/
```

## Gotchas

### Module Resolution

Use `import type` for type-only imports to optimize bundle size:

```typescript
import type { TabData } from "./types"; // ✅ Good
import { TabData } from "./types"; // ⚠️ Includes runtime code
```

### Browser Compatibility

- Target: Firefox 109+ (Tab Groups API requirement)
- No Node.js APIs in browser context
- Use `webextension-polyfill` for consistent API

### Bun Build Caveats

- Code splitting disabled (Firefox doesn't handle it well)
- Always use `target: "browser"`
- Watch mode in `build.ts` is manual (use `bun --watch`)

## Future Considerations

### Potential Additions

- LangGraph.js for multi-step agent workflows
- Biome for formatting/linting (Bun-native, faster than ESLint/Prettier)
- Bun's built-in test runner (`bun test`)

### When to Use LangGraph

If we add conversational refinement:

- User sees proposed groups
- Provides feedback
- Agent refines categorization
- Iterative loop

Currently, single-shot categorization is sufficient.

## Mozilla Extension Signing

### Overview

Extensions must be signed by Mozilla to be installed without warnings. This project supports:

1. **Self-Distribution (Unlisted)** - Sign without listing on AMO
2. **Automated Signing** - GitHub Actions signs on every release

### Local Signing

**Using 1Password (Recommended):**

```bash
bun run build
bun run sign:1p
```

This fetches credentials from 1Password item "Mozilla Extension Sign" and signs automatically.

**Manual Signing:**

```bash
export WEB_EXT_API_KEY="your-jwt-issuer"
export WEB_EXT_API_SECRET="your-jwt-secret"
bun run build
bun run sign
```

Signed extensions appear in `web-ext-artifacts/[hash]-0.1.x.xpi`

### GitHub Actions Automation

Release workflow (`release.yml`) automatically signs on every tag push:

1. Builds extension
2. Signs with Mozilla using GitHub secrets
3. Attaches both unsigned and signed .xpi to GitHub Release

**Setup GitHub Secrets:**

```bash
./scripts/set-github-secrets.sh
```

This script:

- Fetches credentials from 1Password
- Pipes them directly to `gh secret set` (never displayed)
- Sets `MOZILLA_API_KEY` and `MOZILLA_API_SECRET`

### Credentials Management

**1Password Integration:**

- **Item Name**: "Mozilla Extension Sign"
- **Fields**: "JWT issuer", "JWT secret"
- **Scripts**:
  - `scripts/get-mozilla-keys.sh` - Load credentials to env
  - `scripts/set-github-secrets.sh` - Set GitHub repo secrets

**Security:**

- Never commit credentials to git
- Use 1Password CLI for secure access
- GitHub secrets encrypted at rest

### Signing Process

```
bun run sign
  ↓
web-ext uploads to Mozilla
  ↓
Automated review (usually < 5 minutes)
  ↓
Signed .xpi downloaded to web-ext-artifacts/
  ↓
Ready for distribution
```

## AWS Bedrock Bearer Token Authentication

### Overview

The Bedrock provider supports **two authentication methods**:

1. **Bearer Token (Recommended)** - Pre-generated token from AWS credentials
2. **AWS Credentials** - Direct access key, secret key, and session token

### Bearer Token Authentication

Bearer tokens provide a more secure approach by:

- Not storing raw AWS credentials in the browser
- Using short-lived tokens (12-hour expiration)
- Supporting the AWS Bedrock API Keys feature

#### Token Generation

Use the `~/.local/bin/fetch-bedrock-token` script to generate bearer tokens:

```bash
# Generate a bearer token
~/.local/bin/fetch-bedrock-token
```

This script:

1. Uses AWS SigV4 signing with your AWS credentials
2. Creates a presigned URL for Bedrock API access
3. Base64-encodes the URL as a bearer token
4. Token is valid for 12 hours

Reference: [AWS Bedrock Token Generator](https://github.com/aws/aws-bedrock-token-generator-python)

#### Implementation Details

The `BedrockProvider` class automatically detects authentication method:

```typescript
if (this._config.bearerToken) {
  // Use direct HTTP call to Bedrock Converse API
  const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/converse`;
  // Authorization: Bearer <token>
} else {
  // Use Vercel AI SDK with AWS credentials
  // Uses SigV4 signing internally
}
```

#### Bedrock Converse API

When using bearer token auth, the provider calls the Bedrock Converse API directly:

- **Endpoint**: `https://bedrock-runtime.<region>.amazonaws.com/model/<modelId>/converse`
- **Method**: POST
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>`
- **Body**: JSON with `system`, `messages`, and `inferenceConfig`

### Supported Models

Custom model IDs for cross-region invocation:

- `us.anthropic.claude-sonnet-4-5-20250929-v1:0` (default)
- `us.anthropic.claude-haiku-4-5-20251001-v1:0`
- `us.anthropic.claude-opus-4-1-20250805-v1:0`

### Configuration Priority

The provider uses this order:

1. If `bearerToken` is provided → use bearer token auth
2. Else if `awsAccessKeyId` + `awsSecretAccessKey` → use AI SDK with credentials
3. Else → throw error

### Security Best Practices

- ✅ **Use bearer tokens** for browser extensions (avoid storing AWS credentials)
- ✅ **Rotate tokens regularly** (they expire after 12 hours)
- ✅ **Store tokens in browser.storage.local** (encrypted by Firefox)
- ❌ **Don't commit tokens** to git repositories

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun Build API](https://bun.sh/docs/bundler)
- [Bun Lockfile](https://bun.sh/docs/pm/lockfile)
- [Vercel AI SDK](https://ai-sdk.dev/docs/foundations/overview)
- [Vercel AI SDK - LLMs Overview](https://ai-sdk.dev/llms.txt)
- [AWS Bedrock API Keys](https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started-api-keys.html)
- [AWS Bedrock Token Generator](https://github.com/aws/aws-bedrock-token-generator-python)
- [Firefox Tab Groups API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group)
