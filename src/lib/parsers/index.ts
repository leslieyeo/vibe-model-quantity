import type { Session } from "@/lib/data";
import type { ParseResult, ParserFn } from "./types";
import { parseClaudeCode } from "./claude";
import { parseCodex } from "./codex";
import { parseGeminiCli } from "./gemini";
import { parseHermes } from "./hermes";
import { parseOpenClaw } from "./openclaw";

export const PARSERS: ParserFn[] = [
  parseClaudeCode,
  parseCodex,
  parseGeminiCli,
  parseHermes,
  parseOpenClaw,
];

export type IngestResult = {
  sessions: Session[];
  byClient: ParseResult[];
};

export async function ingestAll(): Promise<IngestResult> {
  const byClient = await Promise.all(PARSERS.map(p => p()));
  const sessions = byClient.flatMap(r => r.sessions);
  sessions.sort((a, b) => +new Date(b.start) - +new Date(a.start));
  return { sessions, byClient };
}
