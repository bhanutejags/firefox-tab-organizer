/**
 * AWS Bedrock Provider with Bearer Token Support
 */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { type LanguageModelV1, generateText } from "ai";
import { LLMProvider } from "../llm-provider";
import type {
  BedrockConfig,
  ConfigSchema,
  GroupingResult,
  TabData,
} from "../types";

export class BedrockProvider extends LLMProvider {
  private _config: BedrockConfig;

  constructor(config: BedrockConfig) {
    super();
    this._config = config;
  }

  private getModel(): LanguageModelV1 | null {
    // If bearer token is provided, return null to use custom HTTP client
    if (this._config.bearerToken) {
      return null;
    }

    // Otherwise use AI SDK with AWS credentials
    const bedrock = createAmazonBedrock({
      region: this._config.awsRegion,
      accessKeyId: this._config.awsAccessKeyId || "",
      secretAccessKey: this._config.awsSecretAccessKey || "",
      sessionToken: this._config.awsSessionToken,
    });
    return bedrock(this._config.modelId);
  }

  /**
   * Make direct HTTP call to Bedrock Converse API using bearer token
   */
  private async callBedrockWithBearerToken(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const endpoint = `https://bedrock-runtime.${this._config.awsRegion}.amazonaws.com/model/${this._config.modelId}/converse`;

    const requestBody = {
      system: [
        {
          text: `${systemPrompt}

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text. Return ONLY the raw JSON object.`,
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              text: `${userPrompt}

Remember: Return ONLY the JSON object, no markdown, no explanation, no code blocks.`,
            },
          ],
        },
      ],
      inferenceConfig: {
        temperature: 0.3,
        maxTokens: 4096,
        stopSequences: ["\n\n---", "```"],
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this._config.bearerToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Extract text from Bedrock Converse API response
    if (data.output?.message?.content?.[0]?.text) {
      return data.output.message.content[0].text;
    }

    throw new Error("Unexpected Bedrock API response format");
  }

  async categorize(
    tabs: TabData[],
    userPrompt?: string,
  ): Promise<GroupingResult> {
    const prompt = this.buildPrompt(tabs, userPrompt);

    let text: string;

    if (this._config.bearerToken) {
      // Use bearer token authentication
      text = await this.callBedrockWithBearerToken(prompt.system, prompt.user);
    } else {
      // Use AWS credentials with AI SDK
      const model = this.getModel();
      if (!model) {
        throw new Error(
          "No authentication configured. Provide either bearer token or AWS credentials.",
        );
      }

      const response = await generateText({
        model,
        system: prompt.system,
        prompt: prompt.user,
        temperature: 0.3,
        maxTokens: 4096,
        maxRetries: 3,
      });

      text = response.text;
    }

    return this.parseResponse(text);
  }

  async testConnection(): Promise<boolean> {
    try {
      if (this._config.bearerToken) {
        // Test bearer token
        await this.callBedrockWithBearerToken(
          "You are a test assistant.",
          "Hi",
        );
      } else {
        // Test AWS credentials
        const model = this.getModel();
        if (!model) {
          throw new Error(
            "No authentication configured. Provide either bearer token or AWS credentials.",
          );
        }

        await generateText({
          model,
          prompt: "Test",
          maxTokens: 10,
        });
      }
      return true;
    } catch (error) {
      console.error("Bedrock connection test failed:", error);
      return false;
    }
  }

  getConfigSchema(): ConfigSchema {
    return {
      bearerToken: {
        type: "password",
        label: "Bearer Token (Recommended)",
        required: false,
        placeholder: "Paste token from ~/.local/bin/fetch-bedrock-token",
      },
      awsAccessKeyId: {
        type: "string",
        label: "AWS Access Key ID (Alternative)",
        required: false,
        placeholder: "AKIA... (only if not using bearer token)",
      },
      awsSecretAccessKey: {
        type: "password",
        label: "AWS Secret Access Key (Alternative)",
        required: false,
        placeholder: "Only if not using bearer token",
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
        options: [
          "us-east-1",
          "us-west-2",
          "us-east-2",
          "eu-west-1",
          "ap-southeast-1",
        ],
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
