/**
 * Background service worker
 */

import browser from "webextension-polyfill";

console.log("Firefox Tab Organizer background script loaded");

// Listen for messages from popup/options
browser.runtime.onMessage.addListener((message: any, _sender: any) => {
  console.log("Received message:", message, "from:", _sender);

  if (message.action === "organizeTabs") {
    return organizeTabsWithAI(message.userPrompt);
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

    // TODO: Implement tab organization logic
    // 1. Get tabs from current window
    // 2. Load provider config from storage
    // 3. Call LLM provider
    // 4. Create tab groups

    return { success: true, message: "Not yet implemented" };
  } catch (error) {
    console.error("Failed to organize tabs:", error);
    return { success: false, error: String(error) };
  }
}
