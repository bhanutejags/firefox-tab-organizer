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

// Provider configuration schemas
export interface BedrockConfig {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
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

export interface OllamaConfig {
  endpoint: string;
  modelId: string;
}

export type ProviderConfig =
  | BedrockConfig
  | ClaudeConfig
  | OpenAIConfig
  | OllamaConfig;

export type ProviderType = "bedrock" | "claude" | "openai" | "ollama";

// Storage schema
export interface ExtensionStorage {
  selectedProvider: ProviderType;
  providerConfigs: {
    bedrock?: BedrockConfig;
    claude?: ClaudeConfig;
    openai?: OpenAIConfig;
    ollama?: OllamaConfig;
  };
  preferences: {
    maxGroups: number;
    autoCollapse: boolean;
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
