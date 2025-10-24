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
│   ├── popup/
│   │   ├── popup.ts
│   │   ├── popup.html
│   │   └── popup.css
│   ├── options/
│   │   ├── options.ts
│   │   ├── options.html
│   │   └── options.css
│   └── icons/
├── dist/                       # Build output (gitignored)
├── build.ts                    # Bun build script
├── manifest.json              # Extension manifest
├── package.json
├── tsconfig.json
├── bunfig.toml               # Bun configuration
├── bun.lock                  # Text lockfile (committed)
└── .github/workflows/        # CI/CD
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

# Package as .xpi
bun run package
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

Two workflows configured:

1. **build.yml**: Runs on push/PR
   - Type checking
   - Build verification
   - Artifact upload

2. **release.yml**: Runs on version tags
   - Full build
   - Create GitHub release
   - Attach .xpi file

### Bun in CI

Uses `oven-sh/setup-bun@v1` action for fast, cached Bun installation.

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

Planned implementations:

- Claude API (via Vercel AI SDK)
- AWS Bedrock
- OpenAI
- Ollama (local)

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

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun Build API](https://bun.sh/docs/bundler)
- [Bun Lockfile](https://bun.sh/docs/pm/lockfile)
- [Vercel AI SDK](https://ai-sdk.dev/docs/foundations/overview)
- [Firefox Tab Groups API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group)
