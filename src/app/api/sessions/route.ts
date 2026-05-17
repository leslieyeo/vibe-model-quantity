import { NextResponse } from "next/server";
import { ingestAll } from "@/lib/parsers";
import { resolveModel } from "@/lib/parsers/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await ingestAll();

  // Build model + project rosters from observed sessions.
  const modelSet = new Map<string, { id: string; display: string; vendor: string; prices: ReturnType<typeof resolveModel>["prices"] }>();
  const projectSet = new Map<string, { id: string; name: string; path: string }>();

  for (const s of result.sessions) {
    if (!modelSet.has(s.model)) {
      const r = resolveModel(s.model);
      modelSet.set(s.model, { id: s.model, display: r.display, vendor: r.vendor, prices: r.prices });
    }
    if (!projectSet.has(s.project)) {
      projectSet.set(s.project, { id: s.project, name: s.project, path: "" });
    }
  }

  return NextResponse.json({
    sessions: result.sessions,
    models: [...modelSet.values()],
    projects: [...projectSet.values()],
    diagnostics: result.byClient.map(c => ({
      client: c.client,
      installed: c.installed,
      filesScanned: c.filesScanned,
      sessions: c.sessions.length,
      notes: c.notes ?? [],
    })),
  });
}
