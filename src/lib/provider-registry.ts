/**
 * Provider registry and factory
 */

import type { LLMProvider } from "./llm-provider";
import { BedrockProvider } from "./providers/bedrock-provider";
import { CerebrasProvider } from "./providers/cerebras-provider";
import { ClaudeProvider } from "./providers/claude-provider";
import { GeminiProvider } from "./providers/gemini-provider";
import { OpenAIProvider } from "./providers/openai-provider";
import type { ProviderConfig, ProviderType } from "./types";

interface ProviderInfo {
  name: string;
  class: new (
    // biome-ignore lint/suspicious/noExplicitAny: Constructor needs to accept different config types at runtime
    config: any,
  ) => LLMProvider;
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
  gemini: {
    name: "Google Gemini",
    class: GeminiProvider,
    description: "Google's Gemini models",
    icon: "🔷",
  },
  cerebras: {
    name: "Cerebras",
    class: CerebrasProvider,
    description: "Fast inference with Cerebras",
    icon: "⚡",
  },
};

export function createProvider(type: ProviderType, config: ProviderConfig): LLMProvider {
  const provider = PROVIDERS[type];
  if (!provider) {
    throw new Error(`Unknown provider: ${type}`);
  }
  return new provider.class(config);
}
