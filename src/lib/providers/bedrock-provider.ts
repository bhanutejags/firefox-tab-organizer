/**
 * AWS Bedrock Provider
 */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { generateText } from "ai";
import { LLMProvider } from "../llm-provider";
import type { BedrockConfig, CleanResult, ConfigSchema, GroupingResult, TabData } from "../types";

export class BedrockProvider extends LLMProvider {
  private _config: BedrockConfig;

  constructor(config: BedrockConfig) {
    super();
    this._config = config;
  }

  private getModel() {
    const bedrock = createAmazonBedrock({
      region: this._config.awsRegion,
      accessKeyId: this._config.awsAccessKeyId,
      secretAccessKey: this._config.awsSecretAccessKey,
      sessionToken: this._config.awsSessionToken,
    });
    return bedrock(this._config.modelId);
  }

  /**
   * Call LLM using AWS credentials with AI SDK
   */
  private async callLLM(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 4096,
  ): Promise<string> {
    const model = this.getModel();

    const response = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
      maxTokens,
      maxRetries: 3,
    });

    return response.text;
  }

  async categorize(tabs: TabData[], userPrompt?: string): Promise<GroupingResult> {
    const prompt = this.buildPrompt(tabs, userPrompt);
    const text = await this.callLLM(prompt.system, prompt.user, 4096);
    return this.parseResponse(text);
  }

  async cleanTabs(tabs: TabData[], userPrompt: string): Promise<CleanResult> {
    const prompt = this.buildCleanPrompt(tabs, userPrompt);
    const text = await this.callLLM(prompt.system, prompt.user, 2048);
    return this.parseCleanResponse(text, tabs);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.callLLM("You are a test assistant.", "Hi", 10);
      return true;
    } catch (error) {
      console.error("Bedrock connection test failed:", error);
      return false;
    }
  }

  getConfigSchema(): ConfigSchema {
    return {
      awsAccessKeyId: {
        type: "string",
        label: "AWS Access Key ID",
        required: true,
        placeholder: "AKIA...",
      },
      awsSecretAccessKey: {
        type: "password",
        label: "AWS Secret Access Key",
        required: true,
        placeholder: "Your AWS secret access key",
      },
      awsSessionToken: {
        type: "password",
        label: "AWS Session Token (Optional)",
        required: false,
        placeholder: "Session token if using temporary credentials",
      },
      awsRegion: {
        type: "select",
        label: "AWS Region",
        required: true,
        default: "us-east-1",
        options: ["us-east-1", "us-west-2", "us-east-2", "eu-west-1", "ap-southeast-1"],
      },
      modelId: {
        type: "select",
        label: "Model ID",
        required: true,
        default: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        options: [
          "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
          "us.anthropic.claude-haiku-4-5-20251001-v1:0",
          "us.anthropic.claude-opus-4-1-20250805-v1:0",
        ],
      },
    };
  }
}
