import type { ClientId, Session } from "@/lib/data";

export type ParseResult = {
  client: ClientId;
  sessions: Session[];
  /** Indicates the source is installed on disk (data directory exists). */
  installed: boolean;
  /** Non-fatal warnings / notes (e.g. "Gemini CLI doesn't log tokens locally"). */
  notes?: string[];
  /** Files scanned, for diagnostics. */
  filesScanned: number;
};

export type ParserFn = () => Promise<ParseResult>;
