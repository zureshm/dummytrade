"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Activity, Zap, XCircle, Loader2, AlertTriangle } from "lucide-react";
import styles from "./ActiveTrade.module.scss";
import type { ActiveTrade as ActiveTradeType, WaitingTrade } from "../store/TradeStore";
import { useTradeStore } from "../store/TradeStore";
import { BASE_PATH } from "@/lib/basePath";

function TradeLogsConsole({ logs }: { logs: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLogsLengthRef = useRef(logs.length);

  useEffect(() => {
    const container = containerRef.current;
    if (container && logs.length > prevLogsLengthRef.current) {
      container.scrollTop = container.scrollHeight;
    }
    prevLogsLengthRef.current = logs.length;
  }, [logs]);

  return (
    <div className={styles.tradeLogs} ref={containerRef}>
      {logs.map((line, i) => (
        <div
          key={i}
          className={styles.logLine}
          dangerouslySetInnerHTML={{
            __html: line
              .replace(
                /₹ ?(\d+(?:\.\d+)?)/g,
                `<span class="${styles.rsGold}">₹$1</span>`
              )
              .replace(
                /at (\d{2}:\d{2}(?::\d{2})?)/g,
                `at <span class="${styles.cyanTime}">$1</span>`
              )
              .replace(
                /(Trade P\/L|Total P\/L): (-?\d+(?:\.\d+)?)/g,
                (match, label, plValue) => {
                  const isProfit = !plValue.startsWith("-");
                  const className = isProfit ? styles.plProfit : styles.plLoss;
                  return `<span class="${className}">${label}: ${plValue}</span>`;
                }
              ),
          }}
        />
      ))}
    </div>
  );
}

type Props = {
  activeTrades: ActiveTradeType[];
  waitingTrades: WaitingTrade[];
  activeLtps: Record<string, number>;
  isHydrated: boolean;
  strategyLastCandleTime?: string;
  onManualExit: (symbol: string, exitPrice: string, pnl: number, lastCandleTime: string) => void;
  onCancelWaiting: (symbol: string) => void;
};

export default function ActiveTrade({
  activeTrades,
  waitingTrades,
  activeLtps,
  isHydrated,
  onManualExit,
  onCancelWaiting,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const { removeTradeAndFreeSymbol, forceBuyEnabled, initializedSymbols, symbolHistoryStatus, aiSuggestions, aiGuardActive, aiRegime, aiSymbolEnabled } = useTradeStore();

  // Track when each waiting symbol was first seen — for 30s loader timeout
  // Stored in state (not ref) so it is safe to read during render.
  const [addedAtMap, setAddedAtMap] = useState<Record<string, number>>({});

  // Register add-time for new symbols; clean up removed ones
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddedAtMap((prev) => {
      const now = Date.now();
      const next: Record<string, number> = {};
      for (const t of waitingTrades) {
        next[t.symbol] = prev[t.symbol] ?? now;
      }
      return next;
    });
  }, [waitingTrades]);

  // Stable "now" timestamp updated every second while any symbol is loading.
  // Used during render to avoid calling Date.now() directly (impure function).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const hasLoading = waitingTrades.some((t) => !initializedSymbols.has(t.symbol));
    if (!hasLoading) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waitingTrades, initializedSymbols]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const safeActiveTrades = mounted ? activeTrades : [];
  const safeWaitingTrades = mounted ? waitingTrades : [];

  // AI regime badge — shared by waiting and active trades (only when symbol AI is enabled)
  const renderAiRegimeBadge = (symbol: string, marginLeft = 6) => {
    if (!aiGuardActive || !aiSymbolEnabled[symbol]) return null;
    const r = aiRegime[symbol];
    if (!r) return <span style={{ marginLeft, background: "#6b7280", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4 }}>ANALYZING</span>;
    const ru = r.regime.toUpperCase();
    if (ru === "UNKNOWN") return <span style={{ marginLeft, background: "#f59e0b", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4 }}>ERROR</span>;
    let label = "SIDEWAYS", color = "#a855f7";
    if (ru.includes("TREND") || ru.includes("UP") || ru.includes("BULL")) { label = "TRENDING"; color = "#22c55e"; }
    else if (ru.includes("REVERS") || ru.includes("DOWN") || ru.includes("BEAR")) { label = "DOWNWARD"; color = "#ef4444"; }
    return <span style={{ marginLeft, background: color, color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4 }}>{label}</span>;
  };

  // AI toggle switch — small inline toggle for per-symbol AI Guard
  const renderAiToggle = (symbol: string) => {
    if (!aiGuardActive) return null;
    const enabled = !!aiSymbolEnabled[symbol];
    return (
      <button
        type="button"
        onClick={() => {
          fetch(`${BASE_PATH}/api/ai/symbol-toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol, enabled: !enabled }),
          }).catch(() => {});
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          cursor: "pointer",
          border: "none",
          background: "transparent",
          padding: 0,
          fontSize: 10,
          fontWeight: 600,
          color: enabled ? "var(--theme-popup-border)" : "#6b7280",
        }}
        aria-label={enabled ? "AI Guard ON — click to disable" : "AI Guard OFF — click to enable"}
      >
        <span style={{
          position: "relative",
          width: 24,
          height: 14,
          borderRadius: 7,
          background: enabled ? "var(--theme-popup-border)" : "#374151",
          transition: "background 0.15s",
        }}>
          <span style={{
            position: "absolute",
            top: 2,
            left: enabled ? 12 : 2,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }} />
        </span>
        AI
      </button>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Activity className="w-5 h-5" />
            ACTIVE TRADES
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Active: {safeActiveTrades.length} | Waiting: {safeWaitingTrades.length}
            </span>
            {safeActiveTrades.length > 0 && (
              <Badge variant="default" className="font-semibold">
                Running
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <Separator />
        <div className={styles.activeTrades}>
          {/* real active trades */}
          {safeActiveTrades.map((t) => (
            <div key={t.symbol} className={styles.trade}>
              <div className={styles.tradeRow}>
                <div className={styles.tradeSymbol}>
                  {t.symbol}
                  {renderAiRegimeBadge(t.symbol)}
                </div>
              </div>

              {/* Price + Exit row — toggle absolutely positioned left, price/exit right-aligned */}
              <div style={{ display: "flex", justifyContent: aiGuardActive ? "space-between" : "flex-end", alignItems: "center", marginTop: "2px", marginBottom: "4px" }}>
                {renderAiToggle(t.symbol)}
                <div className={styles.tradeRight} style={!aiGuardActive ? { position: "relative", marginBottom: -32, bottom: 32 } : undefined}>
                  {(() => {
                    const ltp = activeLtps[t.symbol];
                    const entry = Number(t.entryPrice);
                    const qty = t.lotSize * t.lotValue;
                    const unrealized =
                      t.inPosition && Number.isFinite(ltp) && Number.isFinite(entry)
                        ? (ltp - entry) * qty
                        : 0;
                    const livePnl = t.pnl + unrealized;

                    return (
                      <div
                        className={`${styles.tradeMeta} ${
                          livePnl >= 0 ? styles.profit : styles.loss
                        }`}
                      >
                        {livePnl.toFixed(2)}
                      </div>
                    );
                  })()}

                  {t.status === "ACTIVE" && (
                    <button
                      className={`${styles.tradeAction} ${styles.dark}`}
                      type="button"
                      onClick={() => {
                        const ltp = activeLtps[t.symbol];
                        const entry = Number(t.entryPrice);
                        const qty = t.lotSize * t.lotValue;
                        const unrealized =
                          t.inPosition && Number.isFinite(ltp) && Number.isFinite(entry)
                            ? (ltp - entry) * qty
                            : 0;
                        const livePnl = t.pnl + unrealized;

                        const now = new Date();
                        const hh = String(now.getHours()).padStart(2, "0");
                        const mm = String(now.getMinutes()).padStart(2, "0");
                        const ss = String(now.getSeconds()).padStart(2, "0");
                        const lastCandleTime = `${hh}:${mm}:${ss}`;

                        // Notify server-side engine of manual exit
                        fetch(`${BASE_PATH}/api/trades/${encodeURIComponent(t.symbol)}/exit`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ exitPrice: String(ltp ?? ""), lastCandleTime }),
                        }).catch(() => {});

                        onManualExit(t.symbol, String(ltp ?? ""), livePnl, lastCandleTime);
                      }}
                    >
                      EXIT
                    </button>
                  )}
                  {t.status === "COMPLETED" && (
                    <button
                      className={`${styles.tradeAction} ${styles.danger}`}
                      type="button"
                      onClick={() => {
                        fetch(`${BASE_PATH}/api/trades/${encodeURIComponent(t.symbol)}/remove`, { method: "POST" }).catch(() => {});
                        removeTradeAndFreeSymbol(t.symbol);
                      }}
                    >
                      CLOSE
                    </button>
                  )}
                </div>
              </div>

              {/* AI Guard — Exit suggestion panel */}
              {(() => {
                const suggestion = aiSuggestions.find(
                  (s) => s.symbol === t.symbol && s.type === "EXIT_SUGGESTED" && !s.dismissed
                );
                if (!suggestion) return null;
                return (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    marginBottom: "6px",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }} />
                      <div style={{ flex: 1, fontSize: "12px", lineHeight: "16px" }}>
                        <span style={{ fontWeight: 600, color: "#f59e0b" }}>AI suggests EXIT</span>
                        <span style={{ color: "var(--theme-text-gray-500)", marginLeft: "6px" }}>— {suggestion.reason} ({suggestion.confidence}%)</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginLeft: "26px" }}>
                      <button
                        className={`${styles.waitingBtn} ${styles.dark}`}
                        type="button"
                        style={{ padding: "2px 8px", fontSize: "11px" }}
                        onClick={() => {
                          const ltp = activeLtps[t.symbol];
                          const entry = Number(t.entryPrice);
                          const qty = t.lotSize * t.lotValue;
                          const unrealized =
                            t.inPosition && Number.isFinite(ltp) && Number.isFinite(entry)
                              ? (ltp - entry) * qty
                              : 0;
                          const livePnl = t.pnl + unrealized;
                          const now = new Date();
                          const hh = String(now.getHours()).padStart(2, "0");
                          const mm = String(now.getMinutes()).padStart(2, "0");
                          const ss = String(now.getSeconds()).padStart(2, "0");
                          const lastCandleTime = `${hh}:${mm}:${ss}`;
                          fetch(`${BASE_PATH}/api/trades/${encodeURIComponent(t.symbol)}/exit`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ exitPrice: String(ltp ?? ""), lastCandleTime }),
                          }).catch(() => {});
                          onManualExit(t.symbol, String(ltp ?? ""), livePnl, lastCandleTime);
                        }}
                      >
                        Exit Now
                      </button>
                      <button
                        className={`${styles.waitingBtn} ${styles.danger}`}
                        type="button"
                        style={{ padding: "2px 8px", fontSize: "11px" }}
                        onClick={() => {
                          fetch(`${BASE_PATH}/api/ai/dismiss`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ symbol: t.symbol }),
                          }).catch(() => {});
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })()}

              {t.logs.length > 0 && <TradeLogsConsole logs={t.logs} />}

              {/* Trade Configuration */}
              <div className={styles.tradeConfig}>
                <div className="text-xs" style={{ color: "var(--theme-text-gray-500)" }}>
                  Trades: {t.numberOfTrades} | SL: {t.stopLossNumberEnabled ? t.stopLossNumber : "OFF"} | Target: {t.targetPointsEnabled ? t.targetPoints : "OFF"} | TSL: {t.trailingAfterTargetEnabled ? t.trailingAfterTarget : "OFF"}
                  {t.minToHoldEnabled && ` | Min Target: ${t.minToHold}`}
                </div>
              </div>
            </div>
          ))}

          {/* Pending symbols — not yet initialized, shown as compact banners */}
          {mounted && isHydrated && (() => {
            const pending = safeWaitingTrades.filter((t) => !initializedSymbols.has(t.symbol));
            if (pending.length === 0) return null;
            return pending.map((t) => {
              const addedAt = addedAtMap[t.symbol] ?? nowMs;
              const elapsedMs = nowMs - addedAt;
              const histStatus = symbolHistoryStatus[t.symbol];
              const historyFailed = histStatus?.status === "failed";
              const isTimedOut = elapsedMs >= 30000;
              const showError = historyFailed || isTimedOut;

              const errorMessage = historyFailed
                ? "History fetch failed (0 candles). Strategy may not work correctly without history. Remove and re-add, or keep with limited accuracy."
                : "Strategy engine did not respond. Check backend or remove and re-add.";

              return showError ? (
                <div key={`pending-${t.symbol}`} style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px 10px", borderRadius: "6px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b", flexShrink: 0, marginTop: "1px" }} />
                    <div style={{ flex: 1, fontSize: "12px", lineHeight: "16px" }}>
                      <span style={{ fontWeight: 600, color: "#f59e0b" }}>{t.symbol}</span>
                      <span style={{ color: "var(--theme-text-gray-500)", marginLeft: "6px" }}>— {errorMessage}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginLeft: "26px" }}>
                    <button
                      className={`${styles.waitingBtn} ${styles.danger}`}
                      type="button"
                      style={{ padding: "2px 8px", fontSize: "11px" }}
                      onClick={() => {
                        fetch(`${BASE_PATH}/api/trades/${encodeURIComponent(t.symbol)}/cancel`, { method: "POST" }).catch(() => {});
                        onCancelWaiting(t.symbol);
                      }}
                    >
                      <XCircle className="w-3 h-3" />
                      Remove
                    </button>
                    {historyFailed && (
                      <button
                        className={`${styles.waitingBtn} ${styles.dark}`}
                        type="button"
                        style={{ padding: "2px 8px", fontSize: "11px" }}
                        onClick={() => {
                          // Force symbol into initialized set — user accepts limited accuracy
                          fetch(`${BASE_PATH}/api/trades/${encodeURIComponent(t.symbol)}/force-init`, { method: "POST" }).catch(() => {});
                        }}
                      >
                        Keep anyway
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div key={`pending-${t.symbol}`} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "6px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", marginBottom: "6px" }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#6366f1", flexShrink: 0 }} />
                  <span style={{ fontSize: "12px", fontWeight: 500 }}>{t.symbol}</span>
                  <span style={{ fontSize: "11px", color: "var(--theme-text-gray-500)" }}>Initializing strategy engine...</span>
                  <button
                    className={`${styles.waitingBtn} ${styles.danger}`}
                    type="button"
                    style={{ marginLeft: "auto", padding: "2px 8px", fontSize: "11px" }}
                    onClick={() => {
                      fetch(`${BASE_PATH}/api/trades/${encodeURIComponent(t.symbol)}/cancel`, { method: "POST" }).catch(() => {});
                      onCancelWaiting(t.symbol);
                    }}
                  >
                    <XCircle className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              );
            });
          })()}

          {/* Ready waiting trades — only shown after strategy engine confirms */}
          {mounted &&
            isHydrated &&
            safeWaitingTrades
              .filter((t) => initializedSymbols.has(t.symbol))
              .map((t: WaitingTrade, index: number) => (
              <div key={index} className={styles.trade}>
                <div className={styles.tradeRow}>
                  <div className={styles.tradeSymbol}>
                    {t.symbol}
                    {renderAiRegimeBadge(t.symbol)}
                  </div>
                  {renderAiToggle(t.symbol)}
                </div>

                <div className={styles.waitingActions}>
                  <div className={`${styles.tradeMeta} ${styles.waiting}`}>
                    <span className={styles.dot1}>.</span>
                    <span className={styles.dot2}>.</span>
                    <span className={styles.dot3}>.</span>
                    <span className={styles.w1}>W</span>
                    <span className={styles.w2}>A</span>
                    <span className={styles.w3}>I</span>
                    <span className={styles.w4}>T</span>
                    <span className={styles.w5}>I</span>
                    <span className={styles.w6}>N</span>
                    <span className={styles.w7}>G</span>
                  </div>

                  {forceBuyEnabled && (
                  <button
                    className={`${styles.waitingBtn} ${styles.dark}`}
                    type="button"
                    onClick={() => {
                      fetch(`${BASE_PATH}/api/trades/${encodeURIComponent(t.symbol)}/force-buy`, { method: "POST" }).catch(() => {});
                    }}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Force&nbsp;Buy
                  </button>
                  )}
                  <button
                    className={`${styles.waitingBtn} ${styles.danger}`}
                    type="button"
                    onClick={() => {
                      fetch(`${BASE_PATH}/api/trades/${encodeURIComponent(t.symbol)}/cancel`, { method: "POST" }).catch(() => {});
                      onCancelWaiting(t.symbol);
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>

                {/* AI Guard — Entry blocked panel */}
                {(() => {
                  const suggestion = aiSuggestions.find(
                    (s) => s.symbol === t.symbol && s.type === "ENTRY_BLOCKED" && !s.dismissed
                  );
                  if (!suggestion) return null;
                  return (
                    <div style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      marginBottom: "6px",
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          fetch(`${BASE_PATH}/api/ai/dismiss`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ symbol: t.symbol }),
                          }).catch(() => {});
                        }}
                        style={{
                          position: "absolute",
                          top: "-10px",
                          right: "-10px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: "1px solid rgba(239,68,68,0.3)",
                          background: "#ef4444",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 0,
                          lineHeight: 1,
                          fontSize: "14px",
                          fontWeight: 700,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }}
                        aria-label="Dismiss"
                      >
                        ×
                      </button>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444", flexShrink: 0, marginTop: "1px" }} />
                        <div style={{ flex: 1, fontSize: "12px", lineHeight: "16px" }}>
                          <span style={{ fontWeight: 600, color: "#ef4444" }}>AI blocked entry</span>
                          <span style={{ color: "var(--theme-text-gray-500)", marginLeft: "6px" }}>— {suggestion.reason} ({suggestion.confidence}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Trade Configuration for Waiting Trades */}
                <div className={styles.tradeConfig}>
                  <div className="text-xs" style={{ color: "var(--theme-text-gray-500)" }}>
                    Trades: {t.numberOfTrades} | SL: {t.stopLossNumberEnabled ? t.stopLossNumber : "OFF"} | Target: {t.targetPointsEnabled ? t.targetPoints : "OFF"} | TSL: {t.trailingAfterTargetEnabled ? t.trailingAfterTarget : "OFF"}
                    {t.minToHoldEnabled && ` | Min Target: ${t.minToHold}`}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
