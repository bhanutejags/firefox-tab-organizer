/**
 * Browser storage utilities for provider configuration
 */

import browser from "webextension-polyfill";
import type { ExtensionStorage, ProviderConfig, ProviderType } from "./types";

/**
 * Load provider configuration from browser storage.
 * Returns the selected provider type and its configuration.
 *
 * Consolidates 2 identical implementations from background.ts
 *
 * @returns Provider type and configuration
 * @throws Error if provider is not configured
 */
export async function loadProviderConfig(): Promise<{
  providerType: ProviderType;
  providerConfig: ProviderConfig;
}> {
  const storage = (await browser.storage.local.get([
    "selectedProvider",
    "providerConfigs",
  ])) as Partial<ExtensionStorage>;

  const providerType = storage.selectedProvider || "claude";
  const providerConfig = storage.providerConfigs?.[providerType];

  if (!providerConfig) {
    throw new Error("Provider not configured. Please configure your LLM provider in settings.");
  }

  return { providerType, providerConfig };
}
