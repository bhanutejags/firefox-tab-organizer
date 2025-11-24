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

### Abstract Base Class

```typescript
// src/lib/llm-provider.ts
import type {
  CleanResult,
  ConfigSchema,
  GroupingResult,
  TabData,
} from "./types";

export abstract class LLMProvider {
  /**
   * Categorize tabs into groups using LLM
   */
  abstract categorize(
    tabs: TabData[],
    userPrompt?: string,
  ): Promise<GroupingResult>;

  /**
   * Identify tabs to close based on user prompt using LLM
   */
  abstract cleanTabs(tabs: TabData[], userPrompt: string): Promise<CleanResult>;

  /**
   * Test if credentials are valid
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get configuration schema for UI generation
   */
  abstract getConfigSchema(): ConfigSchema;

  /**
   * Build standardized prompt for tab organization (shared logic)
   */
  protected buildPrompt(
    tabs: TabData[],
    userPrompt?: string,
  ): {
    system: string;
    user: string;
  } {
    const systemPrompt = `You are a tab organization assistant. Analyze the provided browser tabs and group them into logical categories.

Rules:
- Create 3-7 groups maximum
- Group by: topic, project, domain similarity, or purpose
- Name groups clearly (e.g., "Development", "Research: AI", "Shopping")
- Assign appropriate colors: blue, red, green, yellow, purple, pink, orange, cyan
- Some tabs may remain ungrouped if they don't fit any category

${userPrompt ? `User guidance: ${userPrompt}` : ""}`;

    const userMessage = tabs
      .map((tab, idx) => `[${idx}] ${tab.title}\n    URL: ${tab.url}`)
      .join("\n\n");

    return { system: systemPrompt, user: userMessage };
  }

  /**
   * Build prompt for tab cleaning (shared logic)
   */
  protected buildCleanPrompt(
    tabs: TabData[],
    userPrompt: string,
  ): {
    system: string;
    user: string;
  } {
    const systemPrompt = `You are a tab cleanup assistant. Analyze the provided browser tabs and identify which ones should be closed based on the user's request.

Rules:
- Be conservative - only suggest closing tabs that clearly match the user's criteria
- Consider tab titles, URLs, and domains
- Provide clear reasoning for your selection
- If no tabs match, return an empty array

User request: ${userPrompt}`;

    const userMessage = tabs
      .map((tab, idx) => `[${idx}] ${tab.title}\n    URL: ${tab.url}`)
      .join("\n\n");

    return { system: systemPrompt, user: userMessage };
  }
}
```

### SimpleAISDKProvider - Structured Outputs

The `SimpleAISDKProvider` extends `LLMProvider` and uses **AI SDK's structured outputs** with Zod schemas for type-safe, validated responses. This eliminates JSON parsing errors and ensures consistent response format across all LLM providers.

```typescript
// src/lib/providers/simple-ai-sdk-provider.ts
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { LLMProvider } from "../llm-provider";
import type { CleanResult, GroupingResult, TabData } from "../types";
import { LLM_CONFIG } from "../utils";

/**
 * Zod schema for grouping result - ensures type-safe validation
 */
const groupingResultSchema = z.object({
  groups: z
    .array(
      z.object({
        name: z.string().describe("Name of the group"),
        color: z.enum([
          "blue",
          "red",
          "green",
          "yellow",
          "purple",
          "pink",
          "orange",
          "cyan",
        ]),
        tabIndices: z.array(z.number()).describe("Array of tab indices"),
        reasoning: z.string().optional(),
      }),
    )
    .describe("Array of tab groups (3-7 recommended)"),
  ungrouped: z.array(z.number()).describe("Tabs that don't fit any group"),
});

export abstract class SimpleAISDKProvider extends LLMProvider {
  protected abstract getModel(): any;

  /**
   * Categorize tabs using structured output (generateObject)
   */
  async categorize(
    tabs: TabData[],
    userPrompt?: string,
  ): Promise<GroupingResult> {
    const prompt = this.buildPrompt(tabs, userPrompt);

    const { object } = await generateObject({
      model: this.getModel(),
      schema: groupingResultSchema, // Zod handles validation automatically
      system: prompt.system,
      prompt: prompt.user,
      temperature: LLM_CONFIG.TEMPERATURE,
      maxTokens: LLM_CONFIG.CATEGORIZE_MAX_TOKENS,
      maxRetries: LLM_CONFIG.MAX_RETRIES,
    });

    return object as GroupingResult;
  }

  async testConnection(): Promise<boolean> {
    try {
      await generateText({
        model: this.getModel(),
        prompt: "Test",
        maxTokens: 10,
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

**Key Benefits:**

- **No JSON Parsing:** AI SDK handles structure via Zod schema
- **Type Safety:** Automatic validation against TypeScript types
- **Error Prevention:** Eliminates "unexpected end of data" and malformed JSON errors
- **Provider Agnostic:** Works consistently across Claude, OpenAI, Gemini, Cerebras, Bedrock
- **Cleaner Prompts:** No need for JSON format instructions in system prompts

````

### Concrete Provider Examples

#### Bedrock Provider

Bedrock extends `SimpleAISDKProvider` to inherit structured output functionality:

```typescript
// src/lib/providers/bedrock-provider.ts
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import type { BedrockConfig, ConfigSchema } from "../types";
import { SimpleAISDKProvider } from "./simple-ai-sdk-provider";

export class BedrockProvider extends SimpleAISDKProvider {
  private _config: BedrockConfig;

  constructor(config: BedrockConfig) {
    super();
    this._config = config;
  }

  protected getModel() {
    const bedrock = createAmazonBedrock({
      region: this._config.awsRegion,
      accessKeyId: this._config.awsAccessKeyId,
      secretAccessKey: this._config.awsSecretAccessKey,
      sessionToken: this._config.awsSessionToken,
    });
    return bedrock(this._config.modelId);
  }

  getConfigSchema(): ConfigSchema {
    return {
      awsAccessKeyId: {
        type: "string",
        label: "AWS Access Key ID",
        required: true,
        placeholder: "AKIA...",
      },
      awsSecretAccessKey: {
        type: "password",
        label: "AWS Secret Access Key",
        required: true,
      },
      awsRegion: {
        type: "select",
        label: "AWS Region",
        required: true,
        default: "us-east-1",
        options: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"],
      },
      modelId: {
        type: "string",
        label: "Model ID",
        required: true,
        default: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      },
    };
  }
}
````

#### Claude Provider

```typescript
// src/lib/providers/claude-provider.ts
import { anthropic } from "@ai-sdk/anthropic";
import { LanguageModel } from "ai";
import { LLMProvider } from "../llm-provider";
import { ClaudeConfig, ConfigSchema } from "../types";

export class ClaudeProvider extends LLMProvider {
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    super();
    this.config = config;
  }

  protected getModel(): LanguageModel {
    return anthropic({
      apiKey: this.config.claudeApiKey,
    })(this.config.modelId);
  }

  getConfigSchema(): ConfigSchema {
    return {
      claudeApiKey: {
        type: "password",
        label: "Claude API Key",
        required: true,
        placeholder: "sk-ant-...",
      },
      modelId: {
        type: "select",
        label: "Model",
        required: true,
        default: "claude-3-5-sonnet-20241022",
        options: [
          "claude-3-5-sonnet-20241022",
          "claude-3-opus-20240229",
          "claude-3-haiku-20240307",
        ],
      },
    };
  }
}
```

#### OpenAI Provider

```typescript
// src/lib/providers/openai-provider.ts
import { openai } from "@ai-sdk/openai";
import { LanguageModel } from "ai";
import { LLMProvider } from "../llm-provider";
import { OpenAIConfig, ConfigSchema } from "../types";

export class OpenAIProvider extends LLMProvider {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super();
    this.config = config;
  }

  protected getModel(): LanguageModel {
    return openai({
      apiKey: this.config.openaiApiKey,
    })(this.config.modelId);
  }

  getConfigSchema(): ConfigSchema {
    return {
      openaiApiKey: {
        type: "password",
        label: "OpenAI API Key",
        required: true,
        placeholder: "sk-...",
      },
      modelId: {
        type: "select",
        label: "Model",
        required: true,
        default: "gpt-4o-mini",
        options: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
      },
    };
  }
}
```

### Provider Registry

```typescript
// src/lib/provider-registry.ts
import { LLMProvider } from "./llm-provider";
import { ProviderType, ProviderConfig } from "./types";
import { BedrockProvider } from "./providers/bedrock-provider";
import { ClaudeProvider } from "./providers/claude-provider";
import { OpenAIProvider } from "./providers/openai-provider";

interface ProviderInfo {
  name: string;
  class: new (config: any) => LLMProvider;
  description: string;
  icon: string;
}

export const PROVIDERS: Record<ProviderType, ProviderInfo> = {
  bedrock: {
    name: "AWS Bedrock",
    class: BedrockProvider,
    description: "Claude via AWS Bedrock",
    icon: "☁️",
  },
  claude: {
    name: "Anthropic Claude",
    class: ClaudeProvider,
    description: "Direct Claude API",
    icon: "🤖",
  },
  openai: {
    name: "OpenAI",
    class: OpenAIProvider,
    description: "GPT-4 and GPT-3.5",
    icon: "🔮",
  },
};

export function createProvider(
  type: ProviderType,
  config: ProviderConfig,
): LLMProvider {
  const provider = PROVIDERS[type];
  if (!provider) {
    throw new Error(`Unknown provider: ${type}`);
  }
  return new provider.class(config);
}
```

---

## Key Type Definitions

```typescript
// src/lib/types.ts

export interface TabData {
  id: number;
  index: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
  pinned: boolean;
  windowId: number;
  groupId: number;
}

export type TabGroupColor =
  | "blue"
  | "red"
  | "green"
  | "yellow"
  | "purple"
  | "pink"
  | "orange"
  | "cyan";

export interface TabGroup {
  name: string;
  color: TabGroupColor;
  tabIndices: number[];
  reasoning?: string;
}

export interface GroupingResult {
  groups: TabGroup[];
  ungrouped: number[];
}

// Provider Configurations
export interface BedrockConfig {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsSessionToken?: string;
  awsRegion: string;
  modelId: string;
}

export interface ClaudeConfig {
  claudeApiKey: string;
  modelId: string;
}

export interface OpenAIConfig {
  openaiApiKey: string;
  modelId: string;
}

export type ProviderConfig = BedrockConfig | ClaudeConfig | OpenAIConfig;

export type ProviderType = "bedrock" | "claude" | "openai";

// Extension Storage
export interface ExtensionStorage {
  selectedProvider: ProviderType;
  providerConfigs: {
    bedrock?: BedrockConfig;
    claude?: ClaudeConfig;
    openai?: OpenAIConfig;
  };
  preferences: {
    maxGroups: number;
    autoCollapse: boolean;
  };
}

// Config Schema for Dynamic UI
export interface ConfigField {
  type: "string" | "password" | "select" | "number";
  label: string;
  required: boolean;
  default?: string | number;
  options?: string[];
  placeholder?: string;
}

export type ConfigSchema = Record<string, ConfigField>;
```

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
- LLM categorization with structured JSON response parsing
- Firefox Tab Groups API integration (create groups with names and colors)
- Error handling with regex-based JSON extraction (handles markdown code blocks)
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
6. LLM analyzes and returns JSON categorization (3-7 groups recommended)
7. Parse and validate JSON response (handles markdown code blocks)
8. Create Firefox Tab Groups using browser.tabs.group() and browser.tabGroups.update()
9. Display success notification with group count
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
