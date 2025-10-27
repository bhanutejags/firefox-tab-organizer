/**
 * Background service worker
 */

import browser from "webextension-polyfill";
import type { Runtime } from "webextension-polyfill";
import { createProvider } from "./lib/provider-registry";
import type { CleanResult, ExtensionStorage, GroupingResult, TabData } from "./lib/types";

// Message types for extension communication
interface OrganizeTabsMessage {
  action: "organizeTabs";
  userPrompt?: string;
}

interface CleanTabsMessage {
  action: "cleanTabs";
  userPrompt: string;
}

interface ConfirmCloseTabsMessage {
  action: "confirmCloseTabs";
  tabIndices: number[];
}

type ExtensionMessage = OrganizeTabsMessage | CleanTabsMessage | ConfirmCloseTabsMessage;

console.log("Firefox Tab Organizer background script loaded");

// Listen for messages from popup/options
browser.runtime.onMessage.addListener((message: unknown, _sender: Runtime.MessageSender) => {
  console.log("Received message:", message, "from:", _sender);

  // Type guard for extension messages
  if (typeof message === "object" && message !== null && "action" in message) {
    const typedMessage = message as ExtensionMessage;
    if (typedMessage.action === "organizeTabs") {
      return organizeTabsWithAI(typedMessage.userPrompt);
    }
    if (typedMessage.action === "cleanTabs") {
      return cleanTabsWithAI(typedMessage.userPrompt);
    }
    if (typedMessage.action === "confirmCloseTabs") {
      return confirmCloseTabs(typedMessage.tabIndices);
    }
  }

  return Promise.resolve({ success: false, error: "Unknown action" });
});

async function organizeTabsWithAI(userPrompt?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log("Organizing tabs with prompt:", userPrompt);

    // 1. Load configuration from storage
    const storage = (await browser.storage.local.get([
      "selectedProvider",
      "providerConfigs",
    ])) as Partial<ExtensionStorage>;

    const providerType = storage.selectedProvider || "claude";
    const providerConfig = storage.providerConfigs?.[providerType];

    if (!providerConfig) {
      throw new Error("Provider not configured. Please configure your LLM provider in settings.");
    }

    // 2. Get tabs from current window
    const tabs = await browser.tabs.query({ currentWindow: true });
    const tabData: TabData[] = tabs
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

    if (tabData.length === 0) {
      return {
        success: false,
        error: "No tabs to organize (only pinned or special tabs found)",
      };
    }

    console.log(`Found ${tabData.length} tabs to organize`);

    // 3. Create provider and categorize tabs
    const provider = createProvider(providerType, providerConfig);
    const grouping = await provider.categorize(tabData, userPrompt);

    console.log("LLM grouping result:", grouping);

    // 4. Apply grouping to browser
    await applyGrouping(tabData, grouping);

    return {
      success: true,
      message: `Successfully organized ${tabData.length} tabs into ${grouping.groups.length} groups`,
    };
  } catch (error) {
    console.error("Failed to organize tabs:", error);
    return { success: false, error: String(error) };
  }
}

async function applyGrouping(tabs: TabData[], grouping: GroupingResult): Promise<void> {
  console.log("Applying grouping to browser tabs...");

  // Create tab groups from LLM categorization
  for (const group of grouping.groups) {
    const tabIds = group.tabIndices
      .map((idx) => tabs[idx]?.id)
      .filter((id): id is number => id !== undefined);

    if (tabIds.length === 0) {
      console.warn(`Skipping empty group: ${group.name}`);
      continue;
    }

    console.log(
      `Creating group "${group.name}" with ${tabIds.length} tabs (color: ${group.color})`,
    );

    // Group the tabs
    const groupId = await browser.tabs.group({ tabIds });

    // Update group properties
    await browser.tabGroups.update(groupId, {
      title: group.name,
      color: group.color,
      collapsed: false,
    });
  }

  console.log("✓ Tab grouping complete");
}

async function cleanTabsWithAI(userPrompt: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  cleanResult?: CleanResult;
}> {
  try {
    console.log("Cleaning tabs with prompt:", userPrompt);

    // 1. Load configuration from storage
    const storage = (await browser.storage.local.get([
      "selectedProvider",
      "providerConfigs",
    ])) as Partial<ExtensionStorage>;

    const providerType = storage.selectedProvider || "claude";
    const providerConfig = storage.providerConfigs?.[providerType];

    if (!providerConfig) {
      throw new Error("Provider not configured. Please configure your LLM provider in settings.");
    }

    // 2. Get tabs from current window
    const tabs = await browser.tabs.query({ currentWindow: true });
    const tabData: TabData[] = tabs
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

    if (tabData.length === 0) {
      return {
        success: false,
        error: "No tabs to clean (only pinned or special tabs found)",
      };
    }

    console.log(`Found ${tabData.length} tabs to analyze`);

    // 3. Create provider and identify tabs to close
    const provider = createProvider(providerType, providerConfig);
    const cleanResult = await provider.cleanTabs(tabData, userPrompt);

    console.log("LLM clean result:", cleanResult);

    // 4. Return result with preview data (don't close tabs yet)
    return {
      success: true,
      message: `Found ${cleanResult.tabsToClose.length} tabs to close`,
      cleanResult,
    };
  } catch (error) {
    console.error("Failed to clean tabs:", error);
    return { success: false, error: String(error) };
  }
}

async function confirmCloseTabs(tabIndices: number[]): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log("Closing tabs at indices:", tabIndices);

    // Get current tabs
    const tabs = await browser.tabs.query({ currentWindow: true });
    const tabData: TabData[] = tabs
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

    // Get tab IDs to close
    const tabIdsToClose = tabIndices
      .map((idx) => tabData[idx]?.id)
      .filter((id): id is number => id !== undefined);

    if (tabIdsToClose.length === 0) {
      return {
        success: false,
        error: "No valid tabs to close",
      };
    }

    // Close the tabs
    await browser.tabs.remove(tabIdsToClose);

    console.log(`✓ Closed ${tabIdsToClose.length} tabs`);

    return {
      success: true,
      message: `Successfully closed ${tabIdsToClose.length} tabs`,
    };
  } catch (error) {
    console.error("Failed to close tabs:", error);
    return { success: false, error: String(error) };
  }
}
