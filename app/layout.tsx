import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TradeStoreProvider } from "./store/TradeStore";
import { WatchlistProvider } from "./store/WatchlistContext";
import { StrategyTimerProvider } from "./components/StrategyTimerProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import AppShell from "./components/AppShell";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SurAlgoApp",
  description: "SurAlgo Trading Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <TradeStoreProvider>
            <StrategyTimerProvider>
              <WatchlistProvider>
                <AppShell>{children}</AppShell>
              </WatchlistProvider>
            </StrategyTimerProvider>
          </TradeStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
