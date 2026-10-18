"use client";

import { UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function AccountDesktop() {
  const labelStyle = { color: "var(--theme-popup-label)", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
  const iconStyle = { color: "var(--theme-popup-border)" };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ padding: 16, color: "var(--theme-popup-text)" }}>
      <div className="flex items-center gap-2 mb-6">
        <UserCircle size={24} style={iconStyle} />
        <h2 className="text-xl font-bold">Account</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-6" style={{ scrollbarWidth: "thin" }}>
        <div className="space-y-6">
          <section>
            <div className="mb-4" style={labelStyle}>User Profile</div>
            <div className="p-4 rounded-xl border space-y-4" style={{ background: "var(--theme-popup-field-bg)", borderColor: "var(--theme-popup-field-border)" }}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-bold opacity-60 uppercase" style={{ fontSize: '10px' }}>Connection Status</span>
                  <Badge variant="success" className="font-black mt-1">CONNECTED</Badge>
                </div>
                <Button variant="destructive" size="sm" className="font-black">DISCONNECT</Button>
              </div>

              <div className="pt-2 border-t border-black/5">
                <div className="text-xs font-bold opacity-60 uppercase mb-1" style={{ fontSize: '10px' }}>User ID</div>
                <div className="text-lg font-black tracking-wider">SUR-1234X</div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4" style={labelStyle}>Financial Summary</div>
            <div className="p-4 rounded-xl border space-y-4" style={{ background: "var(--theme-popup-field-bg)", borderColor: "var(--theme-popup-field-border)" }}>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-bold opacity-70">Available Cash</span>
                <span className="text-lg font-black text-green-500">₹95,000</span>
              </div>
              <Separator className="opacity-10" />
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-bold opacity-70">Margin Used</span>
                <span className="text-lg font-black text-orange-500">₹12,500</span>
              </div>
              <Separator className="opacity-10" />
              <div className="flex justify-between items-center py-1">
                <span className="text-sm font-bold opacity-70">Available to Trade</span>
                <span className="text-lg font-black text-blue-500">₹82,500</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
