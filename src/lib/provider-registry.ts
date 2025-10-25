/**
 * Provider registry and factory
 */

import type { LLMProvider } from "./llm-provider";
import { BedrockProvider } from "./providers/bedrock-provider";
import { ClaudeProvider } from "./providers/claude-provider";
import { OpenAIProvider } from "./providers/openai-provider";
import type { ProviderConfig, ProviderType } from "./types";

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

export function createProvider(type: ProviderType, config: ProviderConfig): LLMProvider {
  const provider = PROVIDERS[type];
  if (!provider) {
    throw new Error(`Unknown provider: ${type}`);
  }
  return new provider.class(config);
}
