/**
 * Abstract base class for LLM providers
 */

import type { TabData, GroupingResult, ConfigSchema } from "./types";

export abstract class LLMProvider {
  /**
   * Categorize tabs into groups using LLM
   */
  abstract categorize(
    tabs: TabData[],
    userPrompt?: string,
  ): Promise<GroupingResult>;

  /**
   * Test if credentials are valid
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get configuration schema for UI generation
   */
  abstract getConfigSchema(): ConfigSchema;

  /**
   * Build standardized prompt (shared logic)
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
- Some tabs may remain ungrouped if they don't fit

${userPrompt ? `User guidance: ${userPrompt}` : ""}

Return JSON only:
{
  "groups": [
    {
      "name": "Group Name",
      "color": "blue",
      "tabIndices": [0, 2, 5],
      "reasoning": "Brief explanation"
    }
  ],
  "ungrouped": [1, 3]
}`;

    const userMessage = tabs
      .map((tab, idx) => `[${idx}] ${tab.title}\n    URL: ${tab.url}`)
      .join("\n\n");

    return { system: systemPrompt, user: userMessage };
  }

  /**
   * Parse and validate LLM response
   */
  protected parseResponse(response: string): GroupingResult {
    try {
      const data = JSON.parse(response) as GroupingResult;
      this.validateGrouping(data);
      return data;
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }

  /**
   * Validate grouping structure
   */
  protected validateGrouping(data: GroupingResult): void {
    if (!data.groups || !Array.isArray(data.groups)) {
      throw new Error("Invalid response: missing groups array");
    }

    for (const group of data.groups) {
      if (!group.name || !group.color || !Array.isArray(group.tabIndices)) {
        throw new Error("Invalid group structure");
      }
    }

    if (!Array.isArray(data.ungrouped)) {
      throw new Error("Invalid response: missing ungrouped array");
    }
  }
}
