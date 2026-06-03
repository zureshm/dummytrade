"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import styles from "./page.module.scss";

const STRATEGY_URL = process.env.NEXT_PUBLIC_STRATEGY_URL || "http://localhost:4000";

// Friendly display names for strategy script names — edit these as needed
const STRATEGY_DISPLAY_NAMES: Record<string, string> = {
  evaluateEMACross: "EMA Crossover",
  surStrategy: "Sur Strategy",
  chatGptStrategy: "ChatGPT Strategy",
  claudSurStrategy: "Claude Sur Strategy",
  utGptStrategy: "UT GPT",
  utGptStrategy1: "UT GPT v1",
  utGptStrategy2: "UT GPT v2",
  utGptStrategy3: "UT GPT v3",
  superDoubleUT: "Super Double UT",
  superUTBotStrategy: "Super UT Bot",
  doubleUTBotStrategy: "Double UT Bot",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="relative w-[340px] rounded-xl p-5"
        style={{
          background: "var(--theme-card-bg, #1a1a2e)",
          color: "var(--theme-card-white, #fff)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Loading...</div>
        ) : (
          <>
            {/* Current strategy */}
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Current Running Strategy</div>
              <div className="text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }}>
                {getDisplayName(activeStrategy)}
              </div>
            </div>

            {/* Strategy selector */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Switch Strategy</label>
              <select
                value={selectedStrategy}
                onChange={(e) => {
                  setSelectedStrategy(e.target.value);
                  setMessage(null);
                }}
                className="w-full h-9 px-3 rounded-lg text-sm"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--theme-card-white, #fff)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  outline: "none",
                }}
              >
                {availableStrategies.map((s) => (
                  <option key={s} value={s} style={{ background: "#1a1a2e", color: "#fff" }}>
                    {getDisplayName(s)}
                  </option>
                ))}
              </select>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || selectedStrategy === activeStrategy}
              className="w-full h-9 rounded-lg text-sm font-semibold transition"
              style={{
                background: selectedStrategy === activeStrategy ? "rgba(255,255,255,0.06)" : "#22c55e",
                color: selectedStrategy === activeStrategy ? "rgba(255,255,255,0.35)" : "#fff",
                cursor: selectedStrategy === activeStrategy ? "not-allowed" : "pointer",
                border: "none",
              }}
            >
              {saving ? "Saving..." : selectedStrategy === activeStrategy ? "No Change" : "Save"}
            </button>

            {/* Status message */}
            {message && (
              <div
                className="mt-3 text-xs px-3 py-2 rounded-lg text-center"
                style={{
                  background: message.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: message.type === "success" ? "#22c55e" : "#ef4444",
                }}
              >
                {message.text}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
