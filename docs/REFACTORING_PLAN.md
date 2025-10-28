# Codebase Refactoring Plan

**Date:** 2025-10-27
**Status:** In Progress
**Goal:** Eliminate 50+ code duplications and reduce codebase by 200-300 lines

---

## Problem Analysis

After comprehensive analysis, identified **53+ instances** of code duplication across 7 files:

| Category                 | Count | Severity | File(s)                           |
| ------------------------ | ----- | -------- | --------------------------------- |
| Tab filtering/mapping    | 3     | CRITICAL | background.ts                     |
| Provider config loading  | 2     | HIGH     | background.ts                     |
| Status message updates   | 21    | HIGH     | popup.ts, options.ts              |
| generateText() calls     | 5     | MEDIUM   | Claude, OpenAI, Bedrock providers |
| Error handling           | 3+    | MEDIUM   | background.ts, popup.ts           |
| Response success checks  | 3     | MEDIUM   | popup.ts                          |
| Tab ID mapping           | 2     | MEDIUM   | background.ts                     |
| Temperature/retry config | 6     | LOW      | All providers                     |
| Status clearing timeout  | 2+    | LOW      | options.ts, popup.ts              |
| Form field value setting | 2     | LOW      | options.ts                        |
| Display toggling         | 4     | LOW      | popup.ts                          |

**Total:** 100-150 lines of boilerplate code that can be consolidated

---

## Refactoring Strategy

### Phase 1: Documentation & Planning ✓

- [x] Write this plan to `docs/REFACTORING_PLAN.md`
- [x] Add TODO item for future bearer token removal (deferred)

### Phase 2: Utility Functions & Shared Logic

#### 2.1 Create `src/lib/utils.ts`

**Purpose:** Browser tab utilities and configuration constants

```typescript
// Tab filtering and transformation (consolidates 3 instances)
export function getOrganizableTabs(tabs: Tabs.Tab[]): TabData[];

// Tab ID extraction (consolidates 2 instances)
export function getTabIds(tabs: TabData[], indices: number[]): number[];

// Configuration constants (used by all providers)
export const LLM_CONFIG = {
  TEMPERATURE: 0.3,
  MAX_RETRIES: 3,
  CATEGORIZE_MAX_TOKENS: 4096,
  CLEAN_MAX_TOKENS: 2048,
};
```

**Impact:** Eliminates 5 duplications in background.ts

#### 2.2 Create `src/lib/storage-utils.ts`

**Purpose:** Type-safe browser storage access

```typescript
// Provider configuration loading (consolidates 2 instances)
export async function loadProviderConfig(): Promise<{
  providerType: ProviderType;
  providerConfig: ProviderConfig;
}>;
```

**Impact:** Eliminates 2 duplications in background.ts

#### 2.3 Create `src/popup/ui-utils.ts`

**Purpose:** UI interaction helpers

```typescript
// Status message updates (consolidates 21 instances)
export function updateStatus(
  element: HTMLElement | null,
  message: string,
  className?: string,
): void;

// Display visibility toggle (consolidates 4 instances)
export function setVisibility(
  element: HTMLElement | null,
  visible: boolean,
): void;

// Auto-clear status messages (consolidates 2+ instances)
export function clearStatusAfter(
  element: HTMLElement | null,
  delayMs?: number,
): void;

// Response handling (consolidates 3 instances)
export function handleResponse(
  response: { success: boolean; message?: string; error?: string },
  statusDiv: HTMLElement | null,
  successPrefix?: string,
  errorPrefix?: string,
): void;
```

**Impact:** Eliminates 30 duplications in popup.ts and options.ts

#### 2.4 Create `src/options/form-utils.ts`

**Purpose:** Form field manipulation helpers

```typescript
// Input value setting (consolidates 2 instances)
export function setInputValue(
  input: HTMLInputElement | HTMLSelectElement,
  value: string | number | undefined,
  defaultValue?: string | number,
): void;
```

**Impact:** Eliminates 2 duplications in options.ts

### Phase 3: Provider Consolidation

#### 3.1 Create `src/lib/providers/simple-ai-sdk-provider.ts`

**Purpose:** Abstract base class for providers using Vercel AI SDK

```typescript
// Base class with shared implementation
export abstract class SimpleAISDKProvider extends LLMProvider {
  // Template method - subclasses must implement
  protected abstract getModel(): LanguageModelV1;

  // Shared categorize implementation (consolidates 2 instances)
  async categorize(
    tabs: TabData[],
    userPrompt?: string,
  ): Promise<GroupingResult>;

  // Shared cleanTabs implementation (consolidates 2 instances)
  async cleanTabs(tabs: TabData[], userPrompt: string): Promise<CleanResult>;

  // Shared testConnection implementation (consolidates 2 instances)
  async testConnection(): Promise<boolean>;

  // Helper method (consolidates 5 generateText calls)
  protected async callLLM(
    systemPrompt: string,
    userPrompt: string,
    maxTokens?: number,
  ): Promise<string>;
}
```

**Impact:** Eliminates duplicate implementations in Claude and OpenAI providers

#### 3.2 Refactor `src/lib/providers/claude-provider.ts`

**Before:** ~91 lines
**After:** ~25 lines

Changes:

- Extend `SimpleAISDKProvider` instead of `LLMProvider`
- Remove `categorize()`, `cleanTabs()`, `testConnection()` (inherited)
- Keep only provider-specific `getModel()` and `getConfigSchema()`

#### 3.3 Refactor `src/lib/providers/openai-provider.ts`

**Before:** ~87 lines
**After:** ~25 lines

Changes:

- Extend `SimpleAISDKProvider` instead of `LLMProvider`
- Remove `categorize()`, `cleanTabs()`, `testConnection()` (inherited)
- Keep only provider-specific `getModel()` and `getConfigSchema()`

#### 3.4 Keep `src/lib/providers/bedrock-provider.ts` As-Is

**Note:** Bearer token authentication preserved for backward compatibility
**Future:** Marked for removal in TODO.md (user will migrate to AWS temporary credentials)

### Phase 4: Refactor Main Files

#### 4.1 Update `src/background.ts`

**Before:** ~284 lines
**After:** ~180 lines

Changes:

- Import and use `getOrganizableTabs()` (3 replacements)
- Import and use `loadProviderConfig()` (2 replacements)
- Import and use `getTabIds()` (2 replacements)
- Simplify error handling patterns

**Impact:** ~100 line reduction

#### 4.2 Update `src/popup/popup.ts`

**Before:** ~237 lines
**After:** ~150 lines

Changes:

- Replace 21 status updates with `updateStatus()` calls
- Replace 4 display toggles with `setVisibility()` calls
- Replace 3 response handlers with `handleResponse()` calls
- Replace 2 timeout clears with `clearStatusAfter()` calls

**Impact:** ~87 line reduction

#### 4.3 Update `src/options/options.ts`

**Before:** ~239 lines
**After:** ~180 lines

Changes:

- Replace status updates with `updateStatus()` utility
- Replace form field value setting with `setInputValue()` utility
- Replace timeout clears with `clearStatusAfter()` utility

**Impact:** ~59 line reduction

### Phase 5: Type & Config Cleanup

#### 5.1 Update `src/lib/types.ts`

- Remove unused `preferences` field from `ExtensionStorage` interface
- Remove unused `maxGroups` and `autoCollapse` properties

#### 5.2 Update `src/lib/llm-provider.ts`

- Add protected constants for temperature, retries, max tokens
- Change `extractJSON()` from private to protected (needed by subclasses)

#### 5.3 Update `build.ts`

- Add TypeScript-based asset copying to replace bash one-liner
- Use proper `fs/promises` for better error handling

#### 5.4 Update `package.json`

- Simplify `build:assets` script (logic moved to build.ts)

#### 5.5 Update `src/options/options.html`

- Remove hardcoded config fields (lines 32-44)
- Start with empty `<div id="provider-config"></div>`

---

## Testing Strategy

After each phase:

1. ✓ Run `bun run type-check` (must pass)
2. ✓ Run `bun run lint` (must pass)
3. ✓ Run `bun run build` (must succeed)
4. ✓ Test each provider (Claude, Bedrock, OpenAI)
5. ✓ Test tab organization feature
6. ✓ Test tab cleaning feature
7. ✓ Test options page configuration

---

## Expected Outcomes

### Quantitative

- **Lines of code reduced:** 200-300 lines
- **Code duplications eliminated:** 53+ instances → 0
- **Files created:** 5 new utility modules
- **Providers simplified:** Claude & OpenAI reduced by ~65 lines each

### Qualitative

- **DRY principle applied:** Single source of truth for common operations
- **Easier maintenance:** Changes in one place propagate everywhere
- **Better testability:** Utilities can be unit tested independently
- **Easier to extend:** Adding new AI SDK providers now trivial
- **No functionality lost:** All features continue to work as before

---

## Risk Mitigation

- Work incrementally, test after each file change
- Keep git commits small and descriptive
- All changes are refactoring - no behavior changes intended
- Can revert individual commits if issues arise
- Bearer token support preserved (low risk)

---

## Future Considerations (Post-Refactoring)

1. **Remove bearer token support from BedrockProvider** (TODO.md)
   - Simplify to only use AWS SDK with temporary credentials
   - Document migration path for existing users
   - Estimated ~100 additional line reduction

2. **Unit testing infrastructure**
   - Add Bun test runner setup
   - Test utility functions in isolation
   - Mock browser APIs for provider testing

3. **Shared CSS/styling utilities**
   - Extract common styles from popup.css and options.css
   - Create shared component CSS

---

## Implementation Checklist

### Phase 1: Documentation ✓

- [x] Write this plan
- [x] Add TODO item for bearer token removal

### Phase 2: Utilities

- [ ] Create src/lib/utils.ts
- [ ] Create src/lib/storage-utils.ts
- [ ] Create src/popup/ui-utils.ts
- [ ] Create src/options/form-utils.ts

### Phase 3: Providers

- [ ] Create SimpleAISDKProvider base class
- [ ] Refactor claude-provider.ts
- [ ] Refactor openai-provider.ts
- [ ] Test all three providers

### Phase 4: Main Files

- [ ] Refactor background.ts
- [ ] Refactor popup.ts
- [ ] Refactor options.ts

### Phase 5: Cleanup

- [ ] Update types.ts
- [ ] Update llm-provider.ts
- [ ] Update build.ts
- [ ] Update package.json
- [ ] Clean up options.html

### Phase 6: Verification

- [ ] Type-check passes
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Manual testing complete
- [ ] Update CLAUDE.md and DESIGN.md if needed
