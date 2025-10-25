/**
 * Options page logic with dynamic provider configuration
 */

import browser from "webextension-polyfill";
import { PROVIDERS, createProvider } from "../lib/provider-registry";
import type { ExtensionStorage, ProviderType } from "../lib/types";

let currentProvider: ProviderType = "claude";

document.addEventListener("DOMContentLoaded", () => {
  const providerSelect = document.getElementById("provider-select") as HTMLSelectElement;
  const saveButton = document.getElementById("save-button");
  const testButton = document.getElementById("test-connection");
  const statusDiv = document.getElementById("status");

  // Load saved settings
  loadSettings();

  // Handle provider selection change
  if (providerSelect) {
    providerSelect.addEventListener("change", () => {
      currentProvider = providerSelect.value as ProviderType;
      renderProviderConfig(currentProvider);
    });
  }

  // Handle save button
  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      try {
        await saveSettings();
        if (statusDiv) {
          statusDiv.textContent = "✓ Settings saved!";
          statusDiv.className = "status-message success";
          setTimeout(() => {
            statusDiv.textContent = "";
            statusDiv.className = "status-message";
          }, 3000);
        }
      } catch (error) {
        if (statusDiv) {
          statusDiv.textContent = `✗ Error: ${error}`;
          statusDiv.className = "status-message error";
        }
        console.error("Failed to save settings:", error);
      }
    });
  }

  // Handle test connection button
  if (testButton) {
    testButton.addEventListener("click", async () => {
      if (statusDiv) {
        statusDiv.textContent = "Testing connection...";
        statusDiv.className = "status-message";
      }

      try {
        const config = collectProviderConfig();
        // biome-ignore lint/suspicious/noExplicitAny: Config is collected dynamically from form fields
        const provider = createProvider(currentProvider, config as any);
        const isConnected = await provider.testConnection();

        if (statusDiv) {
          if (isConnected) {
            statusDiv.textContent = "✓ Connection successful!";
            statusDiv.className = "status-message success";
          } else {
            statusDiv.textContent = "✗ Connection failed. Check your credentials.";
            statusDiv.className = "status-message error";
          }

          setTimeout(() => {
            statusDiv.textContent = "";
            statusDiv.className = "status-message";
          }, 5000);
        }
      } catch (error) {
        if (statusDiv) {
          statusDiv.textContent = `✗ Connection error: ${error}`;
          statusDiv.className = "status-message error";
        }
        console.error("Connection test failed:", error);
      }
    });
  }
});

async function loadSettings() {
  try {
    const data = (await browser.storage.local.get([
      "selectedProvider",
      "providerConfigs",
    ])) as Partial<ExtensionStorage>;

    console.log("Loaded settings:", data);

    // Set provider selection
    const providerSelect = document.getElementById("provider-select") as HTMLSelectElement;
    if (data.selectedProvider && providerSelect) {
      currentProvider = data.selectedProvider;
      providerSelect.value = currentProvider;
    }

    // Render config fields for selected provider
    renderProviderConfig(currentProvider, data.providerConfigs);
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
}

async function saveSettings() {
  const config = collectProviderConfig();

  const settings: Partial<ExtensionStorage> = {
    selectedProvider: currentProvider,
    providerConfigs: {
      [currentProvider]: config,
    },
  };

  // Load existing configs and merge
  const existing = (await browser.storage.local.get("providerConfigs")) as {
    providerConfigs?: ExtensionStorage["providerConfigs"];
  };

  if (existing.providerConfigs) {
    settings.providerConfigs = {
      ...existing.providerConfigs,
      [currentProvider]: config,
    };
  }

  await browser.storage.local.set(settings);
  console.log("Saved settings:", settings);
}

function renderProviderConfig(
  providerType: ProviderType,
  savedConfigs?: ExtensionStorage["providerConfigs"],
) {
  const configDiv = document.getElementById("provider-config");
  if (!configDiv) return;

  // Get provider info
  const providerInfo = PROVIDERS[providerType];
  // biome-ignore lint/suspicious/noExplicitAny: Temporary instance just for schema retrieval
  const provider = new providerInfo.class({} as any);
  const schema = provider.getConfigSchema();

  // Clear existing config
  configDiv.innerHTML = "";

  // Get saved config for this provider
  // biome-ignore lint/suspicious/noExplicitAny: Saved config structure is provider-specific and dynamic
  const savedConfig = savedConfigs?.[providerType] as Record<string, any> | undefined;

  // Generate form fields from schema
  for (const [fieldName, fieldDef] of Object.entries(schema)) {
    const formGroup = document.createElement("div");
    formGroup.className = "form-group";

    const label = document.createElement("label");
    label.htmlFor = `config-${fieldName}`;
    label.textContent = fieldDef.label + (fieldDef.required ? " *" : "");
    formGroup.appendChild(label);

    let input: HTMLInputElement | HTMLSelectElement;

    if (fieldDef.type === "select" && fieldDef.options) {
      // Create select dropdown
      input = document.createElement("select");
      input.id = `config-${fieldName}`;
      input.dataset.fieldName = fieldName;

      for (const option of fieldDef.options) {
        const optionElement = document.createElement("option");
        optionElement.value = option;
        optionElement.textContent = option;
        input.appendChild(optionElement);
      }

      // Set saved or default value
      if (savedConfig?.[fieldName]) {
        input.value = savedConfig[fieldName];
      } else if (fieldDef.default) {
        input.value = String(fieldDef.default);
      }
    } else {
      // Create text/password/number input
      input = document.createElement("input");
      input.id = `config-${fieldName}`;
      input.dataset.fieldName = fieldName;
      input.type =
        fieldDef.type === "password" ? "password" : fieldDef.type === "number" ? "number" : "text";

      if (fieldDef.placeholder) {
        input.placeholder = fieldDef.placeholder;
      }

      // Set saved or default value
      if (savedConfig?.[fieldName]) {
        input.value = String(savedConfig[fieldName]);
      } else if (fieldDef.default) {
        input.value = String(fieldDef.default);
      }
    }

    if (fieldDef.required) {
      input.required = true;
    }

    formGroup.appendChild(input);
    configDiv.appendChild(formGroup);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Form data is collected dynamically and provider-specific
function collectProviderConfig(): Record<string, any> {
  const configDiv = document.getElementById("provider-config");
  if (!configDiv) return {};

  // biome-ignore lint/suspicious/noExplicitAny: Form data structure depends on provider schema
  const config: Record<string, any> = {};
  const inputs = Array.from(
    configDiv.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"),
  );

  for (const input of inputs) {
    const fieldName = input.dataset.fieldName;
    if (fieldName) {
      config[fieldName] = input.value;
    }
  }

  return config;
}
