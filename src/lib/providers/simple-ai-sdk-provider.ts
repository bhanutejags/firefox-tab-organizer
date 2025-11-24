/**
 * Abstract base class for providers using Vercel AI SDK
 * Consolidates duplicate code between Claude and OpenAI providers
 */

import { generateObject, generateText } from "ai";
import { z } from "zod";
import { LLMProvider } from "../llm-provider";
import type { CleanResult, GroupingResult, TabData } from "../types";
import { LLM_CONFIG } from "../utils";

/**
 * Zod schema for tab group color
 */
const tabGroupColorSchema = z.enum([
  "blue",
  "red",
  "green",
  "yellow",
  "purple",
  "pink",
  "orange",
  "cyan",
]);

/**
 * Zod schema for a single tab group
 */
const tabGroupSchema = z.object({
  name: z.string().describe("Name of the group (e.g., 'Development', 'Research: AI')"),
  color: tabGroupColorSchema.describe("Color for the tab group"),
  tabIndices: z.array(z.number()).describe("Array of tab indices to include in this group"),
  reasoning: z
    .string()
    .optional()
    .describe("Brief explanation of why these tabs are grouped together"),
});

/**
 * Zod schema for grouping result
 */
const groupingResultSchema = z.object({
  groups: z.array(tabGroupSchema).describe("Array of tab groups (3-7 groups recommended)"),
  ungrouped: z.array(z.number()).describe("Array of tab indices that don't fit into any group"),
});

/**
 * Zod schema for clean result (tabs to close)
 */
const cleanResultSchema = z.object({
  tabsToClose: z.array(z.number()).describe("Array of tab indices to close"),
  reasoning: z.string().describe("Explanation of why these tabs were selected for closing"),
});

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
  // biome-ignore lint/suspicious/noExplicitAny: Need to accept different SDK versions (V1/V2) at runtime
  protected abstract getModel(): any;

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

    // Validate response is not empty
    if (!text || text.trim().length === 0) {
      throw new Error(
        `${this.constructor.name} returned empty response. This may indicate: 1) Model context limit exceeded, 2) API rate limiting, or 3) Invalid API key.`,
      );
    }

    return text;
  }

  /**
   * Categorize tabs into groups using LLM with structured output.
   * Shared implementation for all simple AI SDK providers.
   */
  async categorize(tabs: TabData[], userPrompt?: string): Promise<GroupingResult> {
    const prompt = this.buildPrompt(tabs, userPrompt);

    const { object } = await generateObject({
      model: this.getModel(),
      schema: groupingResultSchema,
      system: prompt.system,
      prompt: prompt.user,
      temperature: LLM_CONFIG.TEMPERATURE,
      maxTokens: LLM_CONFIG.CATEGORIZE_MAX_TOKENS,
      maxRetries: LLM_CONFIG.MAX_RETRIES,
    });

    return object as GroupingResult;
  }

  /**
   * Identify tabs to close based on user prompt with structured output.
   * Shared implementation for all simple AI SDK providers.
   */
  async cleanTabs(tabs: TabData[], userPrompt: string): Promise<CleanResult> {
    const prompt = this.buildCleanPrompt(tabs, userPrompt);

    const { object } = await generateObject({
      model: this.getModel(),
      schema: cleanResultSchema,
      system: prompt.system,
      prompt: prompt.user,
      temperature: LLM_CONFIG.TEMPERATURE,
      maxTokens: LLM_CONFIG.CLEAN_MAX_TOKENS,
      maxRetries: LLM_CONFIG.MAX_RETRIES,
    });

    // Type assertion for the structured output
    const result = object as { tabsToClose: number[]; reasoning: string };

    // Add tab details for clipboard
    const tabDetails = result.tabsToClose.map((idx: number) => ({
      title: tabs[idx]?.title || "Unknown",
      url: tabs[idx]?.url || "",
    }));

    return { ...result, tabDetails };
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
