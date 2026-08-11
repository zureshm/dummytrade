# AI Guard Implementation — Change Log for Porting to Real Repo

## Overview
AI Guard feature: Groq-powered sideways/reversing market detector that blocks entries and suggests/auto-executes exits.

## Files Created (4 new files)

### 1. `lib/ai-guard.ts` (NEW — 214 lines)
Complete AI Guard module:
- Types: `AiGuardSettings`, `AiAnalysisResult`, `AiSuggestion`
- Settings storage (in-memory): `getAiGuardSettings()`, `setAiGuardSettings()`
- Connection state: `isAiConnected()`, `setAiConnected()`, `isAiGuardActive()`
- `analyzeMarketRegime(symbol, candles, tradeContext?)` — builds compact candle string, calls Groq API
- `testApiKey(provider, apiKey)` — tests key validity
- `buildCompactCandles(candles, maxCount)` — slices last N candles, format: `time,open,high,low,close` joined by `|`
- System prompt with explicit JSON schema
- Groq config: URL `https://api.groq.com/openai/v1/chat/completions`, model `llama-3.3-70b-versatile`
- 10s timeout, fallback to `{ marketRegime: "UNKNOWN", blockEntry: false, suggestExit: false, confidence: 0, reason: "AI unavailable" }`
- Default settings: enabled=false, entryGuardEnabled=false, autoExitEnabled=false, confidenceThreshold=70, candlesCount=120, provider="groq", apiKey=""

### 2. `app/api/ai/settings/route.ts` (NEW — 31 lines)
- GET: returns settings with apiKey masked as "***"
- POST: saves settings from frontend (enabled, entryGuardEnabled, autoExitEnabled, confidenceThreshold, candlesCount, provider, apiKey)

### 3. `app/api/ai/test/route.ts` (NEW — 22 lines)
- POST: tests API key via `testApiKey()`, sets `aiConnected` flag

### 4. `app/api/ai/dismiss/route.ts` (NEW — 18 lines)
- POST: calls `dismissAiSuggestion(symbol)` from trade-engine

## Files Modified (4 existing files)

### 5. `lib/trade-engine.ts` (MODIFIED — 5 changes)

**Change A: Import (line ~25)**
```ts
import { getAiGuardSettings, isAiGuardActive, analyzeMarketRegime, type AiSuggestion, type AiAnalysisResult } from "./ai-guard";
```

**Change B: AI state variables (after lastHandledSignalKey, ~line 605)**
```ts
// AI Guard state
const aiSuggestions: AiSuggestion[] = [];
const lastAiCandleTime: Record<string, string> = {};
const lastAiResult: Record<string, AiAnalysisResult> = {};
```

**Change C: AI hook in handleStrategySignal (after candleTime is recorded, ~line 2359)**
- Fires once per new candle per symbol (detected via `candleTime !== lastAiCandleTime[signalSymbol]`)
- Fetches `GET ${STRATEGY_URL}/chart-history` for fresh candle data (~700 candles)
- Calls `analyzeMarketRegime()` with the candles + trade context
- EntryGuard: if `blockEntry && confidence >= threshold`, adds ENTRY_BLOCKED suggestion + logs
- ExitGuard: if `suggestExit && confidence >= threshold && activeTrade.inPosition`:
  - If `autoExitEnabled`: calls `completeActiveTrade()` + `updateLastSellCandleTime()`
  - Else: adds EXIT_SUGGESTED suggestion + logs to active trade
- All async, fire-and-forget (doesn't block signal processing)
- Console logs: `[ai-guard] SYMBOL: N candles from chart-history, using last N`

**Change D: EntryGuard check before activateWaitingTrade (~line 2916)**
```ts
// AI Guard EntryGuard — check if AI blocked entry for this symbol
const aiResult = lastAiResult[signalSymbol];
const aiSettings = getAiGuardSettings();
if (aiSettings.entryGuardEnabled && aiResult && aiResult.blockEntry && aiResult.confidence >= aiSettings.confidenceThreshold) {
  const blockedLog = `BUY blocked by AI Guard — ${aiResult.reason} (${aiResult.confidence}%) at ${fmtTime(signal.lastCandleTime)}`;
  if (matchingTrade) { addLogToWaiting(matchingTrade.symbol, blockedLog); }
  else if (activeForSymbol && !activeForSymbol.inPosition) { addLogToActive(activeForSymbol.symbol, blockedLog); }
  lastHandledSignalKey[signalSymbol] = signalKey;
  return;
}
```
Placed BEFORE `activateWaitingTrade()` / `updateActiveTradeBuy()` calls.

**Change E: getEngineState() additions (~line 3731)**
```ts
aiSuggestions: [...aiSuggestions],
aiGuardActive: isAiGuardActive(),
```

**Change F: dismissAiSuggestion export (~line 3752)**
```ts
export function dismissAiSuggestion(symbol: string) {
  for (let i = aiSuggestions.length - 1; i >= 0; i--) {
    if (aiSuggestions[i].symbol === symbol && !aiSuggestions[i].dismissed) {
      aiSuggestions[i].dismissed = true;
    }
  }
}
```

### 6. `app/store/TradeStore.tsx` (MODIFIED — 5 changes)

**Change A: AiSuggestion type (after ActiveTrade type, ~line 102)**
```ts
export type AiSuggestion = {
  symbol: string;
  type: "ENTRY_BLOCKED" | "EXIT_SUGGESTED";
  marketRegime: string;
  confidence: number;
  reason: string;
  timestamp: string;
  dismissed: boolean;
};
```

**Change B: TradeStoreValue type — add AI fields (~line 224)**
```ts
// AI Guard
aiSuggestions: AiSuggestion[];
aiGuardActive: boolean;
```

**Change C: syncFromServer type — add AI fields (~line 220)**
```ts
aiSuggestions?: AiSuggestion[];
aiGuardActive?: boolean;
```

**Change D: State declarations (~line 279)**
```ts
const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
const [aiGuardActive, setAiGuardActive] = useState(false);
```

**Change E: syncFromServer handler — sync AI state (~line 806)**
```ts
if (Array.isArray(state.aiSuggestions)) {
  setAiSuggestions(state.aiSuggestions);
}
if (typeof state.aiGuardActive === "boolean") {
  setAiGuardActive(state.aiGuardActive);
}
```

**Change F: value object — expose AI state (~line 843)**
```ts
aiSuggestions,
aiGuardActive,
```

### 7. `app/dashboard/ActiveTrade.tsx` (MODIFIED — 3 changes)

**Change A: Pull aiSuggestions from store (~line 77)**
```ts
const { removeTradeAndFreeSymbol, forceBuyEnabled, initializedSymbols, symbolHistoryStatus, aiSuggestions } = useTradeStore();
```

**Change B: EXIT_SUGGESTED panel (before TradeLogsConsole in active trades section, ~line 213)**
- Amber panel with AlertTriangle icon
- Shows: "AI suggests EXIT — {reason} ({confidence}%)"
- Buttons: "Exit Now" (calls /api/trades/{symbol}/exit) + "Dismiss" (calls /api/ai/dismiss)

**Change C: ENTRY_BLOCKED panel (before TradeConfig in waiting trades section, ~line 422)**
- Red panel with AlertTriangle icon
- Shows: "AI blocked entry — {reason} ({confidence}%)"
- Buttons: "Force Entry" (calls /api/trades/{symbol}/force-buy) + "Dismiss" (calls /api/ai/dismiss)

### 8. `app/dashboard/SettingsPopup.tsx` (MODIFIED — 5 changes)

**Change A: Imports (~line 3-6)**
```ts
import { useEffect, useState, useRef, useCallback } from "react";
import { X, Settings, Play, Palette, Shield, HelpCircle, Loader2 } from "lucide-react";
import { BASE_PATH } from "@/lib/basePath";
```

**Change B: Test connection state (~line 67)**
```ts
const [aiTestStatus, setAiTestStatus] = useState<"idle" | "testing" | "connected" | "failed">("idle");
const [aiTestError, setAiTestError] = useState("");
const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const aiPrevKeyRef = useRef<string>("");
const aiPrevProviderRef = useRef<string>("groq");
```

**Change C: Default candlesCount = 120 (not 240)**
```ts
const [aiCandlesCount, setAiCandlesCount] = useState(120);
```

**Change D: Debounced POST settings + auto-test connection (~line 112-168)**
- `postAiSettings()` — debounced 500ms POST to `/api/ai/settings`
- `testAiConnection()` — POST to `/api/ai/test`, sets status
- useEffect: auto-test on apiKey/provider change (800ms debounce)

**Change E: UI changes**
- Status text reflects connection: "Active" / "Enabled but API key invalid" / "Enabled — testing connection..."
- Test connection indicator below API key input: ✓ Connected / ✗ {error} / Testing... (with Loader2 spinner)
- Candles input: min=60, max=240, step=60
- Tooltip: "120 candles = 2 hours of price action"

## Data Flow
```
tick() every 1s → GET /evaluate?symbol=X
  → handleStrategySignal(signal)
    → candleTime changed? (new candle)
      → GET /chart-history (strategy server, ~700 candles)
        → buildCompactCandles(candles, 120) → last 120 candles
          → POST to Groq API
            → JSON response: { marketRegime, blockEntry, suggestExit, confidence, reason }
              → EntryGuard: blocks BUY if blockEntry && confidence >= threshold
              → ExitGuard: auto-exit or suggestion if suggestExit && confidence >= threshold
              → Result stored in lastAiResult[symbol]
                → getEngineState() returns aiSuggestions[] + aiGuardActive
                  → StrategyTimerProvider polls /api/trades every 1s
                    → syncFromServer → TradeStore → ActiveTrade.tsx renders panels
```

## Groq API Config
- URL: `https://api.groq.com/openai/v1/chat/completions`
- Model: `llama-3.3-70b-versatile`
- Temperature: 0.3
- Max tokens: 200
- Timeout: 10s
- System prompt: sideways detector with explicit JSON schema

## Expected Groq Response
```json
{
  "marketRegime": "TRENDING" | "SIDEWAYS" | "REVERSING",
  "blockEntry": boolean,
  "suggestExit": boolean,
  "confidence": number (0-100),
  "reason": "brief explanation",
  "rangeHigh": number or null,
  "rangeLow": number or null
}
```

## Safety
- AI failure (timeout, non-JSON, network error) → fallback: `{ blockEntry: false, suggestExit: false, confidence: 0 }` — trades never blocked by AI failure
- `isAiGuardActive()` requires: enabled=true AND apiKey set AND aiConnected=true
- All AI calls are async fire-and-forget — never blocks signal processing
- EntryGuard only blocks BUY signals, never SELL or REENTER
- ExitGuard only acts on active trades that are `inPosition`

## Settings (localStorage keys, all prefixed with `dummy_`)
- `dummy_aiGuardEnabled` — master toggle
- `dummy_aiEntryGuardEnabled` — block BUY entries
- `dummy_aiAutoExitEnabled` — auto-exit vs suggest
- `dummy_aiConfidenceThreshold` — 0-100, default 70
- `dummy_aiCandlesCount` — 60-240 step 60, default 120
- `dummy_aiProvider` — "groq"
- `dummy_aiApiKey` — Groq API key

## No Changes Needed In
- `app/components/StrategyTimerProvider.tsx` — already passes full state to syncFromServer
- `app/api/trades/route.ts` — already returns getEngineState() which now includes aiSuggestions
- `lib/basePath.ts` — already exists
