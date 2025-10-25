# Firefox Tab Groups Organizer - Implementation Plan

## 📊 Implementation Status

**Current Phase:** MVP Complete ✅

### Completed - Phase 0: MVP Core

- ✅ Project structure with Bun build system
- ✅ TypeScript configuration (strict mode)
- ✅ GitHub Actions CI/CD workflows
- ✅ Abstract LLM provider architecture
- ✅ Biome linter/formatter setup
- ✅ Development documentation (CLAUDE.md)

**LLM Provider Implementations:**

- ✅ Claude Provider (Anthropic API via Vercel AI SDK)
- ✅ Bedrock Provider with Bearer Token support
- ✅ OpenAI Provider (GPT-4/GPT-3.5 via Vercel AI SDK)
- ✅ Custom HTTP client for Bedrock Converse API
- ✅ Dual authentication (Bearer Token + AWS Credentials)

**Core Functionality:**

- ✅ Tab capture and filtering (excludes pinned/special URLs)
- ✅ Background script with tab organization logic
- ✅ Firefox Tab Groups API integration
- ✅ LLM categorization with JSON response parsing
- ✅ Dynamic provider configuration UI
- ✅ Test connection functionality
- ✅ Settings persistence in browser storage
- ✅ Popup UI with optional custom prompt
- ✅ Settings link integration

**Bearer Token Authentication:**

- ✅ AWS Bedrock bearer token support (12-hour tokens)
- ✅ Direct Bedrock Converse API calls
- ✅ Cross-region model invocation support
- ✅ Custom model IDs (Claude Sonnet 4.5, Haiku 4.5, Opus 4.1)

### Testing Status

- ✅ Extension builds successfully
- ✅ TypeScript compilation passing
- ✅ Biome linting passing
- ✅ Bearer token authentication working
- ✅ Test connection functionality verified
- 🔄 End-to-end tab organization testing in progress

### Next Steps - Phase 1: Enhancements

1. Improve JSON parsing reliability
2. Add preview of proposed groups before applying
3. Better loading states & animations
4. Retry logic with user feedback
5. Performance optimization for 50+ tabs
6. Keyboard shortcuts
7. Handle existing tab groups (dialog prompt)

---

## 🎯 Project Summary

TypeScript-based Firefox WebExtension that uses LLM intelligence to organize open tabs into Tab Groups. Uses **Vercel AI SDK** for provider-agnostic LLM integration, supporting AWS Bedrock, Claude API, and OpenAI.

---

## 🏗️ Architecture Overview

### Tech Stack

- **Runtime & Build Tool:** Bun (replaces Node.js + Webpack)
  - Built-in TypeScript compiler
  - Built-in bundler (Bun.build API)
  - Fast package manager with text-based lockfile
- **Language:** TypeScript (strict mode)
- **Browser API:** webextension-polyfill
- **LLM Abstraction:** **Vercel AI SDK** (`ai` package)
  - 📚 [AI SDK Documentation](https://ai-sdk.dev/docs/foundations/overview)
  - ✅ Chosen for: lightweight, TypeScript-first, built-in Bedrock support
  - 🔮 **Future consideration:** [LangGraph.js](https://langchain-ai.github.io/langgraphjs/) for multi-step agent workflows

### Core Design Patterns

- **Abstract Base Class:** `LLMProvider` enforces provider interface
- **Factory Pattern:** `createProvider()` for runtime instantiation
- **Unified API:** All providers use AI SDK's `generateText()` interface
- **Type Safety:** Full TypeScript coverage with strict checks

### Why Bun?

1. **No webpack config needed** - Bun bundles TypeScript natively
2. **Faster builds** - Native bundler is significantly faster
3. **Simpler toolchain** - One tool replaces Node.js + npm + webpack + ts-node
4. **Direct TypeScript execution** - Run `bun build.ts` directly

---

## 📁 Project Structure

```
tab-groups-organizer/
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
│       ├── providers/
│       │   ├── bedrock-provider.ts
│       │   ├── claude-provider.ts
│       │   ├── openai-provider.ts
│       │   └── ollama-provider.ts
│       ├── tab-analyzer.ts       # Tab capture & filtering
│       └── group-manager.ts      # Firefox Tab Groups API wrapper
├── dist/                         # Webpack build output
├── manifest.json                 # Firefox extension manifest
├── package.json
├── tsconfig.json
├── webpack.config.js
└── .gitignore
```

---

## 🎯 MVP Features (Phase 0)

### 1. AI SDK Integration

- Use Vercel AI SDK for all LLM calls
- Providers implemented:
  - ✅ AWS Bedrock (`@ai-sdk/amazon-bedrock`)
  - ✅ Anthropic Claude (`@ai-sdk/anthropic`)
  - ✅ OpenAI (`@ai-sdk/openai`)
  - ✅ Ollama (`ollama-ai-provider`)

### 2. Tab Organization Workflow

```
User clicks "Organize Tabs"
  ↓
Popup captures all tabs (exclude pinned/special URLs)
  ↓
[Optional] User provides custom prompt: "organize by project"
  ↓
Dialog: "How to handle existing groups?"
  ○ Clear all and reorganize
  ○ Keep existing, only group ungrouped
  ↓
Background script calls LLM via AI SDK
  ↓
LLM returns categorization (JSON)
  ↓
Create Firefox Tab Groups with names/colors
  ↓
Success notification
```

### 3. Dynamic Options Page

- Provider selection dropdown
- Config fields auto-generated from `ConfigSchema`
- Test connection button
- Secure credential storage (`browser.storage.local`)

### 4. Existing Groups Handling

- User prompt before each organization:
  - ○ Clear all existing groups and reorganize fresh
  - ○ Keep existing groups, only organize ungrouped tabs
- Behavior applied consistently

---

## 📦 Dependencies

### package.json

```json
{
  "name": "tab-groups-organizer",
  "version": "0.1.0",
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "ai": "^3.4.0",
    "@ai-sdk/anthropic": "^0.0.51",
    "@ai-sdk/amazon-bedrock": "^0.0.33",
    "@ai-sdk/openai": "^0.0.66",
    "ollama-ai-provider": "^0.15.2",
    "webextension-polyfill": "^0.10.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.254",
    "@types/webextension-polyfill": "^0.10.7",
    "typescript": "^5.3.3",
    "webpack": "^5.89.0",
    "webpack-cli": "^5.1.4",
    "ts-loader": "^9.5.1",
    "copy-webpack-plugin": "^11.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "types": ["chrome", "webextension-polyfill"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### webpack.config.js

```javascript
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    background: "./src/background.ts",
    popup: "./src/popup/popup.ts",
    options: "./src/options/options.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "src/popup/*.html", to: "[name][ext]" },
        { from: "src/popup/*.css", to: "[name][ext]" },
        { from: "src/options/*.html", to: "[name][ext]" },
        { from: "src/options/*.css", to: "[name][ext]" },
      ],
    }),
  ],
};
```

---

## 🔧 Core Implementation Details

### Abstract Provider Base (using AI SDK)

```typescript
// src/lib/llm-provider.ts
import { generateText, LanguageModel } from "ai";
import { TabData, GroupingResult, ConfigSchema } from "./types";

export abstract class LLMProvider {
  /**
   * Get AI SDK model instance
   */
  protected abstract getModel(): LanguageModel;

  /**
   * Get config schema for dynamic UI generation
   */
  abstract getConfigSchema(): ConfigSchema;

  /**
   * Categorize tabs using AI SDK
   */
  async categorize(
    tabs: TabData[],
    userPrompt?: string,
  ): Promise<GroupingResult> {
    const prompt = this.buildPrompt(tabs, userPrompt);

    const { text } = await generateText({
      model: this.getModel(),
      system: prompt.system,
      prompt: prompt.user,
      temperature: 0.3,
      maxTokens: 4096,
      maxRetries: 3,
    });

    return this.parseResponse(text);
  }

  /**
   * Test provider connection
   */
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

  /**
   * Build standardized prompt (shared logic)
   */
  protected buildPrompt(
    tabs: TabData[],
    userPrompt?: string,
  ): {
    system: string;
    user: string;
  } {
    const systemPrompt = `You are a tab organization assistant. Analyze browser tabs and group them logically.

Rules:
- Create 3-7 groups maximum
- Group by: topic, project, domain similarity, purpose
- Name groups clearly (e.g., "Development", "Research: AI", "Shopping")
- Assign colors: blue, red, green, yellow, purple, pink, orange, cyan
- Some tabs may remain ungrouped

${userPrompt ? `User guidance: ${userPrompt}` : ""}

Return JSON only:
{
  "groups": [
    {
      "name": "Group Name",
      "color": "blue",
      "tabIndices": [0, 2, 5],
      "reasoning": "Brief explanation"
    }
  ],
  "ungrouped": [1, 3]
}`;

    const userMessage = tabs
      .map((tab, idx) => `[${idx}] ${tab.title}\n    URL: ${tab.url}`)
      .join("\n\n");

    return { system: systemPrompt, user: userMessage };
  }

  /**
   * Parse and validate LLM response
   */
  protected parseResponse(response: string): GroupingResult {
    const data = JSON.parse(response) as GroupingResult;
    this.validateGrouping(data);
    return data;
  }

  protected validateGrouping(data: GroupingResult): void {
    if (!data.groups || !Array.isArray(data.groups)) {
      throw new Error("Invalid response: missing groups array");
    }

    for (const group of data.groups) {
      if (!group.name || !group.color || !Array.isArray(group.tabIndices)) {
        throw new Error("Invalid group structure");
      }
    }

    if (!Array.isArray(data.ungrouped)) {
      throw new Error("Invalid response: missing ungrouped array");
    }
  }
}
```

### Concrete Provider Examples

#### Bedrock Provider

```typescript
// src/lib/providers/bedrock-provider.ts
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { LanguageModel } from "ai";
import { LLMProvider } from "../llm-provider";
import { BedrockConfig, ConfigSchema } from "../types";

export class BedrockProvider extends LLMProvider {
  private config: BedrockConfig;

  constructor(config: BedrockConfig) {
    super();
    this.config = config;
  }

  protected getModel(): LanguageModel {
    return bedrock({
      region: this.config.awsRegion,
      accessKeyId: this.config.awsAccessKeyId,
      secretAccessKey: this.config.awsSecretAccessKey,
    })(this.config.modelId);
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
```

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

#### Ollama Provider

```typescript
// src/lib/providers/ollama-provider.ts
import { ollama } from "ollama-ai-provider";
import { LanguageModel } from "ai";
import { LLMProvider } from "../llm-provider";
import { OllamaConfig, ConfigSchema } from "../types";

export class OllamaProvider extends LLMProvider {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    super();
    this.config = config;
  }

  protected getModel(): LanguageModel {
    return ollama(this.config.modelId, {
      baseURL: this.config.endpoint,
    });
  }

  getConfigSchema(): ConfigSchema {
    return {
      endpoint: {
        type: "string",
        label: "Ollama Endpoint",
        required: true,
        default: "http://localhost:11434",
        placeholder: "http://localhost:11434",
      },
      modelId: {
        type: "string",
        label: "Model Name",
        required: true,
        default: "llama2",
        placeholder: "llama2, mistral, etc.",
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
import { OllamaProvider } from "./providers/ollama-provider";

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
  ollama: {
    name: "Ollama (Local)",
    class: OllamaProvider,
    description: "Local LLM, no API needed",
    icon: "🏠",
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

## 📊 Key Type Definitions

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

export interface OllamaConfig {
  endpoint: string;
  modelId: string;
}

export type ProviderConfig =
  | BedrockConfig
  | ClaudeConfig
  | OpenAIConfig
  | OllamaConfig;

export type ProviderType = "bedrock" | "claude" | "openai" | "ollama";

// Extension Storage
export interface ExtensionStorage {
  selectedProvider: ProviderType;
  providerConfigs: {
    bedrock?: BedrockConfig;
    claude?: ClaudeConfig;
    openai?: OpenAIConfig;
    ollama?: OllamaConfig;
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

## 🎨 UI Components

### Popup Interface

```
┌─────────────────────────────────┐
│  🗂️  Tab Groups Organizer       │
├─────────────────────────────────┤
│                                 │
│  Guide the AI (optional):       │
│  ┌─────────────────────────────┐│
│  │ e.g., "by project"          ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │   🪄 Organize Tabs          ││
│  └─────────────────────────────┘│
│                                 │
│  📊 42 tabs • 3 existing groups │
│                                 │
│  ⚙️ Settings                    │
└─────────────────────────────────┘
```

### Existing Groups Dialog

```
How should we handle existing tab groups?

⦿ Clear all and reorganize from scratch
○ Keep existing, only group ungrouped tabs

[Organize]  [Cancel]
```

### Options Page

```
Tab Groups Organizer - Settings

┌─ LLM Provider ──────────────────┐
│ [☁️ AWS Bedrock        ▼]       │
└─────────────────────────────────┘

┌─ Provider Configuration ────────┐
│ AWS Access Key ID               │
│ [AKIA...]                       │
│                                 │
│ AWS Secret Access Key           │
│ [••••••••••••••]                │
│                                 │
│ AWS Region                      │
│ [us-east-1 ▼]                   │
│                                 │
│ Model ID                        │
│ [anthropic.claude-3-5...  ]     │
│                                 │
│ [Test Connection]               │
└─────────────────────────────────┘

[Save Settings]
```

---

## 🔄 Background Script Flow

```typescript
// src/background.ts
import browser from "webextension-polyfill";
import { createProvider } from "./lib/provider-registry";
import { TabData, ExtensionStorage, GroupingResult } from "./lib/types";

async function organizeTabsWithAI(userPrompt?: string): Promise<void> {
  try {
    // Load configuration
    const storage = (await browser.storage.local.get([
      "selectedProvider",
      "providerConfigs",
    ])) as Partial<ExtensionStorage>;

    const providerType = storage.selectedProvider || "claude";
    const providerConfig = storage.providerConfigs?.[providerType];

    if (!providerConfig) {
      throw new Error("Provider not configured. Please check settings.");
    }

    // Get tabs from current window
    const tabs = await browser.tabs.query({ currentWindow: true });
    const tabData: TabData[] = tabs
      .filter((tab) => !tab.pinned && tab.url && !tab.url.startsWith("about:"))
      .map((tab) => ({
        id: tab.id!,
        index: tab.index,
        title: tab.title || "Untitled",
        url: tab.url!,
        favIconUrl: tab.favIconUrl,
        active: tab.active,
        pinned: tab.pinned,
        windowId: tab.windowId,
        groupId: tab.groupId ?? -1,
      }));

    // Create provider and categorize
    const provider = createProvider(providerType, providerConfig);
    const grouping = await provider.categorize(tabData, userPrompt);

    // Apply grouping to browser
    await applyGrouping(tabData, grouping);

    console.log("✓ Tabs organized successfully");
  } catch (error) {
    console.error("Failed to organize tabs:", error);
    throw error;
  }
}

async function applyGrouping(
  tabs: TabData[],
  grouping: GroupingResult,
): Promise<void> {
  // Create tab groups from LLM categorization
  for (const group of grouping.groups) {
    const tabIds = group.tabIndices.map((idx) => tabs[idx].id);

    const groupId = await browser.tabs.group({ tabIds });

    await browser.tabGroups.update(groupId, {
      title: group.name,
      color: group.color,
      collapsed: false,
    });
  }
}

// Message handler
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "organizeTabs") {
    return organizeTabsWithAI(message.userPrompt);
  }
});
```

---

## 🚀 Implementation Phases

### Phase 0: MVP Core (This Plan)

- ✅ Project setup (package.json, tsconfig, webpack)
- ✅ Type definitions (`types.ts`)
- ✅ Abstract provider base with AI SDK integration
- ✅ Concrete providers: Bedrock, Claude, OpenAI, Ollama
- ✅ Provider registry and factory
- ✅ Tab capture logic (exclude pinned/special URLs)
- ✅ Firefox Tab Groups API integration
- ✅ Popup UI (custom prompt input + organize button)
- ✅ Options page (dynamic config fields)
- ✅ Existing groups handling dialog
- ✅ Basic error handling

### Phase 1: Enhancements

- Preview proposed groups before applying (optional)
- Better loading states & animations
- Retry logic with user feedback
- Performance optimization for 50+ tabs
- Keyboard shortcuts

### Phase 2: Advanced Features

- Auto-organize on schedule
- Pattern learning from user adjustments
- Export/import grouping templates
- Multi-window support

### Future Consideration: LangGraph.js

- 📚 [LangGraph.js Documentation](https://langchain-ai.github.io/langgraphjs/)
- **Use case:** Multi-step agent workflows, conversational refinement
- **Example:** "Show me suggested groups → user feedback → refine → apply"
- **Decision point:** Revisit during Phase 2 if we need stateful, multi-turn interactions

---

## 🔐 Security & Privacy

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
LLM API (user's account: Bedrock/Claude/OpenAI/Ollama)
  ↓
Tab Groups (local)
```

---

## 📦 Build & Development

### Setup

```bash
npm install
```

### Development

```bash
npm run dev          # Watch mode
npm run type-check   # Validate types
```

### Production Build

```bash
npm run build        # Output to dist/
```

### Load in Firefox

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `dist/manifest.json`

---

## ✅ Deliverables

1. ✅ TypeScript codebase with strict type checking
2. ✅ Webpack build pipeline
3. ✅ Working Firefox extension (loadable from `dist/`)
4. ✅ AI SDK integration with 4 providers
5. ✅ Options page with dynamic config UI
6. ✅ Popup with optional custom prompt
7. ✅ Existing groups handling dialog
8. ✅ Test connection functionality

---

## 📚 Reference Documentation

- **Vercel AI SDK:** https://ai-sdk.dev/docs/foundations/overview
  - Providers: https://ai-sdk.dev/providers/ai-sdk-providers
  - `generateText()`: https://ai-sdk.dev/docs/ai-sdk-core/generating-text
- **LangGraph.js (Future):** https://langchain-ai.github.io/langgraphjs/
- **Firefox Tab Groups API:** https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group
- **WebExtension Polyfill:** https://github.com/mozilla/webextension-polyfill

---

## 🎯 Design Decisions Summary

### Why Vercel AI SDK over LangGraph.js?

| Feature             | Vercel AI SDK               | LangGraph.js             |
| ------------------- | --------------------------- | ------------------------ |
| Bundle Size         | ~50KB ✅                    | ~200KB+                  |
| Use Case Fit        | Single prompt → response ✅ | Multi-turn conversations |
| Complexity          | Low ✅                      | Medium-High              |
| AWS Bedrock Support | Built-in ✅                 | Manual implementation    |
| Type Safety         | Excellent ✅                | Good                     |
| Learning Curve      | Minimal ✅                  | Steeper                  |

**Decision:** Use Vercel AI SDK for MVP. LangGraph.js is excellent for complex agent workflows, but overkill for our single-shot categorization use case. Can revisit for Phase 2 if we add conversational refinement features.

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

---

## 🎨 manifest.json Example

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

## 🚀 Getting Started

Once you're ready to implement:

1. Create project directory: `mkdir tab-groups-organizer && cd tab-groups-organizer`
2. Initialize npm: `npm init -y`
3. Install dependencies (see package.json above)
4. Create file structure as outlined
5. Start with `types.ts` to define contracts
6. Implement `llm-provider.ts` abstract base
7. Implement concrete providers
8. Build UI components
9. Test in Firefox

Good luck with the implementation! 🎯
