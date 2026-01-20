#!/usr/bin/env node
// ABOUTME: MCP server exposing WakaTime summary tools over stdio.
// ABOUTME: Proxies tool calls to the WakaTime API using the API key env var.
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const SummariesInput = z.object({
  start: z.string().min(1), // YYYY-MM-DD
  end: z.string().min(1), // YYYY-MM-DD
  project: z.string().optional(),
  timezone: z.string().optional(), // e.g. "Asia/Tokyo" (API側パラメータ名は tz なので後で変換)
});

function toolText(text: string) {
  return [{ type: "text", text }];
}

export function basicAuthHeaderFromApiKey(apiKey: string): string {
  // WakaTime docs: Authorization: Basic <base64(api_key)> :contentReference[oaicite:4]{index=4}
  const b64 = Buffer.from(apiKey, "utf8").toString("base64");
  return `Basic ${b64}`;
}

async function wakatimeGet(
  path: string,
  qs: Record<string, string | undefined>,
) {
  const apiKey = process.env.WAKATIME_API_KEY;
  if (!apiKey) {
    throw new Error(
      "環境変数 WAKATIME_API_KEY が未設定です（WakaTimeのAPI Key）。",
    );
  }

  const url = new URL(`https://api.wakatime.com/api/v1/${path}`); // base url :contentReference[oaicite:5]{index=5}
  for (const [k, v] of Object.entries(qs)) {
    if (v != null && v !== "") url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: basicAuthHeaderFromApiKey(apiKey),
      Accept: "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`WakaTime API error: ${res.status}\n${text}`);
  }
  return text; // JSON文字列のまま返す（利用側でパースしてもOK）
}

export function todayYmd(tz = "Asia/Tokyo"): string {
  // Node の Intl を使って TZ を考慮した YYYY-MM-DD を作る
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) throw new Error("today date formatting failed");
  return `${y}-${m}-${d}`;
}

async function main() {
  const server = new Server(
    { name: "wakatime-mcp", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "wakatime_summaries",
        description:
          "WakaTime Summaries API を叩き、指定期間の日次サマリ(JSON)を返します。",
        inputSchema: {
          type: "object",
          properties: {
            start: { type: "string", description: "YYYY-MM-DD" },
            end: { type: "string", description: "YYYY-MM-DD" },
            project: { type: "string" },
            timezone: { type: "string", description: "例: Asia/Tokyo" },
          },
          required: ["start", "end"],
          additionalProperties: false,
        },
      },
      {
        name: "wakatime_today",
        description:
          "今日のサマリ(JSON)を返します（Asia/Tokyo をデフォルトにします）。",
        inputSchema: {
          type: "object",
          properties: {
            project: { type: "string" },
            timezone: { type: "string", description: "例: Asia/Tokyo" },
          },
          additionalProperties: false,
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;

    if (name === "wakatime_summaries") {
      const input = SummariesInput.parse(args ?? {});
      // docs: GET /users/current/summaries :contentReference[oaicite:6]{index=6}
      // typical params: start, end, project, timezone(tz)
      const json = await wakatimeGet("users/current/summaries", {
        start: input.start,
        end: input.end,
        project: input.project,
        tz: input.timezone,
      });
      return { content: toolText(json) };
    }

    if (name === "wakatime_today") {
      const tz = (args?.timezone as string | undefined) ?? "Asia/Tokyo";
      const project = args?.project as string | undefined;
      const ymd = todayYmd(tz);
      const json = await wakatimeGet("users/current/summaries", {
        start: ymd,
        end: ymd,
        project,
        tz,
      });
      return { content: toolText(json) };
    }

    return { content: toolText(`未知の tool: ${name}`), isError: true };
  });

  await server.connect(new StdioServerTransport());
}

if (process.argv[1]) {
  const entryUrl = pathToFileURL(process.argv[1]).href;
  if (import.meta.url === entryUrl) {
    main().catch((err) => {
      console.error(String(err?.stack ?? err));
      process.exit(1);
    });
  }
}
