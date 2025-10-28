/**
 * Popup UI logic
 */

import browser from "webextension-polyfill";
import type { CleanResult } from "../lib/types";
import { handleResponse, setVisibility, updateStatus } from "./ui-utils";

// Store current clean result for clipboard and confirmation
let currentCleanResult: CleanResult | null = null;

document.addEventListener("DOMContentLoaded", () => {
  const organizeButton = document.getElementById("organize-button");
  const promptInput = document.getElementById("prompt-input") as HTMLInputElement;
  const cleanButton = document.getElementById("clean-button");
  const cleanPromptInput = document.getElementById("clean-prompt-input") as HTMLInputElement;
  const statusDiv = document.getElementById("status");
  const settingsLink = document.getElementById("settings-link");
  const previewSection = document.getElementById("preview-section");
  const previewList = document.getElementById("preview-list");
  const previewReasoning = document.getElementById("preview-reasoning");
  const copyUrlsButton = document.getElementById("copy-urls-button");
  const confirmCloseButton = document.getElementById("confirm-close-button");
  const cancelButton = document.getElementById("cancel-button");

  // Handle organize button
  if (organizeButton) {
    organizeButton.addEventListener("click", async () => {
      const userPrompt = promptInput?.value?.trim() || "";

      updateStatus(statusDiv, "Organizing tabs...", "status-message loading");

      try {
        const response = (await browser.runtime.sendMessage({
          action: "organizeTabs",
          userPrompt,
        })) as { success: boolean; message?: string; error?: string };

        handleResponse(response, statusDiv);
      } catch (error) {
        updateStatus(statusDiv, `✗ Error: ${error}`, "status-message error");
        console.error("Failed to organize tabs:", error);
      }
    });
  }

  // Handle clean button
  if (cleanButton) {
    cleanButton.addEventListener("click", async () => {
      const userPrompt = cleanPromptInput?.value?.trim() || "";

      if (!userPrompt) {
        updateStatus(
          statusDiv,
          "✗ Please enter a prompt for cleaning tabs",
          "status-message error",
        );
        return;
      }

      updateStatus(statusDiv, "Analyzing tabs...", "status-message loading");
      setVisibility(previewSection, false);

      try {
        const response = (await browser.runtime.sendMessage({
          action: "cleanTabs",
          userPrompt,
        })) as {
          success: boolean;
          message?: string;
          error?: string;
          cleanResult?: CleanResult;
        };

        if (response.success && response.cleanResult) {
          currentCleanResult = response.cleanResult;

          if (response.cleanResult.tabsToClose.length === 0) {
            updateStatus(statusDiv, "✓ No tabs matched your criteria");
            return;
          }

          // Show preview
          if (previewSection && previewList && previewReasoning) {
            previewList.innerHTML = "";

            // Add each tab to preview
            for (const tab of response.cleanResult.tabDetails) {
              const item = document.createElement("div");
              item.className = "tab-preview-item";
              item.innerHTML = `
                <div class="title">${escapeHtml(tab.title)}</div>
                <div class="url">${escapeHtml(tab.url)}</div>
              `;
              previewList.appendChild(item);
            }

            // Show reasoning
            previewReasoning.textContent = response.cleanResult.reasoning;

            setVisibility(previewSection, true);
            updateStatus(
              statusDiv,
              `Found ${response.cleanResult.tabsToClose.length} tabs to close`,
            );
          }
        } else {
          updateStatus(
            statusDiv,
            `✗ Error: ${response.error || response.message}`,
            "status-message error",
          );
        }
      } catch (error) {
        updateStatus(statusDiv, `✗ Error: ${error}`, "status-message error");
        console.error("Failed to clean tabs:", error);
      }
    });
  }

  // Handle copy URLs button
  if (copyUrlsButton) {
    copyUrlsButton.addEventListener("click", async () => {
      if (!currentCleanResult) return;

      const urls = currentCleanResult.tabDetails.map((tab) => tab.url).join("\n");

      try {
        await navigator.clipboard.writeText(urls);
        updateStatus(statusDiv, "✓ URLs copied to clipboard!", "status-message success");
      } catch (error) {
        updateStatus(statusDiv, `✗ Failed to copy: ${error}`, "status-message error");
      }
    });
  }

  // Handle confirm close button
  if (confirmCloseButton) {
    confirmCloseButton.addEventListener("click", async () => {
      if (!currentCleanResult) return;

      updateStatus(statusDiv, "Closing tabs...", "status-message loading");

      try {
        const response = (await browser.runtime.sendMessage({
          action: "confirmCloseTabs",
          tabIndices: currentCleanResult.tabsToClose,
        })) as { success: boolean; message?: string; error?: string };

        if (response.success) {
          handleResponse(response, statusDiv);
          setVisibility(previewSection, false);
          currentCleanResult = null;

          // Clear clean prompt input
          if (cleanPromptInput) {
            cleanPromptInput.value = "";
          }
        } else {
          handleResponse(response, statusDiv);
        }
      } catch (error) {
        updateStatus(statusDiv, `✗ Error: ${error}`, "status-message error");
        console.error("Failed to close tabs:", error);
      }
    });
  }

  // Handle cancel button
  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      setVisibility(previewSection, false);
      currentCleanResult = null;
      updateStatus(statusDiv, "");
    });
  }

  // Handle settings link
  if (settingsLink) {
    settingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      browser.runtime.openOptionsPage();
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

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
