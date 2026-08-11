import { NextResponse } from "next/server";
import { getAiLogs, clearAiLogs } from "@/lib/ai-guard";

export const dynamic = "force-dynamic";

// GET /api/ai/guard-logs — return AI Guard log lines (500-line ring buffer)
export async function GET() {
  return NextResponse.json({ logs: getAiLogs() });
}

// DELETE /api/ai/guard-logs — clear AI Guard log buffer
export async function DELETE() {
  clearAiLogs();
  return NextResponse.json({ ok: true });
}
