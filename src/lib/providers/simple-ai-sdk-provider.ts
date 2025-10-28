/**
 * Abstract base class for providers using Vercel AI SDK
 * Consolidates duplicate code between Claude and OpenAI providers
 */

import { type LanguageModelV1, generateText } from "ai";
import { LLMProvider } from "../llm-provider";
import type { CleanResult, GroupingResult, TabData } from "../types";
import { LLM_CONFIG } from "../utils";

/**
 * Base class for simple AI SDK providers (Claude, OpenAI, etc.)
 * Provides shared implementation of categorize, cleanTabs, and testConnection.
 *
 * Consolidates 5 generateText() calls and eliminates ~130 lines of duplicate code.
 */
export abstract class SimpleAISDKProvider extends LLMProvider {
  /**
   * Get the AI SDK model instance.
   * Subclasses must implement this to provide provider-specific model.
   */
  protected abstract getModel(): LanguageModelV1;

  /**
   * Call LLM with standardized parameters.
   * Uses configuration constants from LLM_CONFIG.
   *
   * @param systemPrompt - System prompt
   * @param userPrompt - User prompt
   * @param maxTokens - Maximum tokens for response
   * @returns LLM response text
   */
  protected async callLLM(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
  ): Promise<string> {
    const { text } = await generateText({
      model: this.getModel(),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: LLM_CONFIG.TEMPERATURE,
      maxTokens,
      maxRetries: LLM_CONFIG.MAX_RETRIES,
    });

    return text;
  }

  /**
   * Categorize tabs into groups using LLM.
   * Shared implementation for all simple AI SDK providers.
   */
  async categorize(tabs: TabData[], userPrompt?: string): Promise<GroupingResult> {
    const prompt = this.buildPrompt(tabs, userPrompt);
    const text = await this.callLLM(prompt.system, prompt.user, LLM_CONFIG.CATEGORIZE_MAX_TOKENS);
    return this.parseResponse(text);
  }

  /**
   * Identify tabs to close based on user prompt.
   * Shared implementation for all simple AI SDK providers.
   */
  async cleanTabs(tabs: TabData[], userPrompt: string): Promise<CleanResult> {
    const prompt = this.buildCleanPrompt(tabs, userPrompt);
    const text = await this.callLLM(prompt.system, prompt.user, LLM_CONFIG.CLEAN_MAX_TOKENS);
    return this.parseCleanResponse(text, tabs);
  }

  /**
   * Test if credentials are valid by making a minimal API call.
   * Shared implementation for all simple AI SDK providers.
   */
  async testConnection(): Promise<boolean> {
    try {
      await generateText({
        model: this.getModel(),
        prompt: "Test",
        maxTokens: 10,
      });
      return true;
    } catch (error) {
      console.error(`${this.constructor.name} connection test failed:`, error);
      return false;
    }
  }
}
