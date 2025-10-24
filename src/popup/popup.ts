/**
 * Popup UI logic
 */

import browser from "webextension-polyfill";

document.addEventListener("DOMContentLoaded", () => {
  const organizeButton = document.getElementById("organize-button");
  const promptInput = document.getElementById(
    "prompt-input",
  ) as HTMLInputElement;
  const statusDiv = document.getElementById("status");

  if (organizeButton) {
    organizeButton.addEventListener("click", async () => {
      const userPrompt = promptInput?.value?.trim() || "";

      if (statusDiv) {
        statusDiv.textContent = "Organizing tabs...";
      }

      try {
        const response = (await browser.runtime.sendMessage({
          action: "organizeTabs",
          userPrompt,
        })) as { success: boolean; message?: string; error?: string };

        if (statusDiv) {
          if (response.success) {
            statusDiv.textContent = "✓ Tabs organized!";
          } else {
            statusDiv.textContent = `✗ Error: ${response.error || response.message}`;
          }
        }
      } catch (error) {
        if (statusDiv) {
          statusDiv.textContent = `✗ Error: ${error}`;
        }
        console.error("Failed to organize tabs:", error);
      }
    });
  }

  // Load tab count
  browser.tabs.query({ currentWindow: true }).then((tabs) => {
    const tabCountDiv = document.getElementById("tab-count");
    if (tabCountDiv) {
      tabCountDiv.textContent = `${tabs.length} tabs open`;
    }
  });
});
