/**
 * OpenAI Provider using Vercel AI SDK
 */

import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModelV1, generateText } from "ai";
import { LLMProvider } from "../llm-provider";
import type { CleanResult, ConfigSchema, GroupingResult, OpenAIConfig, TabData } from "../types";

export class OpenAIProvider extends LLMProvider {
  private _config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    super();
    this._config = config;
  }

  private getModel(): LanguageModelV1 {
    const openai = createOpenAI({
      apiKey: this._config.openaiApiKey,
    });
    return openai(this._config.modelId);
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
      console.error("OpenAI connection test failed:", error);
      return false;
    }
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
