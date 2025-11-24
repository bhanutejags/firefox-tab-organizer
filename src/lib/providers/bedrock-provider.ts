/**
 * AWS Bedrock Provider
 */

import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import type { BedrockConfig, ConfigSchema } from "../types";
import { SimpleAISDKProvider } from "./simple-ai-sdk-provider";

export class BedrockProvider extends SimpleAISDKProvider {
  private _config: BedrockConfig;

  constructor(config: BedrockConfig) {
    super();
    this._config = config;
  }

  protected getModel() {
    const bedrock = createAmazonBedrock({
      region: this._config.awsRegion,
      accessKeyId: this._config.awsAccessKeyId,
      secretAccessKey: this._config.awsSecretAccessKey,
      sessionToken: this._config.awsSessionToken,
    });
    return bedrock(this._config.modelId);
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
