/**
 * Options page logic
 */

import browser from "webextension-polyfill";

document.addEventListener("DOMContentLoaded", () => {
  const saveButton = document.getElementById("save-button");
  const statusDiv = document.getElementById("status");

  // Load saved settings
  loadSettings();

  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      try {
        await saveSettings();
        if (statusDiv) {
          statusDiv.textContent = "✓ Settings saved!";
          setTimeout(() => {
            statusDiv.textContent = "";
          }, 3000);
        }
      } catch (error) {
        if (statusDiv) {
          statusDiv.textContent = `✗ Error: ${error}`;
        }
        console.error("Failed to save settings:", error);
      }
    });
  }
});

async function loadSettings() {
  try {
    const data = await browser.storage.local.get([
      "selectedProvider",
      "providerConfigs",
    ]);

    console.log("Loaded settings:", data);

    // TODO: Populate form fields with loaded data
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

async function saveSettings() {
  // TODO: Collect form data and save to storage
  const settings = {
    selectedProvider: "claude",
    providerConfigs: {
      claude: {
        claudeApiKey: "",
        modelId: "claude-3-5-sonnet-20241022",
      },
    },
  };

  await browser.storage.local.set(settings);
  console.log("Saved settings:", settings);
}
