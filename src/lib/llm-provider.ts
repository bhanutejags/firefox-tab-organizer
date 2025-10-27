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
- Some tabs may remain ungrouped if they don't fit

${userPrompt ? `User guidance: ${userPrompt}` : ""}

RESPONSE FORMAT - CRITICAL:
You MUST respond with ONLY a valid JSON object. No markdown code blocks, no backticks, no explanation text.
Start your response with { and end with }

Required JSON structure:
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

User request: ${userPrompt}

RESPONSE FORMAT - CRITICAL:
You MUST respond with ONLY a valid JSON object. No markdown code blocks, no backticks, no explanation text.
Start your response with { and end with }

Required JSON structure:
{
  "tabsToClose": [0, 2, 5],
  "reasoning": "Brief explanation of why these tabs were selected"
}`;

    const userMessage = tabs
      .map((tab, idx) => `[${idx}] ${tab.title}\n    URL: ${tab.url}`)
      .join("\n\n");

    return { system: systemPrompt, user: userMessage };
  }

  /**
   * Extract JSON from response (handles markdown code blocks)
   */
  private extractJSON(response: string): string {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch?.[1]) {
      return jsonMatch[1];
    }

    // Look for JSON object in the response
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
      return objectMatch[0];
    }

    // Return as-is if no pattern found
    return response.trim();
  }

  /**
   * Parse and validate LLM response
   */
  protected parseResponse(response: string): GroupingResult {
    try {
      // Extract JSON from potential markdown or extra text
      const jsonStr = this.extractJSON(response);
      const data = JSON.parse(jsonStr) as GroupingResult;
      this.validateGrouping(data);
      return data;
    } catch (error) {
      console.error("Failed to parse LLM response:", response);
      throw new Error(
        `Failed to parse LLM response: ${error}. Response: ${response.substring(0, 200)}...`,
      );
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

  /**
   * Parse and validate LLM clean response
   */
  protected parseCleanResponse(response: string, tabs: TabData[]): CleanResult {
    try {
      // Extract JSON from potential markdown or extra text
      const jsonStr = this.extractJSON(response);
      const data = JSON.parse(jsonStr) as Omit<CleanResult, "tabDetails">;
      this.validateCleanResult(data);

      // Add tab details for clipboard
      const tabDetails = data.tabsToClose.map((idx) => ({
        title: tabs[idx]?.title || "Unknown",
        url: tabs[idx]?.url || "",
      }));

      return { ...data, tabDetails };
    } catch (error) {
      console.error("Failed to parse LLM clean response:", response);
      throw new Error(
        `Failed to parse LLM response: ${error}. Response: ${response.substring(0, 200)}...`,
      );
    }
  }

  /**
   * Validate clean result structure
   */
  protected validateCleanResult(data: Omit<CleanResult, "tabDetails">): void {
    if (!Array.isArray(data.tabsToClose)) {
      throw new Error("Invalid response: missing tabsToClose array");
    }

    if (typeof data.reasoning !== "string") {
      throw new Error("Invalid response: missing reasoning string");
    }
  }
}
