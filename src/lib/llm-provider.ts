/**
 * Abstract base class for LLM providers
 */

import type { CleanResult, ConfigSchema, GroupingResult, TabData } from "./types";

export abstract class LLMProvider {
  /**
   * Categorize tabs into groups using LLM
   */
  abstract categorize(tabs: TabData[], userPrompt?: string): Promise<GroupingResult>;

  /**
   * Identify tabs to close based on user prompt using LLM
   */
  abstract cleanTabs(tabs: TabData[], userPrompt: string): Promise<CleanResult>;

  /**
   * Test if credentials are valid
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get configuration schema for UI generation
   */
  abstract getConfigSchema(): ConfigSchema;

  /**
   * Build standardized prompt for tab organization (shared logic)
   */
  protected buildPrompt(
    tabs: TabData[],
    userPrompt?: string,
  ): {
    system: string;
    user: string;
  } {
    const systemPrompt = `You are a tab organization assistant. Analyze the provided browser tabs and group them into logical categories.

Rules:
- Create 3-7 groups maximum
- Group by: topic, project, domain similarity, or purpose
- Name groups clearly (e.g., "Development", "Research: AI", "Shopping")
- Assign appropriate colors: blue, red, green, yellow, purple, pink, orange, cyan
- Some tabs may remain ungrouped if they don't fit any category

${userPrompt ? `User guidance: ${userPrompt}` : ""}`;

    const userMessage = tabs
      .map((tab, idx) => `[${idx}] ${tab.title}\n    URL: ${tab.url}`)
      .join("\n\n");

    return { system: systemPrompt, user: userMessage };
  }

  /**
   * Build prompt for tab cleaning (shared logic)
   */
  protected buildCleanPrompt(
    tabs: TabData[],
    userPrompt: string,
  ): {
    system: string;
    user: string;
  } {
    const systemPrompt = `You are a tab cleanup assistant. Analyze the provided browser tabs and identify which ones should be closed based on the user's request.

Rules:
- Be conservative - only suggest closing tabs that clearly match the user's criteria
- Consider tab titles, URLs, and domains
- Provide clear reasoning for your selection
- If no tabs match, return an empty array

User request: ${userPrompt}`;

    const userMessage = tabs
      .map((tab, idx) => `[${idx}] ${tab.title}\n    URL: ${tab.url}`)
      .join("\n\n");

    return { system: systemPrompt, user: userMessage };
  }
}
