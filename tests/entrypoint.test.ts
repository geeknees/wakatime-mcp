// ABOUTME: Unit tests for entrypoint detection in the CLI.
// ABOUTME: Ensures the main function runs when invoked via real or symlink paths.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import { shouldRunMain } from "../src/index.js";

describe("shouldRunMain", () => {
  it("returns true when argv1 matches import.meta.url", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wakatime-mcp-"));
    const targetPath = path.join(tmpDir, "entry.js");
    fs.writeFileSync(targetPath, "");

    const importMetaUrl = pathToFileURL(targetPath).href;

    expect(shouldRunMain(importMetaUrl, targetPath)).toBe(true);
  });

  it("returns true when argv1 is a symlink to the entry script", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wakatime-mcp-"));
    const targetPath = path.join(tmpDir, "entry.js");
    const linkPath = path.join(tmpDir, "entry-link.js");
    fs.writeFileSync(targetPath, "");
    fs.symlinkSync(targetPath, linkPath);

    const importMetaUrl = pathToFileURL(targetPath).href;

    expect(shouldRunMain(importMetaUrl, linkPath)).toBe(true);
  });

  it("returns false when argv1 points elsewhere", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wakatime-mcp-"));
    const targetPath = path.join(tmpDir, "entry.js");
    const otherPath = path.join(tmpDir, "other.js");
    fs.writeFileSync(targetPath, "");
    fs.writeFileSync(otherPath, "");

    const importMetaUrl = pathToFileURL(targetPath).href;

    expect(shouldRunMain(importMetaUrl, otherPath)).toBe(false);
  });
});
