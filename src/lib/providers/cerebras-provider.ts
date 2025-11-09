/**
 * Cerebras Provider
 */

import { createCerebras } from "@ai-sdk/cerebras";
import type { CerebrasConfig, ConfigSchema } from "../types";
import { SimpleAISDKProvider } from "./simple-ai-sdk-provider";

export class CerebrasProvider extends SimpleAISDKProvider {
  private _config: CerebrasConfig;

  constructor(config: CerebrasConfig) {
    super();
    this._config = config;
  }

  protected getModel() {
    const cerebras = createCerebras({
      apiKey: this._config.cerebrasApiKey,
    });
    return cerebras(this._config.modelId);
  }

  getConfigSchema(): ConfigSchema {
    return {
      cerebrasApiKey: {
        type: "password",
        label: "Cerebras API Key",
        required: true,
        placeholder: "Your Cerebras API key",
      },
      modelId: {
        type: "select",
        label: "Model",
        required: true,
        default: "llama-3.3-70b",
        options: [
          "llama-3.3-70b",
          "llama3.1-8b",
          "gpt-oss-120b",
          "qwen-3-235b-a22b-instruct-2507",
          "qwen-3-235b-a22b-thinking-2507",
          "qwen-3-32b",
          "qwen-3-coder-480b",
        ],
      },
    };
  }
}
