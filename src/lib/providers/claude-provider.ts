/**
 * Claude API Provider (placeholder)
 */

import { LLMProvider } from "../llm-provider";
import type {
  TabData,
  GroupingResult,
  ConfigSchema,
  ClaudeConfig,
} from "../types";

export class ClaudeProvider extends LLMProvider {
  private _config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    super();
    this._config = config;
  }

  async categorize(
    tabs: TabData[],
    userPrompt?: string,
  ): Promise<GroupingResult> {
    // TODO: Implement Claude API integration
    console.log("Claude provider not yet implemented", tabs, userPrompt);
    throw new Error("Claude provider not yet implemented");
  }

  async testConnection(): Promise<boolean> {
    // TODO: Test Claude API connection
    return false;
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
