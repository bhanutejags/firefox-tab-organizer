# Implementation Plan: Duplicate Tab Detection & Removal

**Version:** 1.0
**Created:** 2025-10-27
**Status:** Planning Phase

---

## Overview

Add deterministic (non-LLM) duplicate tab detection and removal with user-configurable matching criteria. Users can scan for duplicates using various strategies (exact URL, normalized URL, domain matching, etc.) and choose which tabs to keep.

### Goals

1. **Deterministic Detection** - No LLM usage, pure algorithmic matching
2. **User-Configurable Criteria** - Upfront configuration in popup UI
3. **Safe Defaults** - Never close active tab, protect pinned tabs by default
4. **Preview Before Close** - Show grouped duplicates with clear indicators
5. **Reuse Existing UI** - Leverage current preview/confirmation flow

### Non-Goals

- Fuzzy matching with LLM (use existing `cleanTabs` for that)
- Automatic duplicate closing without user confirmation
- Cross-window duplicate detection (MVP focuses on current window)
- Undo/restore functionality (future enhancement)

---

## Architecture Overview

```
Popup UI (user configures criteria)
    ↓
Background Script (receives config)
    ↓
Duplicate Detector (pure logic, no LLM)
    ↓
Preview UI (show grouped duplicates)
    ↓
User Confirmation
    ↓
Close Tabs (reuse existing confirmCloseTabs)
```

### Key Components

1. **`src/lib/duplicate-detector.ts`** - Core detection logic
2. **`src/popup/popup.html`** - UI for criteria configuration
3. **`src/popup/popup.ts`** - Event handlers and preview rendering
4. **`src/popup/popup.css`** - Styling for presets and grouped view
5. **`src/background.ts`** - Message handler integration
6. **`src/lib/types.ts`** - Type definitions and interfaces

---

## Type Definitions

### New Types (`src/lib/types.ts`)

```typescript
/**
 * Configuration for duplicate detection
 */
export interface DuplicateConfig {
  enabled: boolean;
  matchStrategy: DuplicateMatchStrategy;
  keepStrategy: DuplicateKeepStrategy;
  whitelistDomains: string[];

  // Filter options
  ignorePinned: boolean;
  ignoreGrouped: boolean;
  neverCloseActive: boolean;
  minDuplicates: number; // Minimum tabs in group to report

  // Metadata
  description?: string;
}

/**
 * How to determine if tabs are duplicates
 */
export type DuplicateMatchStrategy =
  | "exact-url" // https://example.com/page?id=1#section
  | "url-no-hash" // https://example.com/page?id=1
  | "url-no-query" // https://example.com/page#section
  | "url-normalized" // https://example.com/page (recommended)
  | "domain-path" // example.com/page
  | "domain-only" // example.com
  | "title-exact" // Exact title match
  | "title-normalized" // Case-insensitive, trimmed
  | "url-and-title"; // Both must match

/**
 * Which tab to keep when duplicates found
 */
export type DuplicateKeepStrategy =
  | "keep-first" // Leftmost tab (lowest index)
  | "keep-last" // Rightmost tab (highest index)
  | "keep-active" // Currently active tab
  | "keep-grouped" // Tab already in a group
  | "keep-newest" // Higher tab ID (more recent)
  | "keep-oldest"; // Lower tab ID (older)

/**
 * A group of duplicate tabs
 */
export interface DuplicateGroup {
  matchKey: string; // The normalized key used for matching
  tabs: TabData[]; // All tabs in this group
  tabToKeep: number; // Index of tab to keep
  tabsToClose: number[]; // Indices of tabs to close
}

/**
 * Result of duplicate detection
 */
export interface DuplicateResult {
  duplicateGroups: DuplicateGroup[];
  totalDuplicates: number; // Total tabs to close
  tabsToClose: number[]; // Flat list of all indices to close
  tabDetails: Array<{ title: string; url: string }>;
}
```

### Updated Storage Schema

```typescript
export interface ExtensionStorage {
  selectedProvider: ProviderType;
  providerConfigs: {
    bedrock?: BedrockConfig;
    claude?: ClaudeConfig;
    openai?: OpenAIConfig;
  };
  lastDuplicateConfig?: DuplicateConfig; // NEW: Remember last used config
}
```

---

## Core Implementation

### 1. Duplicate Detector (`src/lib/duplicate-detector.ts`)

**New file:** ~350 lines

```typescript
import type {
  TabData,
  DuplicateConfig,
  DuplicateResult,
  DuplicateGroup,
  DuplicateMatchStrategy,
  DuplicateKeepStrategy,
} from "./types";

/**
 * Predefined presets for common use cases
 */
export const DUPLICATE_PRESETS: Record<string, DuplicateConfig> = {
  exact: {
    enabled: true,
    matchStrategy: "exact-url",
    keepStrategy: "keep-first",
    whitelistDomains: [],
    ignorePinned: true,
    ignoreGrouped: false,
    neverCloseActive: true,
    minDuplicates: 2,
    description: "Find tabs with identical URLs",
  },

  similar: {
    enabled: true,
    matchStrategy: "url-normalized",
    keepStrategy: "keep-first",
    whitelistDomains: [],
    ignorePinned: true,
    ignoreGrouped: false,
    neverCloseActive: true,
    minDuplicates: 2,
    description: "Find tabs with same URL (ignoring # and ? params)",
  },

  "same-domain": {
    enabled: true,
    matchStrategy: "domain-only",
    keepStrategy: "keep-first",
    whitelistDomains: [],
    ignorePinned: true,
    ignoreGrouped: false,
    neverCloseActive: true,
    minDuplicates: 3,
    description: "Find multiple tabs from the same website",
  },
};

/**
 * Detect duplicate tabs using deterministic rules
 * @param tabs - Array of tabs to analyze
 * @param config - Detection configuration
 * @returns Result with duplicate groups and tabs to close
 */
export function detectDuplicates(
  tabs: TabData[],
  config: DuplicateConfig,
): DuplicateResult {
  // 1. Normalize tabs based on match strategy
  const normalizedTabs = tabs.map((tab) => ({
    tab,
    matchKey: normalizeTab(tab, config.matchStrategy),
  }));

  // 2. Group by match key
  const groups = new Map<string, TabData[]>();

  for (const { tab, matchKey } of normalizedTabs) {
    // Skip whitelisted domains
    if (isWhitelisted(tab.url, config.whitelistDomains)) {
      continue;
    }

    if (!groups.has(matchKey)) {
      groups.set(matchKey, []);
    }
    groups.get(matchKey)!.push(tab);
  }

  // 3. Filter to only groups with duplicates (2+ tabs)
  const duplicateGroups: DuplicateGroup[] = [];

  for (const [matchKey, groupTabs] of groups.entries()) {
    if (groupTabs.length < config.minDuplicates) continue;

    // Select which tab to keep
    let tabToKeep = selectTabToKeep(groupTabs, config.keepStrategy);

    // Override: never close active tab if configured
    if (config.neverCloseActive) {
      const activeTab = groupTabs.find((t) => t.active);
      if (activeTab) {
        tabToKeep = activeTab.index;
      }
    }

    const tabsToClose = groupTabs
      .filter((t) => t.index !== tabToKeep)
      .map((t) => t.index);

    duplicateGroups.push({
      matchKey,
      tabs: groupTabs,
      tabToKeep,
      tabsToClose,
    });
  }

  // 4. Flatten results
  const allTabsToClose = duplicateGroups.flatMap((g) => g.tabsToClose);
  const tabDetails = tabs
    .filter((t) => allTabsToClose.includes(t.index))
    .map((t) => ({ title: t.title, url: t.url }));

  return {
    duplicateGroups,
    totalDuplicates: allTabsToClose.length,
    tabsToClose: allTabsToClose,
    tabDetails,
  };
}

/**
 * Normalize tab based on matching strategy
 */
function normalizeTab(tab: TabData, strategy: DuplicateMatchStrategy): string {
  try {
    const url = new URL(tab.url);

    switch (strategy) {
      case "exact-url":
        return tab.url;

      case "url-no-hash":
        return `${url.origin}${url.pathname}${url.search}`;

      case "url-no-query":
        return `${url.origin}${url.pathname}${url.hash}`;

      case "url-normalized":
        return `${url.origin}${url.pathname}`;

      case "domain-path":
        return `${url.hostname}${url.pathname}`;

      case "domain-only":
        return url.hostname;

      case "title-exact":
        return tab.title;

      case "title-normalized":
        return tab.title.toLowerCase().trim();

      case "url-and-title":
        return `${url.origin}${url.pathname}|${tab.title.toLowerCase().trim()}`;

      default:
        return tab.url;
    }
  } catch (error) {
    // Invalid URL, fallback to raw values
    console.warn(`Failed to parse URL: ${tab.url}`, error);
    return strategy.includes("title") ? tab.title : tab.url;
  }
}

/**
 * Select which tab to keep from duplicate group
 */
function selectTabToKeep(
  tabs: TabData[],
  strategy: DuplicateKeepStrategy,
): number {
  if (tabs.length === 0) return -1;

  switch (strategy) {
    case "keep-first":
      return tabs.reduce(
        (min, t) => (t.index < min ? t.index : min),
        tabs[0].index,
      );

    case "keep-last":
      return tabs.reduce(
        (max, t) => (t.index > max ? t.index : max),
        tabs[0].index,
      );

    case "keep-active":
      const activeTab = tabs.find((t) => t.active);
      return activeTab ? activeTab.index : tabs[0].index;

    case "keep-grouped":
      const groupedTab = tabs.find((t) => t.groupId !== -1);
      return groupedTab ? groupedTab.index : tabs[0].index;

    case "keep-newest":
      return tabs.reduce((max, t) => (t.id > max ? t.id : max), tabs[0].id);

    case "keep-oldest":
      return tabs.reduce((min, t) => (t.id < min ? t.id : min), tabs[0].id);

    default:
      return tabs[0].index;
  }
}

/**
 * Check if URL is in whitelist
 */
function isWhitelisted(url: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) return false;

  try {
    const hostname = new URL(url).hostname;
    return whitelist.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}
```

---

### 2. Background Script Integration (`src/background.ts`)

**Changes:** ~80 lines added

```typescript
// Add to message type union
interface FindDuplicatesMessage {
  action: "findDuplicates";
  config: DuplicateConfig;
}

type ExtensionMessage =
  | OrganizeTabsMessage
  | CleanTabsMessage
  | ConfirmCloseTabsMessage
  | FindDuplicatesMessage;

// Add message handler
browser.runtime.onMessage.addListener(
  (message: unknown, _sender: Runtime.MessageSender) => {
    // ... existing handlers ...

    if (typedMessage.action === "findDuplicates") {
      return findDuplicateTabs(typedMessage.config);
    }
  },
);

/**
 * Find duplicate tabs using deterministic rules
 */
async function findDuplicateTabs(config: DuplicateConfig): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  duplicateResult?: DuplicateResult;
}> {
  try {
    console.log("Finding duplicates with config:", config);

    // 1. Get tabs from current window
    const tabs = await browser.tabs.query({ currentWindow: true });
    let tabData = getOrganizableTabs(tabs);

    // 2. Apply additional filters
    if (config.ignorePinned) {
      tabData = tabData.filter((t) => !t.pinned);
    }

    if (config.ignoreGrouped) {
      tabData = tabData.filter((t) => t.groupId === -1);
    }

    if (tabData.length < 2) {
      return {
        success: false,
        error: "Need at least 2 tabs to find duplicates",
      };
    }

    console.log(`Analyzing ${tabData.length} tabs for duplicates`);

    // 3. Detect duplicates
    const result = detectDuplicates(tabData, config);

    // 4. Filter by minimum duplicates threshold
    result.duplicateGroups = result.duplicateGroups.filter(
      (g) => g.tabs.length >= config.minDuplicates,
    );

    // 5. Recalculate totals after filtering
    result.tabsToClose = result.duplicateGroups.flatMap((g) => g.tabsToClose);
    result.totalDuplicates = result.tabsToClose.length;
    result.tabDetails = tabData
      .filter((t) => result.tabsToClose.includes(t.index))
      .map((t) => ({ title: t.title, url: t.url }));

    if (result.totalDuplicates === 0) {
      return {
        success: true,
        message: "No duplicates found with these criteria",
      };
    }

    console.log(
      `Found ${result.totalDuplicates} duplicates in ${result.duplicateGroups.length} groups`,
    );

    return {
      success: true,
      message: `Found ${result.totalDuplicates} duplicate tabs`,
      duplicateResult: result,
    };
  } catch (error) {
    console.error("Failed to find duplicates:", error);
    return { success: false, error: String(error) };
  }
}
```

---

### 3. Popup UI (`src/popup/popup.html`)

**Changes:** ~100 lines added

Add new section after the clean tabs section:

```html
<!-- Duplicate Tab Detection -->
<div class="section">
  <h3>🔍 Find Duplicate Tabs</h3>

  <!-- Quick Presets -->
  <div class="preset-buttons">
    <button class="preset-btn" data-preset="exact" type="button">
      <span class="preset-icon">🎯</span>
      <span class="preset-label">Exact Duplicates</span>
      <span class="preset-hint">Same URL & title</span>
    </button>

    <button class="preset-btn" data-preset="similar" type="button">
      <span class="preset-icon">📋</span>
      <span class="preset-label">Similar Pages</span>
      <span class="preset-hint">Ignore # and ?params</span>
    </button>

    <button class="preset-btn" data-preset="same-domain" type="button">
      <span class="preset-icon">🌐</span>
      <span class="preset-label">Same Domain</span>
      <span class="preset-hint">Multiple tabs from same site</span>
    </button>
  </div>

  <!-- Advanced Options (Collapsible) -->
  <details class="advanced-options">
    <summary>⚙️ Advanced Options</summary>

    <div class="form-group">
      <label for="popup-match-strategy">Match by:</label>
      <select id="popup-match-strategy">
        <option value="exact-url">
          Exact URL (https://example.com/page?id=1#section)
        </option>
        <option value="url-no-hash">
          URL without # (https://example.com/page?id=1)
        </option>
        <option value="url-no-query">
          URL without ? (https://example.com/page#section)
        </option>
        <option value="url-normalized" selected>
          URL normalized (https://example.com/page)
        </option>
        <option value="domain-path">Domain + path (example.com/page)</option>
        <option value="domain-only">Domain only (example.com)</option>
        <option value="title-exact">Exact title match</option>
        <option value="title-normalized">
          Normalized title (case-insensitive)
        </option>
        <option value="url-and-title">URL + Title (both must match)</option>
      </select>

      <div class="match-example" id="match-example">
        <!-- Dynamically populated example -->
      </div>
    </div>

    <div class="form-group">
      <label for="popup-keep-strategy">Which tab to keep:</label>
      <select id="popup-keep-strategy">
        <option value="keep-first" selected>First (leftmost)</option>
        <option value="keep-last">Last (rightmost)</option>
        <option value="keep-active">Active tab</option>
        <option value="keep-grouped">Grouped tab</option>
        <option value="keep-newest">Newest (most recently opened)</option>
        <option value="keep-oldest">Oldest (first opened)</option>
      </select>
    </div>

    <div class="form-group">
      <label>
        <input type="checkbox" id="ignore-pinned" checked />
        Ignore pinned tabs
      </label>
    </div>

    <div class="form-group">
      <label>
        <input type="checkbox" id="ignore-grouped" />
        Ignore already grouped tabs
      </label>
    </div>

    <div class="form-group">
      <label>
        <input type="checkbox" id="never-close-active" checked />
        Never close active tab
      </label>
    </div>

    <div class="form-group">
      <label for="popup-whitelist">Protect domains (comma-separated):</label>
      <input
        type="text"
        id="popup-whitelist"
        placeholder="github.com, stackoverflow.com"
      />
      <small>Never close tabs from these domains</small>
    </div>

    <div class="form-group">
      <label for="min-duplicates">Minimum duplicates:</label>
      <input type="number" id="min-duplicates" min="2" max="10" value="2" />
      <small>Only show groups with at least this many tabs</small>
    </div>
  </details>

  <button id="find-duplicates-button" class="primary-button">
    🔍 Find Duplicates
  </button>

  <!-- Live Criteria Preview -->
  <div id="criteria-preview" class="criteria-preview" style="display: none;">
    <strong>Scanning for:</strong>
    <ul id="criteria-list"></ul>
  </div>
</div>
```

---

### 4. Popup Logic (`src/popup/popup.ts`)

**Changes:** ~400 lines added

```typescript
import { DUPLICATE_PRESETS } from "../lib/duplicate-detector";
import type { DuplicateConfig, DuplicateResult } from "../lib/types";

// State management
let currentDuplicateConfig: DuplicateConfig | null = null;

document.addEventListener("DOMContentLoaded", () => {
  // ... existing code ...

  // Load saved config
  loadDuplicateConfig();

  // Preset button handlers
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const preset = (e.currentTarget as HTMLElement).dataset.preset;
      if (preset && DUPLICATE_PRESETS[preset]) {
        applyPreset(preset);
      }
    });
  });

  // Advanced option change handlers
  const matchStrategySelect = document.getElementById(
    "popup-match-strategy",
  ) as HTMLSelectElement;
  const keepStrategySelect = document.getElementById(
    "popup-keep-strategy",
  ) as HTMLSelectElement;

  if (matchStrategySelect) {
    matchStrategySelect.addEventListener("change", () => {
      updateCriteriaPreview();
      updateMatchExample();
    });
  }

  if (keepStrategySelect) {
    keepStrategySelect.addEventListener("change", updateCriteriaPreview);
  }

  // Update preview on checkbox changes
  document
    .querySelectorAll("#ignore-pinned, #ignore-grouped, #never-close-active")
    .forEach((el) => {
      el.addEventListener("change", updateCriteriaPreview);
    });

  // Find duplicates button
  const findDuplicatesButton = document.getElementById(
    "find-duplicates-button",
  );
  if (findDuplicatesButton) {
    findDuplicatesButton.addEventListener("click", async () => {
      const config = buildConfigFromUI();
      await saveDuplicateConfig(config); // Remember for next time
      await findDuplicatesWithConfig(config);
    });
  }
});

/**
 * Apply a preset configuration
 */
function applyPreset(presetName: string): void {
  const preset = DUPLICATE_PRESETS[presetName];
  if (!preset) return;

  // Update UI elements
  const matchStrategySelect = document.getElementById(
    "popup-match-strategy",
  ) as HTMLSelectElement;
  const keepStrategySelect = document.getElementById(
    "popup-keep-strategy",
  ) as HTMLSelectElement;
  const ignorePinnedCheck = document.getElementById(
    "ignore-pinned",
  ) as HTMLInputElement;
  const ignoreGroupedCheck = document.getElementById(
    "ignore-grouped",
  ) as HTMLInputElement;
  const neverCloseActiveCheck = document.getElementById(
    "never-close-active",
  ) as HTMLInputElement;
  const minDuplicatesInput = document.getElementById(
    "min-duplicates",
  ) as HTMLInputElement;

  if (matchStrategySelect) matchStrategySelect.value = preset.matchStrategy;
  if (keepStrategySelect) keepStrategySelect.value = preset.keepStrategy;
  if (ignorePinnedCheck) ignorePinnedCheck.checked = preset.ignorePinned;
  if (ignoreGroupedCheck) ignoreGroupedCheck.checked = preset.ignoreGrouped;
  if (neverCloseActiveCheck)
    neverCloseActiveCheck.checked = preset.neverCloseActive;
  if (minDuplicatesInput)
    minDuplicatesInput.value = String(preset.minDuplicates);

  currentDuplicateConfig = preset;
  updateCriteriaPreview();
  updateMatchExample();
}

/**
 * Build config from current UI state
 */
function buildConfigFromUI(): DuplicateConfig {
  const matchStrategySelect = document.getElementById(
    "popup-match-strategy",
  ) as HTMLSelectElement;
  const keepStrategySelect = document.getElementById(
    "popup-keep-strategy",
  ) as HTMLSelectElement;
  const ignorePinnedCheck = document.getElementById(
    "ignore-pinned",
  ) as HTMLInputElement;
  const ignoreGroupedCheck = document.getElementById(
    "ignore-grouped",
  ) as HTMLInputElement;
  const neverCloseActiveCheck = document.getElementById(
    "never-close-active",
  ) as HTMLInputElement;
  const whitelistInput = document.getElementById(
    "popup-whitelist",
  ) as HTMLInputElement;
  const minDuplicatesInput = document.getElementById(
    "min-duplicates",
  ) as HTMLInputElement;

  return {
    enabled: true,
    matchStrategy: (matchStrategySelect?.value ||
      "url-normalized") as DuplicateMatchStrategy,
    keepStrategy: (keepStrategySelect?.value ||
      "keep-first") as DuplicateKeepStrategy,
    whitelistDomains:
      whitelistInput?.value
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0) || [],
    ignorePinned: ignorePinnedCheck?.checked ?? true,
    ignoreGrouped: ignoreGroupedCheck?.checked ?? false,
    neverCloseActive: neverCloseActiveCheck?.checked ?? true,
    minDuplicates: Number.parseInt(minDuplicatesInput?.value || "2", 10),
  };
}

/**
 * Update live preview of criteria
 */
function updateCriteriaPreview(): void {
  const config = buildConfigFromUI();
  const criteriaPreview = document.getElementById("criteria-preview");
  const criteriaList = document.getElementById("criteria-list");

  if (!criteriaPreview || !criteriaList) return;

  const criteria: string[] = [];

  criteria.push(`Match: ${getMatchStrategyLabel(config.matchStrategy)}`);
  criteria.push(`Keep: ${getKeepStrategyLabel(config.keepStrategy)}`);

  if (config.ignorePinned) criteria.push("Ignore pinned tabs");
  if (config.ignoreGrouped) criteria.push("Ignore grouped tabs");
  if (config.neverCloseActive) criteria.push("Never close active tab");
  if (config.whitelistDomains.length > 0) {
    criteria.push(`Protected: ${config.whitelistDomains.join(", ")}`);
  }
  if (config.minDuplicates > 2) {
    criteria.push(`Minimum ${config.minDuplicates} duplicates per group`);
  }

  criteriaList.innerHTML = criteria.map((c) => `<li>${c}</li>`).join("");
  criteriaPreview.style.display = "block";
}

/**
 * Show example of what will match
 */
function updateMatchExample(): void {
  const matchExampleDiv = document.getElementById("match-example");
  if (!matchExampleDiv) return;

  const config = buildConfigFromUI();
  const exampleUrl = "https://example.com/page?id=123#section";

  let matchKey: string;
  try {
    const url = new URL(exampleUrl);
    matchKey = normalizeUrlForPreview(url, config.matchStrategy);
  } catch {
    matchKey = "Invalid URL";
  }

  matchExampleDiv.innerHTML = `
    <strong>Example:</strong><br>
    <code class="example-url">${exampleUrl}</code><br>
    <strong>Will match as:</strong><br>
    <code class="match-key">${matchKey}</code>
  `;
}

/**
 * Normalize URL for preview (client-side version)
 */
function normalizeUrlForPreview(
  url: URL,
  strategy: DuplicateMatchStrategy,
): string {
  switch (strategy) {
    case "exact-url":
      return url.href;
    case "url-no-hash":
      return `${url.origin}${url.pathname}${url.search}`;
    case "url-no-query":
      return `${url.origin}${url.pathname}${url.hash}`;
    case "url-normalized":
      return `${url.origin}${url.pathname}`;
    case "domain-path":
      return `${url.hostname}${url.pathname}`;
    case "domain-only":
      return url.hostname;
    default:
      return url.href;
  }
}

/**
 * Find duplicates with specified config
 */
async function findDuplicatesWithConfig(
  config: DuplicateConfig,
): Promise<void> {
  const statusDiv = document.getElementById("status");
  const previewSection = document.getElementById("preview-section");

  updateStatus(
    statusDiv,
    "Scanning for duplicates...",
    "status-message loading",
  );
  setVisibility(previewSection, false);

  try {
    const response = (await browser.runtime.sendMessage({
      action: "findDuplicates",
      config,
    })) as {
      success: boolean;
      message?: string;
      error?: string;
      duplicateResult?: DuplicateResult;
    };

    if (response.success && response.duplicateResult) {
      if (response.duplicateResult.totalDuplicates === 0) {
        updateStatus(
          statusDiv,
          "✓ No duplicates found with these criteria",
          "status-message success",
        );
        return;
      }

      // Convert to CleanResult format for existing preview UI
      currentCleanResult = {
        tabsToClose: response.duplicateResult.tabsToClose,
        reasoning: buildReasoningText(config, response.duplicateResult),
        tabDetails: response.duplicateResult.tabDetails,
      };

      // Show enhanced preview with grouping
      showDuplicatePreview(response.duplicateResult, config);

      updateStatus(
        statusDiv,
        `Found ${response.duplicateResult.totalDuplicates} duplicates in ${response.duplicateResult.duplicateGroups.length} groups`,
        "status-message success",
      );
    } else {
      updateStatus(
        statusDiv,
        `${response.error || response.message}`,
        response.success ? "status-message" : "status-message error",
      );
    }
  } catch (error) {
    updateStatus(statusDiv, `✗ Error: ${error}`, "status-message error");
    console.error("Failed to find duplicates:", error);
  }
}

/**
 * Build reasoning text from config
 */
function buildReasoningText(
  config: DuplicateConfig,
  result: DuplicateResult,
): string {
  const parts: string[] = [];

  parts.push(
    `Found using "${getMatchStrategyLabel(config.matchStrategy)}" matching`,
  );
  parts.push(
    `Will keep "${getKeepStrategyLabel(config.keepStrategy)}" from each group`,
  );

  if (config.neverCloseActive) {
    parts.push("Active tab protected");
  }

  return parts.join(". ") + ".";
}

/**
 * Show duplicate preview with grouped visualization
 */
function showDuplicatePreview(
  result: DuplicateResult,
  config: DuplicateConfig,
): void {
  const previewSection = document.getElementById("preview-section");
  const previewList = document.getElementById("preview-list");
  const previewReasoning = document.getElementById("preview-reasoning");

  if (!previewSection || !previewList || !previewReasoning) return;

  previewList.innerHTML = "";

  // Show each duplicate group
  for (const group of result.duplicateGroups) {
    const groupDiv = document.createElement("div");
    groupDiv.className = "duplicate-group";

    const groupHeader = document.createElement("div");
    groupHeader.className = "duplicate-group-header";
    groupHeader.innerHTML = `
      <strong>Duplicate Group:</strong> <code>${escapeHtml(group.matchKey)}</code><br>
      <small>${group.tabs.length} tabs • ${group.tabsToClose.length} will be closed</small>
    `;
    groupDiv.appendChild(groupHeader);

    // Show each tab in group
    for (const tab of group.tabs) {
      const item = document.createElement("div");
      const willKeep = tab.index === group.tabToKeep;
      item.className = `tab-preview-item ${willKeep ? "will-keep" : "will-close"}`;

      item.innerHTML = `
        <div class="tab-status">${willKeep ? "✓ Keep" : "✗ Close"}</div>
        <div class="title">${escapeHtml(tab.title)}</div>
        <div class="url">${escapeHtml(tab.url)}</div>
      `;
      groupDiv.appendChild(item);
    }

    previewList.appendChild(groupDiv);
  }

  previewReasoning.textContent = buildReasoningText(config, result);
  setVisibility(previewSection, true);
}

// Helper functions
function getMatchStrategyLabel(strategy: DuplicateMatchStrategy): string {
  const labels: Record<DuplicateMatchStrategy, string> = {
    "exact-url": "Exact URL",
    "url-no-hash": "URL without #",
    "url-no-query": "URL without ?",
    "url-normalized": "URL normalized",
    "domain-path": "Domain + path",
    "domain-only": "Domain only",
    "title-exact": "Exact title",
    "title-normalized": "Normalized title",
    "url-and-title": "URL + Title",
  };
  return labels[strategy] || strategy;
}

function getKeepStrategyLabel(strategy: DuplicateKeepStrategy): string {
  const labels: Record<DuplicateKeepStrategy, string> = {
    "keep-first": "First (leftmost)",
    "keep-last": "Last (rightmost)",
    "keep-active": "Active tab",
    "keep-grouped": "Grouped tab",
    "keep-newest": "Newest tab",
    "keep-oldest": "Oldest tab",
  };
  return labels[strategy] || strategy;
}

async function loadDuplicateConfig(): Promise<void> {
  try {
    const storage = await browser.storage.local.get("lastDuplicateConfig");
    if (storage.lastDuplicateConfig) {
      currentDuplicateConfig = storage.lastDuplicateConfig;
      applyConfigToUI(currentDuplicateConfig);
    }
  } catch (error) {
    console.error("Failed to load duplicate config:", error);
  }
}

async function saveDuplicateConfig(config: DuplicateConfig): Promise<void> {
  try {
    await browser.storage.local.set({ lastDuplicateConfig: config });
  } catch (error) {
    console.error("Failed to save duplicate config:", error);
  }
}
```

---

### 5. Popup Styling (`src/popup/popup.css`)

**Changes:** ~150 lines added

```css
/* Preset Buttons */
.preset-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border: 2px solid var(--border-color, #ddd);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.preset-btn:hover {
  background: var(--bg-hover, #e8e8e8);
  border-color: var(--primary-color, #0066cc);
}

.preset-icon {
  font-size: 1.5em;
}

.preset-label {
  font-weight: 600;
  flex-grow: 1;
}

.preset-hint {
  font-size: 0.85em;
  color: var(--text-secondary, #666);
  display: block;
  margin-left: 34px;
}

/* Advanced Options */
.advanced-options {
  margin: 16px 0;
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
}

.advanced-options summary {
  cursor: pointer;
  font-weight: 600;
  user-select: none;
}

.advanced-options summary:hover {
  color: var(--primary-color, #0066cc);
}

.advanced-options[open] summary {
  margin-bottom: 16px;
}

.advanced-options .form-group {
  margin-bottom: 12px;
}

.advanced-options label {
  display: block;
  font-size: 0.9em;
  margin-bottom: 4px;
  font-weight: 500;
}

.advanced-options select,
.advanced-options input[type="text"],
.advanced-options input[type="number"] {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 0.9em;
}

.advanced-options small {
  display: block;
  font-size: 0.8em;
  color: var(--text-secondary, #666);
  margin-top: 4px;
}

/* Match Example */
.match-example {
  margin-top: 8px;
  padding: 8px;
  background: var(--bg-tertiary, #fff);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 0.85em;
}

.example-url {
  color: var(--text-secondary, #666);
  word-break: break-all;
}

.match-key {
  color: var(--primary-color, #0066cc);
  font-weight: 600;
  word-break: break-all;
}

/* Criteria Preview */
.criteria-preview {
  margin-top: 12px;
  padding: 12px;
  background: var(--info-bg, #e3f2fd);
  border-left: 3px solid var(--primary-color, #0066cc);
  border-radius: 4px;
}

.criteria-preview ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.criteria-preview li {
  margin: 4px 0;
  font-size: 0.9em;
}

/* Duplicate Group Visualization */
.duplicate-group {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  border: 1px solid var(--border-color, #ddd);
}

.duplicate-group-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color, #ddd);
}

.duplicate-group-header strong {
  font-weight: 600;
}

.duplicate-group-header small {
  color: var(--text-secondary, #666);
}

.duplicate-group-header code {
  background: var(--bg-tertiary, #fff);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

/* Tab Status Indicators */
.tab-preview-item {
  position: relative;
  padding-left: 80px;
  margin-bottom: 8px;
}

.tab-status {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85em;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.will-keep .tab-status {
  background: var(--success-bg, #d4edda);
  color: var(--success-color, #155724);
}

.will-close .tab-status {
  background: var(--error-bg, #f8d7da);
  color: var(--error-color, #721c24);
}

.will-keep {
  opacity: 1;
}

.will-close {
  opacity: 0.75;
}
```

---

## Edge Cases & Error Handling

### 1. URL Parsing Failures

**Problem:** Invalid URLs (malformed, special protocols)
**Solution:** Wrap URL parsing in try-catch, fallback to raw string matching

```typescript
try {
  const url = new URL(tab.url);
  // ... parse URL
} catch {
  console.warn(`Invalid URL: ${tab.url}`);
  return strategy.includes("title") ? tab.title : tab.url;
}
```

### 2. Active Tab is Duplicate

**Problem:** User might accidentally close their current tab
**Solution:** `neverCloseActive` flag (default: true) overrides keep strategy

```typescript
if (config.neverCloseActive) {
  const activeTab = groupTabs.find((t) => t.active);
  if (activeTab) {
    tabToKeep = activeTab.index; // Override keep strategy
  }
}
```

### 3. All Tabs Match

**Problem:** Strategy too broad (e.g., domain-only on single-site browsing)
**Solution:** Always keep at least one tab per group

```typescript
const tabsToClose = groupTabs
  .filter((t) => t.index !== tabToKeep) // Always exclude tabToKeep
  .map((t) => t.index);
```

### 4. No Tabs After Filtering

**Problem:** All tabs are pinned/grouped and filters exclude them
**Solution:** Return early with clear message

```typescript
if (tabData.length < 2) {
  return {
    success: false,
    error: "Need at least 2 tabs to find duplicates",
  };
}
```

### 5. Whitelist Matching

**Problem:** Subdomain matching (should `github.com` match `gist.github.com`?)
**Solution:** Use endsWith check for domain hierarchy

```typescript
return whitelist.some(
  (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
);
```

### 6. Empty Duplicate Groups After Threshold Filter

**Problem:** Found duplicates but all below minDuplicates threshold
**Solution:** Filter groups, recalculate totals, return "no duplicates" message

```typescript
result.duplicateGroups = result.duplicateGroups.filter(
  (g) => g.tabs.length >= config.minDuplicates,
);

if (result.totalDuplicates === 0) {
  return { success: true, message: "No duplicates found" };
}
```

---

## Testing Plan

### Unit Tests (Future)

Test `duplicate-detector.ts` functions:

1. **normalizeTab**
   - Test each match strategy with various URLs
   - Test invalid URLs (should not crash)
   - Test title-based strategies with various titles

2. **selectTabToKeep**
   - Test each keep strategy
   - Test with single tab (edge case)
   - Test with active tab override

3. **isWhitelisted**
   - Test exact domain match
   - Test subdomain matching
   - Test empty whitelist
   - Test invalid URLs

4. **detectDuplicates**
   - Test no duplicates found
   - Test single duplicate group
   - Test multiple duplicate groups
   - Test with various configs

### Manual Testing Scenarios

**Scenario 1: Exact Duplicates**

- Open 3 identical tabs: `https://example.com/page`
- Use "Exact Duplicates" preset
- Expected: 2 tabs closed, 1 kept (first)

**Scenario 2: Hash Variations**

- Open tabs: `https://example.com/page#section1`, `#section2`, `#section3`
- Use "Similar Pages" preset (url-normalized)
- Expected: 2 tabs closed

**Scenario 3: Query Param Variations**

- Open tabs: `https://example.com/page?id=1`, `?id=2`, `?id=3`
- Use "Similar Pages" preset
- Expected: 2 tabs closed

**Scenario 4: Domain Matching**

- Open 5 GitHub tabs (different repos)
- Use "Same Domain" preset
- Expected: 4 tabs closed (minDuplicates=3 so needs at least 3 to trigger)

**Scenario 5: Active Tab Protection**

- Open 3 identical tabs, make middle one active
- Use "Exact Duplicates" with "never close active" enabled
- Expected: Middle tab kept, 2 others closed

**Scenario 6: Whitelisted Domain**

- Add `github.com` to whitelist
- Open duplicate GitHub tabs
- Expected: No duplicates found

**Scenario 7: Pinned Tab Handling**

- Pin one tab from duplicate set
- Enable "Ignore pinned tabs"
- Expected: Pinned tab not included in duplicates

**Scenario 8: No Duplicates**

- Open 10 unique tabs
- Use any preset
- Expected: Message "No duplicates found"

**Scenario 9: Large Tab Count**

- Open 100+ tabs with ~50% duplicates
- Use "Similar Pages" preset
- Expected: ~50 tabs closed, reasonable performance (<2s)

**Scenario 10: Mixed Scenarios**

- Open tabs: 2 GitHub, 3 MDN, 2 Stack Overflow (all different pages)
- Use "Domain Only" preset with minDuplicates=2
- Expected: 3 groups found (keep 1 from each domain)

---

## Performance Considerations

### Time Complexity

- **Tab normalization:** O(n) where n = tab count
- **Grouping:** O(n) with Map lookups
- **Group filtering:** O(g) where g = group count
- **Overall:** O(n + g) = O(n) since g ≤ n

### Space Complexity

- **Normalized tabs array:** O(n)
- **Groups map:** O(n) worst case (no duplicates)
- **Result arrays:** O(n)
- **Overall:** O(n)

### Optimizations

1. **Use Map for O(1) lookups** instead of array.find()
2. **Avoid regex** for URL parsing (use native URL API)
3. **Batch operations** (single browser.tabs.remove call)
4. **Early returns** for edge cases (< 2 tabs, no duplicates)

### Expected Performance

- **10 tabs:** <10ms
- **50 tabs:** <50ms
- **100 tabs:** <100ms
- **500 tabs:** <500ms (linear scaling)

---

## Integration Points

### Reuses Existing Infrastructure

1. **Preview UI** - Same preview section from clean tabs
2. **Confirmation Flow** - Reuses `confirmCloseTabs` message handler
3. **Tab Utilities** - Uses existing `getOrganizableTabs()` helper
4. **Storage** - Leverages `browser.storage.local` (encrypted)
5. **Type System** - Extends existing `TabData` and storage types

### New Dependencies

**None!** Uses only existing dependencies:

- `webextension-polyfill` (already used)
- Native URL API (browser built-in)
- Native Map/Set (ES6 features)

---

## Migration & Rollout

### Phase 1: Core Implementation (v0.2.0)

- [ ] Add types to `src/lib/types.ts`
- [ ] Implement `src/lib/duplicate-detector.ts`
- [ ] Add background message handler
- [ ] Basic popup UI (presets only)
- [ ] Manual testing with 10-50 tabs

### Phase 2: Advanced UI (v0.2.1)

- [ ] Add advanced options (collapsible)
- [ ] Add live criteria preview
- [ ] Add match example visualization
- [ ] Save/load last used config

### Phase 3: Enhanced Preview (v0.2.2)

- [ ] Grouped duplicate visualization
- [ ] Keep/close indicators
- [ ] Better reasoning text
- [ ] Performance testing with 100+ tabs

### Phase 4: Polish (v0.3.0)

- [ ] Options page integration (save presets)
- [ ] Keyboard shortcuts
- [ ] Analytics (count usage, popular presets)
- [ ] Documentation update

---

## User Documentation

### Quick Start Guide

**Finding Exact Duplicates**

1. Click extension icon
2. Scroll to "Find Duplicate Tabs"
3. Click "🎯 Exact Duplicates"
4. Review preview, click "Confirm Close"

**Custom Matching**

1. Expand "⚙️ Advanced Options"
2. Choose match strategy (e.g., "URL without #")
3. Choose keep strategy (e.g., "Keep active tab")
4. Click "🔍 Find Duplicates"

**Protecting Domains**

1. Expand "⚙️ Advanced Options"
2. Enter domains: `github.com, stackoverflow.com`
3. Tabs from these domains won't be closed

### Match Strategy Guide

| Strategy         | Example URL                    | Matches As                     | Use Case              |
| ---------------- | ------------------------------ | ------------------------------ | --------------------- |
| Exact URL        | `https://ex.com/page?id=1#top` | `https://ex.com/page?id=1#top` | Identical tabs only   |
| URL without #    | `https://ex.com/page?id=1#top` | `https://ex.com/page?id=1`     | Ignore anchors        |
| URL without ?    | `https://ex.com/page?id=1#top` | `https://ex.com/page#top`      | Ignore query params   |
| URL normalized   | `https://ex.com/page?id=1#top` | `https://ex.com/page`          | Most common (default) |
| Domain + path    | `https://ex.com/page?id=1#top` | `ex.com/page`                  | Protocol-agnostic     |
| Domain only      | `https://ex.com/page?id=1#top` | `ex.com`                       | All tabs from site    |
| Exact title      | "My Page Title"                | "My Page Title"                | Title-based           |
| Normalized title | "My Page Title"                | "my page title"                | Case-insensitive      |
| URL + Title      | Both values                    | Both normalized                | Strictest matching    |

---

## Future Enhancements

### Phase 5: Advanced Features (v0.4.0+)

- [ ] **Fuzzy matching** - Levenshtein distance for titles
- [ ] **Cross-window detection** - Find duplicates across all windows
- [ ] **Scheduled scanning** - Auto-detect duplicates on interval
- [ ] **Undo support** - Restore closed tabs (requires storage)
- [ ] **Smart presets** - Learn from user patterns
- [ ] **Export whitelist** - Share domain protection lists
- [ ] **Regex whitelist** - Advanced domain matching
- [ ] **Tab age threshold** - Only close tabs older than X minutes
- [ ] **URL pattern matching** - Custom regex for URLs
- [ ] **Bulk actions** - Group/bookmark instead of close

---

## Files Changed Summary

| File                            | Lines Added | Lines Modified | Description               |
| ------------------------------- | ----------- | -------------- | ------------------------- |
| `src/lib/types.ts`              | ~80         | 0              | New duplicate types       |
| `src/lib/duplicate-detector.ts` | ~350        | 0              | **New file** - Core logic |
| `src/background.ts`             | ~80         | ~10            | Message handler           |
| `src/popup/popup.html`          | ~100        | 0              | UI elements               |
| `src/popup/popup.ts`            | ~400        | 0              | Event handlers            |
| `src/popup/popup.css`           | ~150        | 0              | Styling                   |
| **Total**                       | **~1,160**  | **~10**        | **1 new file**            |

---

## Risks & Mitigation

### Risk 1: Performance with 500+ Tabs

**Impact:** Slow detection, UI freeze
**Mitigation:**

- Implement debouncing on UI updates
- Show progress indicator for large tab counts
- Consider web worker for computation (future)

### Risk 2: User Closes Wrong Tabs

**Impact:** Data loss, user frustration
**Mitigation:**

- Clear preview with keep/close indicators
- Require explicit confirmation
- Never close active tab by default
- Consider undo feature (phase 5)

### Risk 3: Overly Aggressive Matching

**Impact:** Closing tabs user wants to keep
**Mitigation:**

- Safe defaults (url-normalized, keep-first)
- Clear strategy explanations
- Live example of what will match
- Whitelist protection

### Risk 4: Config Complexity

**Impact:** User confusion, feature abandonment
**Mitigation:**

- Simple presets front and center
- Advanced options hidden by default
- Inline help text and examples
- Remember last used config

---

## Success Metrics

### MVP Success Criteria

- [ ] Can detect exact duplicates (100% accuracy)
- [ ] Can detect normalized duplicates (95%+ accuracy)
- [ ] Never closes active tab (unless explicitly configured)
- [ ] Performance <100ms for 50 tabs
- [ ] Zero crashes during testing
- [ ] User can understand presets without reading docs

### Post-Launch Metrics (Future)

- Average duplicates found per scan
- Most popular preset
- Most popular match strategy
- Average tabs closed per session
- User retention (daily active users)

---

## Open Questions

1. **Should we add a "dry run" mode?**
   - Preview without committing to any action
   - Current design already does this (always preview first)

2. **Should domain whitelist support wildcards?**
   - e.g., `*.google.com` to match all Google domains
   - Can add in phase 5

3. **Should we track closed tabs for undo?**
   - Requires persistent storage of tab data
   - Privacy implications (storing URLs/titles)
   - Defer to phase 5

4. **Should we support saved presets?**
   - User-defined presets in addition to defaults
   - Can add in phase 4 (options page integration)

5. **Should we integrate with organize/clean workflows?**
   - e.g., "Find duplicates, then organize remaining tabs"
   - Compound workflows can be phase 5

---

## References

- [Firefox Tabs API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs)
- [URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL)
- [browser.storage.local](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local)
- [Levenshtein Distance Algorithm](https://en.wikipedia.org/wiki/Levenshtein_distance) (for future fuzzy matching)

---

## Appendix: Example Configurations

### Preset 1: Development Workflow

```json
{
  "matchStrategy": "url-normalized",
  "keepStrategy": "keep-first",
  "ignorePinned": true,
  "neverCloseActive": true,
  "whitelistDomains": ["localhost", "127.0.0.1"],
  "minDuplicates": 2
}
```

### Preset 2: Research Cleanup

```json
{
  "matchStrategy": "domain-only",
  "keepStrategy": "keep-active",
  "ignorePinned": true,
  "neverCloseActive": true,
  "whitelistDomains": ["github.com"],
  "minDuplicates": 3
}
```

### Preset 3: Aggressive Deduplication

```json
{
  "matchStrategy": "title-normalized",
  "keepStrategy": "keep-newest",
  "ignorePinned": false,
  "neverCloseActive": true,
  "whitelistDomains": [],
  "minDuplicates": 2
}
```

---

**End of Implementation Plan**
