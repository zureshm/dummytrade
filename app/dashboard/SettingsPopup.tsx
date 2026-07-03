"use client";

import { useEffect, useState } from "react";
import { X, Settings, Play, Palette, Shield, HelpCircle } from "lucide-react";
import { playSound, setVolume } from "@/lib/sounds";
import { useTheme } from "@/components/ThemeProvider";
import { useTradeStore } from "../store/TradeStore";

const STRATEGY_URL = process.env.NEXT_PUBLIC_STRATEGY_API_URL || "http://localhost:4000";

// Friendly display names for strategy script names — edit these as needed
const STRATEGY_DISPLAY_NAMES: Record<string, string> = {
  evaluateEMACross: "EMA Crossover",
  surStrategy: "Suresh Strategy",
  chatGptStrategy: "ChatGPT Strategy",
  claudSurStrategy: "Kumbhakarna V1",
  utGptStrategy: "UT GPT",
  utGptStrategy1: "UT GPT v1",
  utGptStrategy2: "UT GPT v2",
  utGptStrategy3: "UT GPT v3",
  superDoubleUT: "Super Double UT",
  superUTBotStrategy: "Super UT Bot",
  VWAPUTBotStrategy: "Kumbhakarna V2",
  sumeshStrategy: "Sumesh Strategy",
  utGptStrategy4: "UT GPT v4",
  utGptStrategy4X: "UT GPT v4X",
};

function getDisplayName(key: string) {
  return STRATEGY_DISPLAY_NAMES[key] || key;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsPopup({ open, onClose }: Props) {
  const [activeStrategy, setActiveStrategy] = useState<string>("");
  const [availableStrategies, setAvailableStrategies] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [volume, setVolumeState] = useState(0.5);
  const { theme, setTheme } = useTheme();
  const { forceBuyEnabled, setForceBuyEnabled } = useTradeStore();

  // AI Guard settings
  const [aiGuardEnabled, setAiGuardEnabled] = useState(false);
  const [aiEntryGuardEnabled, setAiEntryGuardEnabled] = useState(false);
  const [aiAutoExitEnabled, setAiAutoExitEnabled] = useState(false);
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState(70);
  const [aiCandlesCount, setAiCandlesCount] = useState(240);
  const [aiProvider, setAiProvider] = useState("groq");
  const [aiApiKey, setAiApiKey] = useState("");

  // AI Guard info tooltips
  const [isEntryGuardInfoOpen, setIsEntryGuardInfoOpen] = useState(false);
  const [isAutoExitInfoOpen, setIsAutoExitInfoOpen] = useState(false);
  const [isConfidenceInfoOpen, setIsConfidenceInfoOpen] = useState(false);
  const [isCandlesInfoOpen, setIsCandlesInfoOpen] = useState(false);
  const [isProviderInfoOpen, setIsProviderInfoOpen] = useState(false);
  const [isApiKeyInfoOpen, setIsApiKeyInfoOpen] = useState(false);

  // Load volume from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("dummy_soundVolume");
    if (stored) setVolumeState(parseFloat(stored));

    const aiGuard = localStorage.getItem("dummy_aiGuardEnabled");
    if (aiGuard) setAiGuardEnabled(aiGuard === "true");

    const aiEntry = localStorage.getItem("dummy_aiEntryGuardEnabled");
    if (aiEntry) setAiEntryGuardEnabled(aiEntry === "true");

    const aiAutoExit = localStorage.getItem("dummy_aiAutoExitEnabled");
    if (aiAutoExit) setAiAutoExitEnabled(aiAutoExit === "true");

    const aiThreshold = localStorage.getItem("dummy_aiConfidenceThreshold");
    if (aiThreshold) setAiConfidenceThreshold(parseInt(aiThreshold, 10));

    const aiCandles = localStorage.getItem("dummy_aiCandlesCount");
    if (aiCandles) setAiCandlesCount(parseInt(aiCandles, 10));

    const aiProv = localStorage.getItem("dummy_aiProvider");
    if (aiProv) setAiProvider(aiProv);

    const aiKey = localStorage.getItem("dummy_aiApiKey");
    if (aiKey) setAiApiKey(aiKey);
  }, []);

  // Persist AI Guard settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("dummy_aiGuardEnabled", String(aiGuardEnabled));
    localStorage.setItem("dummy_aiEntryGuardEnabled", String(aiEntryGuardEnabled));
    localStorage.setItem("dummy_aiAutoExitEnabled", String(aiAutoExitEnabled));
    localStorage.setItem("dummy_aiConfidenceThreshold", String(aiConfidenceThreshold));
    localStorage.setItem("dummy_aiCandlesCount", String(aiCandlesCount));
    localStorage.setItem("dummy_aiProvider", aiProvider);
    localStorage.setItem("dummy_aiApiKey", aiApiKey);
  }, [aiGuardEnabled, aiEntryGuardEnabled, aiAutoExitEnabled, aiConfidenceThreshold, aiCandlesCount, aiProvider, aiApiKey]);

  // Fetch current strategy info when popup opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMessage(null);
    fetch(`${STRATEGY_URL}/strategy`)
      .then((r) => r.json())
      .then((data) => {
        setActiveStrategy(data.activeStrategy || "");
        setSelectedStrategy(data.activeStrategy || "");
        setAvailableStrategies(data.availableStrategies || []);
      })
      .catch(() => {
        setMessage({ text: "Failed to fetch strategy info", type: "error" });
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleSave = async () => {
    if (!selectedStrategy || selectedStrategy === activeStrategy) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${STRATEGY_URL}/strategy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: selectedStrategy }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveStrategy(data.activeStrategy);
        setMessage({ text: `Switched to ${getDisplayName(data.activeStrategy)}`, type: "success" });
      } else {
        setMessage({ text: data.message || "Failed to switch", type: "error" });
      }
    } catch {
      setMessage({ text: "Failed to connect to strategy server", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--theme-popup-backdrop)" }}
      onClick={onClose}
    >
      <div
        className="relative w-[380px] rounded-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight: "90vh",
          maxWidth: "90%",
          background: "var(--theme-popup-bg)",
          color: "var(--theme-popup-text)",
          border: "3px solid var(--theme-popup-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - fixed */}
        <div className="flex items-center justify-between p-6 pb-5">
          <div className="flex items-center gap-2">
            <Settings size={20} style={{ color: "var(--theme-popup-border)" }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--theme-popup-text)" }}>Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition"
            style={{ background: "var(--theme-popup-border)", color: "#fff" }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ scrollbarWidth: "thin" }}>
          {loading ? (
            <div className="text-sm py-4 text-center" style={{ color: "var(--theme-popup-label)" }}>Loading...</div>
          ) : (
            <>
              {/* Current strategy */}
            <div className="mb-5">
              <div className="text-xs font-medium mb-1" style={{ color: "var(--theme-popup-label)" }}>Current Running Strategy</div>
              <div className="text-base font-bold" style={{ color: "var(--theme-popup-border)" }}>
                {getDisplayName(activeStrategy)}
              </div>
            </div>

            {/* Strategy selector */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--theme-popup-label)" }}>Switch Strategy</label>
              <select
                value={selectedStrategy}
                onChange={(e) => {
                  setSelectedStrategy(e.target.value);
                  setMessage(null);
                }}
                className="w-full h-10 px-4 rounded-lg text-sm"
                style={{
                  background: "var(--theme-popup-field-bg)",
                  color: "var(--theme-popup-text)",
                  border: "1px solid var(--theme-popup-field-border)",
                  outline: "none",
                }}
              >
                {availableStrategies.map((s) => (
                  <option key={s} value={s} style={{ background: "var(--theme-popup-bg)", color: "var(--theme-popup-text)" }}>
                    {getDisplayName(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || selectedStrategy === activeStrategy}
              className="w-full h-10 rounded-lg text-sm font-semibold transition"
              style={{
                background: selectedStrategy === activeStrategy
                  ? "var(--theme-popup-field-bg)"
                  : "var(--theme-popup-border)",
                color: selectedStrategy === activeStrategy
                  ? "var(--theme-popup-label)"
                  : "#fff",
                cursor: selectedStrategy === activeStrategy ? "not-allowed" : "pointer",
                border: selectedStrategy === activeStrategy
                  ? "1px solid var(--theme-popup-field-border)"
                  : "none",
              }}
            >
              {saving ? "Saving..." : selectedStrategy === activeStrategy ? "No Change" : "Save"}
            </button>

            {/* Status message */}
            {message && (
              <div
                className="mt-3 text-xs px-3 py-2 rounded-lg text-center font-medium"
                style={{
                  background: message.type === "success" ? "rgba(10,155,63,0.1)" : "rgba(209,43,43,0.1)",
                  color: message.type === "success" ? "var(--theme-status-success)" : "var(--theme-status-loss)",
                }}
              >
                {message.text}
              </div>
            )}

            {/* Separator */}
            <div className="my-6" style={{ borderTop: "1px solid var(--theme-popup-field-border)" }}></div>

            {/* Theme selector */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium" style={{ color: "var(--theme-popup-label)" }}>Color Theme</label>
                <Palette size={14} style={{ color: "var(--theme-popup-border)" }} />
              </div>
              <div className="flex items-center gap-4">
                {[
                  { value: "default" as const, label: "Default", color: "#323335" },
                  { value: "blue" as const, label: "Blue", color: "#164c8e" },
                  { value: "brown" as const, label: "Brown", color: "#570101" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: t.color,
                        border: theme === t.value ? "3px solid var(--theme-popup-border)" : "2px solid var(--theme-popup-field-border)",
                        boxShadow: theme === t.value ? "0 0 0 2px #fff inset" : "none",
                      }}
                    />
                    <span className="text-xs" style={{ color: "var(--theme-popup-text)", fontWeight: theme === t.value ? 700 : 400 }}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Separator */}
            <div className="my-6" style={{ borderTop: "1px solid var(--theme-popup-field-border)" }}></div>

            {/* Volume control */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium" style={{ color: "var(--theme-popup-label)" }}>Sound Volume</label>
                <span className="text-xs font-semibold" style={{ color: "var(--theme-popup-border)" }}>{Math.round(volume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolumeState(newVolume);
                    setVolume(newVolume);
                  }}
                  className="flex-1 h-2 rounded-lg cursor-pointer appearance-auto"
                  style={{
                    accentColor: "var(--theme-popup-border)",
                  }}
                />
                <button
                  onClick={() => playSound("enter")}
                  className="p-2 rounded-lg transition"
                  style={{ background: "var(--theme-popup-field-bg)", color: "var(--theme-popup-border)" }}
                  aria-label="Test sound"
                >
                  <Play size={16} />
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="my-6" style={{ borderTop: "1px solid var(--theme-popup-field-border)" }}></div>

            {/* Force Buy toggle */}
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: "var(--theme-popup-label)" }}>Force Buy Button</label>
                <button
                  type="button"
                  onClick={() => setForceBuyEnabled(!forceBuyEnabled)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: forceBuyEnabled ? "var(--theme-popup-border)" : "var(--theme-popup-field-border)",
                    position: "relative",
                    transition: "background 0.2s",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: forceBuyEnabled ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </button>
              </div>
              <div className="text-xs mt-1" style={{ color: forceBuyEnabled ? "var(--theme-status-success)" : "var(--theme-status-loss)" }}>
                {forceBuyEnabled ? "Enabled" : "Disabled (self-control mode)"}
              </div>
            </div>

            {/* Separator */}
            <div className="my-6" style={{ borderTop: "1px solid var(--theme-popup-field-border)" }}></div>

            {/* AI Guard section */}
            <div className="mb-5">
              {/* Section header with master toggle */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield size={18} style={{ color: "var(--theme-popup-border)" }} />
                  <h3 className="text-sm font-bold" style={{ color: "var(--theme-popup-text)" }}>AI Guard</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAiGuardEnabled(!aiGuardEnabled)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: aiGuardEnabled ? "var(--theme-popup-border)" : "var(--theme-popup-field-border)",
                    position: "relative",
                    transition: "background 0.2s",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: aiGuardEnabled ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </button>
              </div>

              <div className="text-xs mb-3" style={{ color: aiGuardEnabled ? "var(--theme-status-success)" : "var(--theme-popup-label)" }}>
                {aiGuardEnabled ? (aiApiKey ? "Active" : "Enabled but no API key — add key to activate") : "Disabled"}
              </div>

              {aiGuardEnabled && (
                <div style={{ padding: 16, borderRadius: 5, background: "rgba(255,255,255,0.5)", border: "1px solid #ddd", boxShadow: "0 0 3px rgba(0,0,0,0.1)" }}>
                  {/* Entry Guard toggle */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <div className="relative flex items-center gap-1.5">
                        <label className="text-xs font-medium" style={{ color: "var(--theme-popup-text)" }}>Enable EntryGuard</label>
                        <button
                          type="button"
                          onClick={() => setIsEntryGuardInfoOpen((prev) => !prev)}
                          className="flex h-5 w-5 items-center justify-center rounded-full border text-gray-500 hover:text-gray-700"
                          style={{ borderColor: "var(--theme-popup-field-border)" }}
                          aria-label="EntryGuard info"
                        >
                          <HelpCircle className="h-3 w-3" />
                        </button>
                        {isEntryGuardInfoOpen && (
                          <div
                            className="absolute left-0 top-7 w-60 rounded-md p-2 shadow-lg"
                            style={{ zIndex: 9, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "11px", lineHeight: "18px" }}
                          >
                            Blocks UT bot BUY when market is sideways. Prevents bad entries before they happen.
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiEntryGuardEnabled(!aiEntryGuardEnabled)}
                        style={{
                          width: 36,
                          height: 20,
                          borderRadius: 10,
                          background: aiEntryGuardEnabled ? "var(--theme-popup-border)" : "var(--theme-popup-field-border)",
                          position: "relative",
                          transition: "background 0.2s",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: aiEntryGuardEnabled ? 19 : 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#fff",
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Auto-execute exits toggle */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <div className="relative flex items-center gap-1.5">
                        <label className="text-xs font-medium" style={{ color: "var(--theme-popup-text)" }}>Auto-execute exits</label>
                        <button
                          type="button"
                          onClick={() => setIsAutoExitInfoOpen((prev) => !prev)}
                          className="flex h-5 w-5 items-center justify-center rounded-full border text-gray-500 hover:text-gray-700"
                          style={{ borderColor: "var(--theme-popup-field-border)" }}
                          aria-label="Auto-exit info"
                        >
                          <HelpCircle className="h-3 w-3" />
                        </button>
                        {isAutoExitInfoOpen && (
                          <div
                            className="absolute left-0 top-7 w-60 rounded-md p-2 shadow-lg"
                            style={{ zIndex: 9, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "11px", lineHeight: "18px" }}
                          >
                            When OFF, AI only shows exit suggestions. When ON, AI exits the trade automatically when it detects sideways or reversal conditions.
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiAutoExitEnabled(!aiAutoExitEnabled)}
                        style={{
                          width: 36,
                          height: 20,
                          borderRadius: 10,
                          background: aiAutoExitEnabled ? "var(--theme-popup-border)" : "var(--theme-popup-field-border)",
                          position: "relative",
                          transition: "background 0.2s",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: aiAutoExitEnabled ? 19 : 2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#fff",
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Confidence threshold slider */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="relative flex items-center gap-1.5">
                        <label className="text-xs font-medium" style={{ color: "var(--theme-popup-text)" }}>Confidence threshold</label>
                        <button
                          type="button"
                          onClick={() => setIsConfidenceInfoOpen((prev) => !prev)}
                          className="flex h-5 w-5 items-center justify-center rounded-full border text-gray-500 hover:text-gray-700"
                          style={{ borderColor: "var(--theme-popup-field-border)" }}
                          aria-label="Confidence threshold info"
                        >
                          <HelpCircle className="h-3 w-3" />
                        </button>
                        {isConfidenceInfoOpen && (
                          <div
                            className="absolute left-0 top-7 w-60 rounded-md p-2 shadow-lg"
                            style={{ zIndex: 9, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "11px", lineHeight: "18px" }}
                          >
                            AI returns a confidence score (0-100). The app only acts on suggestions when confidence is at or above this threshold. Higher = fewer false positives.
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "var(--theme-popup-border)" }}>{aiConfidenceThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="95"
                      step="5"
                      value={aiConfidenceThreshold}
                      onChange={(e) => setAiConfidenceThreshold(parseInt(e.target.value, 10))}
                      className="w-full h-2 rounded-lg cursor-pointer"
                      style={{ accentColor: "var(--theme-popup-border)" }}
                    />
                  </div>

                  {/* Candles count input */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="relative flex items-center gap-1.5">
                        <label className="text-xs font-medium" style={{ color: "var(--theme-popup-text)" }}>Candles for analysis</label>
                        <button
                          type="button"
                          onClick={() => setIsCandlesInfoOpen((prev) => !prev)}
                          className="flex h-5 w-5 items-center justify-center rounded-full border text-gray-500 hover:text-gray-700"
                          style={{ borderColor: "var(--theme-popup-field-border)" }}
                          aria-label="Candles count info"
                        >
                          <HelpCircle className="h-3 w-3" />
                        </button>
                        {isCandlesInfoOpen && (
                          <div
                            className="absolute left-0 top-7 w-60 rounded-md p-2 shadow-lg"
                            style={{ zIndex: 9, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "11px", lineHeight: "18px" }}
                          >
                            Number of 1-minute candles sent to AI for analysis. More candles = better context but slower response. 240 candles = 4 hours of price action.
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        min="60"
                        max="500"
                        step="10"
                        value={aiCandlesCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) setAiCandlesCount(Math.min(500, Math.max(60, val)));
                        }}
                        className="w-16 h-7 px-2 rounded-lg text-xs text-center"
                        style={{
                          background: "var(--theme-popup-field-bg)",
                          color: "var(--theme-popup-text)",
                          border: "1px solid var(--theme-popup-field-border)",
                        }}
                      />
                    </div>
                  </div>

                  {/* AI Provider dropdown */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="relative flex items-center gap-1.5">
                        <label className="text-xs font-medium" style={{ color: "var(--theme-popup-text)" }}>AI Provider</label>
                        <button
                          type="button"
                          onClick={() => setIsProviderInfoOpen((prev) => !prev)}
                          className="flex h-5 w-5 items-center justify-center rounded-full border text-gray-500 hover:text-gray-700"
                          style={{ borderColor: "var(--theme-popup-field-border)" }}
                          aria-label="AI Provider info"
                        >
                          <HelpCircle className="h-3 w-3" />
                        </button>
                        {isProviderInfoOpen && (
                          <div
                            className="absolute left-0 top-7 w-60 rounded-md p-2 shadow-lg"
                            style={{ zIndex: 9, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "11px", lineHeight: "18px" }}
                          >
                            Groq is free and fast. Gemini has a free tier with lower limits. Claude is paid but offers higher reasoning quality.
                          </div>
                        )}
                      </div>
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline"
                        style={{ color: "var(--theme-popup-border)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Get API key ↗
                      </a>
                    </div>
                    <select
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg text-xs"
                      style={{
                        background: "var(--theme-popup-field-bg)",
                        color: "var(--theme-popup-text)",
                        border: "1px solid var(--theme-popup-field-border)",
                        outline: "none",
                      }}
                    >
                      <option value="groq" style={{ background: "var(--theme-popup-bg)", color: "var(--theme-popup-text)" }}>Groq — Llama 3.3 70B (free)</option>
                      <option value="gemini" style={{ background: "var(--theme-popup-bg)", color: "var(--theme-popup-text)" }}>Google Gemini Flash (free)</option>
                      <option value="claude" style={{ background: "var(--theme-popup-bg)", color: "var(--theme-popup-text)" }}>Claude Haiku (paid)</option>
                    </select>
                  </div>

                  {/* API Key input */}
                  <div>
                    <div className="relative flex items-center gap-1.5 mb-1.5">
                      <label className="text-xs font-medium" style={{ color: "var(--theme-popup-text)" }}>AI API Key</label>
                      <button
                        type="button"
                        onClick={() => setIsApiKeyInfoOpen((prev) => !prev)}
                        className="flex h-5 w-5 items-center justify-center rounded-full border text-gray-500 hover:text-gray-700"
                        style={{ borderColor: "var(--theme-popup-field-border)" }}
                        aria-label="API Key info"
                      >
                        <HelpCircle className="h-3 w-3" />
                      </button>
                      {isApiKeyInfoOpen && (
                        <div
                          className="absolute left-0 top-7 w-60 rounded-md p-2 shadow-lg"
                          style={{ zIndex: 9, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "11px", lineHeight: "18px" }}
                        >
                          Your API key is stored locally in your browser. Get one from the provider console. Without a key, AI Guard will be enabled but inactive.
                        </div>
                      )}
                    </div>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Paste your Groq API key here"
                      className="w-full h-9 px-3 rounded-lg text-xs"
                      style={{
                        background: "var(--theme-popup-field-bg)",
                        color: "var(--theme-popup-text)",
                        border: "1px solid var(--theme-popup-field-border)",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
