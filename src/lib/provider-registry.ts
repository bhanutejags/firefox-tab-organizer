/**
 * Provider registry and factory
 */

import { LLMProvider } from "./llm-provider";
import type { ProviderType, ProviderConfig } from "./types";
import { ClaudeProvider } from "./providers/claude-provider";

interface ProviderInfo {
  name: string;
  class: new (config: any) => LLMProvider;
  description: string;
  icon: string;
}

export const PROVIDERS: Record<ProviderType, ProviderInfo> = {
  bedrock: {
    name: "AWS Bedrock",
    class: ClaudeProvider, // TODO: Replace with BedrockProvider
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
    class: ClaudeProvider, // TODO: Replace with OpenAIProvider
    description: "GPT-4 and GPT-3.5",
    icon: "🔮",
  },
  ollama: {
    name: "Ollama (Local)",
    class: ClaudeProvider, // TODO: Replace with OllamaProvider
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
