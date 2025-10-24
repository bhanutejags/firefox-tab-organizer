#!/usr/bin/env bun

/**
 * Build script using Bun's native bundler
 * No webpack, no babel - just Bun!
 */

import { mkdir } from "fs/promises";

const entrypoints = [
  "src/background.ts",
  "src/popup/popup.ts",
  "src/options/options.ts",
];

console.log("🔨 Building Firefox Tab Organizer...");

// Ensure dist directory exists
await mkdir("dist", { recursive: true });

// Build all entrypoints using Bun's native bundler
const buildPromises = entrypoints.map(async (entry) => {
  const result = await Bun.build({
    entrypoints: [entry],
    outdir: "dist",
    target: "browser",
    minify: process.env.NODE_ENV === "production",
    sourcemap: "external",
    splitting: false, // Firefox doesn't support module splitting well
  });

  if (!result.success) {
    console.error(`❌ Failed to build ${entry}`);
    for (const log of result.logs) {
      console.error(log);
    }
    throw new Error(`Build failed for ${entry}`);
  }

  console.log(`✅ Built ${entry}`);
  return result;
});

await Promise.all(buildPromises);

console.log("✨ Build complete!");
