/**
 * Shared utility functions for tab organization
 */

import type { Tabs } from "webextension-polyfill";
import type { TabData } from "./types";

/**
 * LLM configuration constants used across all providers
 */
export const LLM_CONFIG = {
  TEMPERATURE: 0.3,
  MAX_RETRIES: 3,
  CATEGORIZE_MAX_TOKENS: 4096,
  CLEAN_MAX_TOKENS: 2048,
} as const;

/**
 * Filter and transform browser tabs into organizable TabData format.
 * Excludes pinned tabs and special URLs (about:*, moz-extension:*).
 *
 * Consolidates 3 identical implementations from background.ts
 *
 * @param tabs - Array of browser tabs from browser.tabs.query()
 * @returns Array of TabData ready for LLM processing
 */
export function getOrganizableTabs(tabs: Tabs.Tab[]): TabData[] {
  return tabs
    .filter(
      (tab): tab is typeof tab & { id: number; url: string } =>
        !tab.pinned &&
        tab.id !== undefined &&
        tab.url !== undefined &&
        !tab.url.startsWith("about:") &&
        !tab.url.startsWith("moz-extension:"),
    )
    .map((tab) => ({
      id: tab.id,
      index: tab.index,
      title: tab.title || "Untitled",
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      active: tab.active,
      pinned: tab.pinned,
      windowId: tab.windowId ?? 0,
      groupId: tab.groupId ?? -1,
    }));
}

/**
 * Extract tab IDs from TabData array using indices.
 * Filters out undefined IDs safely.
 *
 * Consolidates 2 identical implementations from background.ts
 *
 * @param tabs - Array of TabData
 * @param indices - Array of indices to extract
 * @returns Array of valid tab IDs
 */
export function getTabIds(tabs: TabData[], indices: number[]): number[] {
  return indices.map((idx) => tabs[idx]?.id).filter((id): id is number => id !== undefined);
}
