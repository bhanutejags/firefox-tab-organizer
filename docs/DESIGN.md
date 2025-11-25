# Design & Architecture

Technical design documentation for Firefox Tab Organizer.

## Architecture Overview

### Tech Stack

- **Runtime & Build Tool:** Bun
  - Built-in TypeScript compiler
  - Built-in bundler (Bun.build API)
  - Fast package manager with text-based lockfile
- **Language:** TypeScript (strict mode)
- **Browser API:** webextension-polyfill
- **LLM Abstraction:** Vercel AI SDK (`ai` package)

### Core Design Patterns

- **Abstract Base Class:** `LLMProvider` enforces provider interface
- **Factory Pattern:** `createProvider()` for runtime instantiation
- **Structured Outputs:** All providers use AI SDK's `generateObject()` with Zod schemas for type-safe, validated responses
- **Type Safety:** Full TypeScript coverage with strict checks

---

## Project Structure

```
firefox-tab-organizer/
├── src/
│   ├── background.ts              # Service worker (orchestrates organization)
│   ├── popup/
│   │   ├── popup.ts              # UI logic
│   │   ├── popup.html            # Extension popup
│   │   └── popup.css             # Styling
│   ├── options/
│   │   ├── options.ts            # Settings page logic
│   │   ├── options.html          # Provider configuration UI
│   │   └── options.css           # Styling
│   └── lib/
│       ├── types.ts              # Shared TypeScript definitions
│       ├── llm-provider.ts       # Abstract base class
│       ├── provider-registry.ts  # Factory & provider registry
│       └── providers/
│           ├── bedrock-provider.ts
│           ├── claude-provider.ts
│           └── openai-provider.ts
├── dist/                         # Build output (gitignored)
├── manifest.json                 # Firefox extension manifest
├── package.json
├── tsconfig.json
├── bunfig.toml                  # Bun configuration
└── bun.lock                     # Text lockfile (committed)
```

---

## Tab Organization Workflow

```
User clicks "Organize Tabs"
  ↓
Popup captures all tabs (exclude pinned/special URLs)
  ↓
[Optional] User provides custom prompt: "organize by project"
  ↓
Background script calls LLM via AI SDK
  ↓
LLM returns categorization (JSON)
  ↓
Create Firefox Tab Groups with names/colors
  ↓
Success notification
```

---

## LLM Provider Architecture

### Abstract Base Class (`LLMProvider`)

Defines the core interface that all providers must implement:

- `categorize(tabs, userPrompt?)` - Main tab organization logic
- `cleanTabs(tabs, userPrompt)` - Identify tabs to close
- `testConnection()` - Credential validation
- `getConfigSchema()` - Dynamic UI generation for options page
- `buildPrompt()` / `buildCleanPrompt()` - Shared prompt construction logic

### Structured Outputs with Zod

All providers use **AI SDK's `generateObject()`** with Zod schemas for type-safe validation:

- **No JSON parsing** - AI SDK handles structure via Zod schema
- **Type safety** - Automatic validation against TypeScript types
- **Error prevention** - Eliminates malformed JSON errors
- **Provider agnostic** - Works consistently across all LLM providers
- **Cleaner prompts** - No JSON format instructions needed

`SimpleAISDKProvider` extends `LLMProvider` to provide this structured output functionality. Most providers inherit from this base implementation.

### Provider Implementations

See source files in `src/lib/providers/` for implementation details:

- **Bedrock** (`bedrock-provider.ts`) - AWS credentials with SigV4 signing
- **Claude** (`claude-provider.ts`) - Direct Anthropic API
- **OpenAI** (`openai-provider.ts`) - OpenAI API key authentication
- **Gemini** (`gemini-provider.ts`) - Google AI Studio API key
- **Cerebras** (`cerebras-provider.ts`) - Cerebras Cloud API key

### Factory Pattern

`createProvider(type, config)` in `provider-registry.ts` provides runtime provider instantiation based on user configuration. Registry maps provider types to implementation classes.

---

## Design Decisions

### Why Vercel AI SDK over LangGraph.js?

| Feature             | Vercel AI SDK               | LangGraph.js             |
| ------------------- | --------------------------- | ------------------------ |
| Bundle Size         | ~50KB ✅                    | ~200KB+                  |
| Use Case Fit        | Single prompt → response ✅ | Multi-turn conversations |
| Complexity          | Low ✅                      | Medium-High              |
| AWS Bedrock Support | Built-in ✅                 | Manual implementation    |
| Type Safety         | Excellent ✅                | Good                     |
| Learning Curve      | Minimal ✅                  | Steeper                  |

**Decision:** Use Vercel AI SDK for MVP. LangGraph.js is excellent for complex agent workflows, but overkill for our single-shot categorization use case.

### Why Provider Abstraction?

- ✅ **Easy to switch providers** - Change dropdown, done
- ✅ **Future-proof** - Add new LLMs without refactoring
- ✅ **Testable** - Mock providers in tests
- ✅ **Maintainable** - Changes isolated to provider files

### Why TypeScript?

- ✅ **Catch errors at compile time** - Before runtime
- ✅ **IDE autocomplete** - Better developer experience
- ✅ **Self-documenting** - Types serve as documentation
- ✅ **Safer refactoring** - Rename with confidence

### Why Bun?

1. **No webpack config needed** - Bun bundles TypeScript natively
2. **Faster builds** - Native bundler is significantly faster
3. **Simpler toolchain** - One tool replaces Node.js + npm + webpack + ts-node
4. **Direct TypeScript execution** - Run `bun build.ts` directly

---

## Security & Privacy

### Credential Storage

- User provides API keys/credentials
- Stored in `browser.storage.local` (encrypted by Firefox)
- Never logged or transmitted except to chosen LLM provider

### Data Flow

```
Browser Tabs (local)
  ↓
Extension (local)
  ↓
LLM API (user's account: Bedrock/Claude/OpenAI)
  ↓
Tab Groups (local)
```

---

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "Tab Groups Organizer",
  "version": "0.1.0",
  "description": "Organize browser tabs into groups using AI",
  "permissions": ["tabs", "tabGroups", "storage"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

---

## MVP Implementation Status

### Completed Core Functionality

✅ **Tab Organization Pipeline**

- Tab capture and filtering (excludes pinned tabs and special URLs: `about:*`, `moz-extension:*`)
- LLM categorization with Zod schema validation for type-safe responses
- Firefox Tab Groups API integration (create groups with names and colors)
- Dynamic provider configuration UI with schema-driven form generation
- Settings persistence using `browser.storage.local` (encrypted by Firefox)

✅ **LLM Provider Implementations**

**Claude API (Anthropic)**

- Direct API integration via `@ai-sdk/anthropic`
- Model support: claude-3-5-sonnet-20241022, claude-3-opus-20240229, claude-3-haiku-20240307
- API key authentication

**AWS Bedrock**

- Integration via `@ai-sdk/amazon-bedrock`
- AWS credentials authentication (access key ID, secret access key, optional session token)
- SigV4 signing handled automatically by Vercel AI SDK
- Cross-region model invocation support with custom model IDs:
  - `us.anthropic.claude-sonnet-4-5-20250929-v1:0`
  - `us.anthropic.claude-haiku-4-5-20251001-v1:0`
  - `us.anthropic.claude-opus-4-1-20250805-v1:0`

**OpenAI**

- Integration via `@ai-sdk/openai`
- Model support: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
- API key authentication

**Google Gemini**

- Integration via `@ai-sdk/google-generative-ai`
- Model support: gemini-2.5-flash (default), gemini-2.5-pro, gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash, gemini-1.5-flash-8b
- API key authentication (free tier available from Google AI Studio)
- Best balance of speed and quality with gemini-2.5-flash

**Cerebras**

- Integration via `@ai-sdk/cerebras`
- Model support: llama-3.3-70b (default), llama3.1-8b, gpt-oss-120b, qwen-3-235b models, qwen-3-coder-480b
- API key authentication (free tier available from Cerebras Cloud)
- Fast inference with 8192 token context limit on free tier
- May require caution with large numbers of tabs

✅ **User Interface**

**Popup (popup.html/ts/css)**

- "Organize Tabs" primary action button
- Optional custom prompt input ("organize by project", "work vs personal", etc.)
- Status messages (success/error feedback)

**Options Page (options.html/ts/css)**

- Provider selection dropdown (Claude/Bedrock/OpenAI/Gemini/Cerebras)
- Dynamic configuration forms generated from provider schemas
- "Test Connection" functionality validates credentials before use
- "Save Settings" persists configuration to browser storage

✅ **Build & Development System**

- Bun-based build with native TypeScript compilation
- Custom build script (`build.ts`) using `Bun.build()` API
- TypeScript strict mode with full type coverage
- Biome linter/formatter (Rust-based, 10-100x faster than ESLint/Prettier)
- GitHub Actions CI/CD workflows (build verification + release automation)
- Development documentation (CLAUDE.md, DESIGN.md, README.md)

✅ **Testing & Quality**

- TypeScript compilation: ✅ Passing (`tsc --noEmit`)
- Biome linting: ✅ Passing (`biome check src/`)
- Build artifacts: ✅ Generated (background.js: 749KB, options.js: 752KB, popup.js: 30KB)
- Type safety: ✅ Full coverage with type predicates and proper null handling

---

## Implemented Features

### Tab Organization Flow

```
1. User clicks "Organize Tabs" button in extension popup
2. [Optional] User provides custom prompt: "organize by project", "work vs personal", etc.
3. Background script queries current window tabs via browser.tabs.query()
4. Filter tabs: exclude pinned, about:*, moz-extension:* URLs
5. Send tab data (title, URL, index) to configured LLM provider
6. LLM returns categorization via AI SDK's structured output (Zod validation)
7. Create Firefox Tab Groups using browser.tabs.group() and browser.tabGroups.update()
8. Display success notification with group count
```

### Provider Flexibility

**Runtime Provider Switching**

- User selects provider in options page dropdown
- Configuration schema loaded dynamically from `getConfigSchema()` method
- Form fields generated on-the-fly (text inputs, password fields, dropdowns)
- No UI code changes needed when adding new providers

**Test Connection**

- Pre-flight credential validation before organizing tabs
- Sends minimal test request to LLM (10 token limit)
- Returns success/failure without affecting tab state
- Prevents failed organization attempts due to bad credentials

**Secure Credential Storage**

- All API keys and AWS credentials stored in `browser.storage.local`
- Firefox encrypts storage automatically (no plaintext on disk)
- Credentials only transmitted to user's chosen LLM provider
- No telemetry, tracking, or third-party data sharing

**AWS Bedrock Authentication**

- Uses AWS credentials (access key ID, secret access key, optional session token)
- SigV4 signing performed automatically by Vercel AI SDK
- All requests authenticated via standard AWS IAM credentials
- Credentials are encrypted at rest by Firefox browser storage

---

## Extension Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Firefox Extension                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Popup UI ──────┐                                        │
│  (popup.ts)     │                                        │
│                 │                                        │
│  Options UI ────┼──> Background Script ──> Tab Groups   │
│  (options.ts)   │     (background.ts)        API        │
│                 │            │                           │
│  Settings ──────┘            │                           │
│  (browser.storage.local)     │                           │
│                              ↓                           │
│                       Provider Registry                  │
│                       (provider-registry.ts)             │
│                       Factory Pattern                    │
│                              │                           │
│          ┌───────────────────┼───────────────────┐       │
│          ↓                   ↓                   ↓       │
│    ClaudeProvider    BedrockProvider    OpenAIProvider   │
│    (claude-provider.ts) (bedrock-provider.ts) (...)      │
│          │                   │                   │       │
│          └───────────────────┼───────────────────┘       │
│                              │                           │
└──────────────────────────────┼───────────────────────────┘
                               ↓
                        Vercel AI SDK
                        (@ai-sdk/*)
                               ↓
                     LLM APIs (External)
                     - Anthropic Claude API
                     - AWS Bedrock Runtime API
                     - OpenAI API
```

**Key Components:**

- **Background Script**: Service worker orchestrating tab organization
- **Provider Registry**: Factory pattern for runtime provider instantiation
- **Abstract Base Class**: `LLMProvider` enforces consistent interface
- **Dynamic Config UI**: Schema-driven form generation in options page
- **Vercel AI SDK**: Unified abstraction over multiple LLM providers
- **Type Safety**: Full TypeScript coverage with strict null checks

---

## References

- [Vercel AI SDK](https://ai-sdk.dev/docs/foundations/overview)
- [Vercel AI SDK - LLMs Overview](https://ai-sdk.dev/llms.txt)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Firefox Tab Groups API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group)
- [MDN WebExtensions Examples](https://github.com/mdn/webextensions-examples)
