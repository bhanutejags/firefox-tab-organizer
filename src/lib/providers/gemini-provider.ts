/**
 * Google Gemini Provider
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ConfigSchema, GeminiConfig } from "../types";
import { SimpleAISDKProvider } from "./simple-ai-sdk-provider";

export class GeminiProvider extends SimpleAISDKProvider {
  private _config: GeminiConfig;

  constructor(config: GeminiConfig) {
    super();
    this._config = config;
  }

  protected getModel() {
    const google = createGoogleGenerativeAI({
      apiKey: this._config.geminiApiKey,
    });
    return google(this._config.modelId);
  }

  getConfigSchema(): ConfigSchema {
    return {
      geminiApiKey: {
        type: "password",
        label: "Gemini API Key",
        required: true,
        placeholder: "AIza...",
      },
      modelId: {
        type: "select",
        label: "Model",
        required: true,
        default: "gemini-2.5-flash",
        options: [
          "gemini-2.5-flash",
          "gemini-2.5-pro",
          "gemini-2.0-flash",
          "gemini-1.5-pro",
          "gemini-1.5-flash",
          "gemini-1.5-flash-8b",
        ],
      },
    };
  }
}
