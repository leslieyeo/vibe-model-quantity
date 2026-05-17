import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import type { ParseResult } from "./types";

const CANDIDATES = [
  path.join(os.homedir(), ".openclaw"),
  path.join(os.homedir(), "Library", "Application Support", "OpenClaw"),
];

export async function parseOpenClaw(): Promise<ParseResult> {
  for (const c of CANDIDATES) {
    try {
      await fs.access(c);
      return {
        client: "openclaw",
        sessions: [],
        installed: true,
        filesScanned: 0,
        notes: ["OpenClaw detected but parser not implemented yet."],
      };
    } catch { /* keep checking */ }
  }
  return { client: "openclaw", sessions: [], installed: false, filesScanned: 0 };
}
