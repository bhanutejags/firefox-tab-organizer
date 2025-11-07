/**
 * Type definitions for Firefox Tab Groups Organizer
 */

// Browser tab with metadata
export interface TabData {
  id: number;
  index: number;
  title: string;
  url: string;
  favIconUrl?: string;
  active: boolean;
  pinned: boolean;
  windowId: number;
  groupId: number;
}

// Tab group colors supported by Firefox
export type TabGroupColor =
  | "blue"
  | "red"
  | "green"
  | "yellow"
  | "purple"
  | "pink"
  | "orange"
  | "cyan";

// LLM's proposed grouping
export interface TabGroup {
  name: string;
  color: TabGroupColor;
  tabIndices: number[];
  reasoning?: string;
}

export interface GroupingResult {
  groups: TabGroup[];
  ungrouped: number[];
}

// LLM's tab cleaning result
export interface CleanResult {
  tabsToClose: number[]; // Indices of tabs to close
  reasoning: string; // Explanation of why these tabs were selected
  tabDetails: Array<{ title: string; url: string }>; // Details for clipboard
}

// Provider configuration schemas
export interface BedrockConfig {
  // AWS credentials
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsSessionToken?: string;
  // Common fields
  awsRegion: string;
  modelId: string;
}

export interface ClaudeConfig {
  claudeApiKey: string;
  modelId: string;
}

export interface OpenAIConfig {
  openaiApiKey: string;
  modelId: string;
}

export interface GeminiConfig {
  geminiApiKey: string;
  modelId: string;
}

export interface CerebrasConfig {
  cerebrasApiKey: string;
  modelId: string;
}

export type ProviderConfig =
  | BedrockConfig
  | ClaudeConfig
  | OpenAIConfig
  | GeminiConfig
  | CerebrasConfig;

export type ProviderType = "bedrock" | "claude" | "openai" | "gemini" | "cerebras";

// Storage schema
export interface ExtensionStorage {
  selectedProvider: ProviderType;
  providerConfigs: {
    bedrock?: BedrockConfig;
    claude?: ClaudeConfig;
    openai?: OpenAIConfig;
    gemini?: GeminiConfig;
    cerebras?: CerebrasConfig;
  };
}

// Config field for dynamic UI generation
export interface ConfigField {
  type: "string" | "password" | "select" | "number";
  label: string;
  required: boolean;
  default?: string | number;
  options?: string[];
  placeholder?: string;
}

export type ConfigSchema = Record<string, ConfigField>;
