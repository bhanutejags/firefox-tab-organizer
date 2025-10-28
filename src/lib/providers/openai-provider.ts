/**
 * OpenAI Provider using Vercel AI SDK
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";
import type { ConfigSchema, OpenAIConfig } from "../types";
import { SimpleAISDKProvider } from "./simple-ai-sdk-provider";

export class OpenAIProvider extends SimpleAISDKProvider {
  private _config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super();
    this._config = config;
  }

  protected getModel(): LanguageModelV1 {
    const openai = createOpenAI({
      apiKey: this._config.openaiApiKey,
    });
    return openai(this._config.modelId);
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
