/**
 * Claude API Provider using Vercel AI SDK
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "ai";
import type { ClaudeConfig, ConfigSchema } from "../types";
import { SimpleAISDKProvider } from "./simple-ai-sdk-provider";

export class ClaudeProvider extends SimpleAISDKProvider {
  private _config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    super();
    this._config = config;
  }

  protected getModel(): LanguageModelV1 {
    const anthropic = createAnthropic({
      apiKey: this._config.claudeApiKey,
    });
    return anthropic(this._config.modelId);
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
