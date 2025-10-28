#!/usr/bin/env bun

/**
 * Build script using Bun's native bundler
 * No webpack, no babel - just Bun!
 */

import { copyFile, mkdir, readdir } from "fs/promises";
import { join } from "path";

const entrypoints = [
  "src/background.ts",
  "src/popup/popup.ts",
  "src/options/options.ts",
];

console.log("🔨 Building Firefox Tab Organizer...");

// Ensure dist directory exists
await mkdir("dist", { recursive: true });
await mkdir("dist/icons", { recursive: true });

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

// Copy static assets
console.log("📦 Copying assets...");

try {
  // Copy manifest.json
  await copyFile("manifest.json", "dist/manifest.json");
  console.log("✅ Copied manifest.json");

  // Copy HTML and CSS files from popup
  const popupFiles = await readdir("src/popup");
  for (const file of popupFiles) {
    if (file.endsWith(".html") || file.endsWith(".css")) {
      await copyFile(join("src/popup", file), join("dist", file));
      console.log(`✅ Copied ${file}`);
    }
  }

  // Copy HTML and CSS files from options
  const optionsFiles = await readdir("src/options");
  for (const file of optionsFiles) {
    if (file.endsWith(".html") || file.endsWith(".css")) {
      await copyFile(join("src/options", file), join("dist", file));
      console.log(`✅ Copied ${file}`);
    }
  }

  // Copy icons
  const iconFiles = await readdir("src/icons");
  for (const file of iconFiles) {
    if (file.endsWith(".png")) {
      await copyFile(join("src/icons", file), join("dist/icons", file));
      console.log(`✅ Copied icons/${file}`);
    }
  }
} catch (error) {
  console.error("❌ Failed to copy assets:", error);
  throw error;
}

console.log("✨ Build complete!");
