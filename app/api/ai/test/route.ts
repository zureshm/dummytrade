import { NextResponse } from "next/server";
import { testApiKey, setAiConnected, setAiGuardSettings } from "@/lib/ai-guard";

// POST /api/ai/test — test API key validity
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = String(body.provider || "groq");
    const rawKeys = String(body.apiKeys || body.apiKey || "");
    const keys = rawKeys.split("\n").map((k: string) => k.trim()).filter(Boolean);
    const apiKey = keys[0] || "";
    const model = String(body.model || "");

    if (!apiKey) {
      return NextResponse.json({ connected: false, error: "No API key provided" });
    }

    if (model) {
      setAiGuardSettings({ model });
    }

    const result = await testApiKey(provider, apiKey);
    setAiConnected(result.connected);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ connected: false, error: "Invalid request" }, { status: 400 });
  }
}
