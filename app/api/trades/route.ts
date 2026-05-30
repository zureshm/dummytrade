import { NextResponse } from "next/server";
import { getEngineState, addWaitingTrade, ensureEngineRunning, flushSoundEvents } from "@/lib/trade-engine";

// GET /api/trades — returns current engine state for frontend to display
export async function GET() {
  try {
    ensureEngineRunning();
    const state = getEngineState();
    const soundEvents = flushSoundEvents();
    return NextResponse.json({ ...state, soundEvents });
  } catch (error) {
    console.error("[API] GET /api/trades error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/trades — add a new waiting trade
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.symbol || !/^(NIFTY|SENSEX)\d{2}[A-Z]{3}\d{2}\d+[A-Z]{2,3}$/.test(body.symbol)) {
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
    }
    addWaitingTrade(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
