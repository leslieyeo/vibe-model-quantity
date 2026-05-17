import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ParseResult } from "./types";

const GEMINI_DIR = path.join(os.homedir(), ".gemini");

// Gemini CLI doesn't persist token usage to disk locally — chat session files
// only store sessionId/projectHash/timestamps. v1 stub: detect install but
// return zero sessions and surface a note.
export async function parseGeminiCli(): Promise<ParseResult> {
  let installed = false;
  try {
    await fs.access(GEMINI_DIR);
    installed = true;
  } catch {
    return { client: "gemini-cli", sessions: [], installed: false, filesScanned: 0 };
  }
  return {
    client: "gemini-cli",
    sessions: [],
    installed,
    filesScanned: 0,
    notes: ["Gemini CLI doesn't persist token usage locally — usage data unavailable."],
  };
}
