/**
 * Claude API Provider using Vercel AI SDK
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { type LanguageModelV1, generateText } from "ai";
import { LLMProvider } from "../llm-provider";
import type { ClaudeConfig, CleanResult, ConfigSchema, GroupingResult, TabData } from "../types";

export class ClaudeProvider extends LLMProvider {
  private _config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    super();
    this._config = config;
  }

  private getModel(): LanguageModelV1 {
    const anthropic = createAnthropic({
      apiKey: this._config.claudeApiKey,
    });
    return anthropic(this._config.modelId);
  }

  async categorize(tabs: TabData[], userPrompt?: string): Promise<GroupingResult> {
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

  async cleanTabs(tabs: TabData[], userPrompt: string): Promise<CleanResult> {
    const prompt = this.buildCleanPrompt(tabs, userPrompt);

    const { text } = await generateText({
      model: this.getModel(),
      system: prompt.system,
      prompt: prompt.user,
      temperature: 0.3,
      maxTokens: 2048,
      maxRetries: 3,
    });

    return this.parseCleanResponse(text, tabs);
  }

  async testConnection(): Promise<boolean> {
    try {
      await generateText({
        model: this.getModel(),
        prompt: "Test",
        maxTokens: 10,
      });
      return true;
    } catch (error) {
      console.error("Claude connection test failed:", error);
      return false;
    }
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
