// ABOUTME: Unit tests for auth header encoding used by the CLI.
// ABOUTME: Verifies the basic auth header format for WakaTime API keys.
import { describe, expect, it } from "vitest";
import { basicAuthHeaderFromApiKey } from "../src/index.js";
describe("basicAuthHeaderFromApiKey", () => {
    it("encodes API key as base64 in Basic auth header", () => {
        expect(basicAuthHeaderFromApiKey("abc")).toBe("Basic YWJj");
    });
});
