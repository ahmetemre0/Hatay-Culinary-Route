import { useState } from "react";
import { motion } from "framer-motion";
import { MarketArea } from "../components/MarketArea";
import { PlayerHand } from "../components/PlayerHand";
import { Scoreboard } from "../components/Scoreboard";
import { GameLog } from "../components/GameLog";
import { EventModal } from "../components/EventModal";
import { useGameStore } from "../store/gameStore";
import { cn } from "@/lib/utils";

type MobileTab = "market" | "scores" | "log" | "hand";

export function GamePage() {
  const {
    players,
    currentPlayerIndex,
    resetGame,
    drawDeck,
  } = useGameStore();

  const [mobileTab, setMobileTab] = useState<MobileTab>("market");
  const current = players[currentPlayerIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-amber-950 to-red-950 p-3 flex flex-col">
      <EventModal />

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗺️</span>
          <div>
            <h1 className="text-white font-bold text-sm leading-none">Hatay Gastronomi Rotası</h1>
            <p className="text-amber-400 text-xs">{current?.name}'ın sırası</p>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={resetGame}
            className="px-3 py-2 rounded-xl text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 transition-all"
          >
            ↩ Yeniden
          </motion.button>
        </div>
      </div>

      {/* Mobile portrait layout */}
      <div className="flex sm:hidden flex-col flex-1 gap-2">
        <div className="flex gap-1 bg-black/30 rounded-xl p-1">
          {(["market", "scores", "log", "hand"] as MobileTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                mobileTab === tab ? "bg-amber-500 text-black" : "text-white/50 hover:text-white/80"
              )}
            >
              {tab === "market" ? "🍽️ Sipariş" : tab === "scores" ? "🏆 Puan" : tab === "log" ? "📜 Günlük" : "🃏 El"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {mobileTab === "market" && (
            <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3 border border-white/10 flex items-center justify-center">
              <MarketArea />
            </div>
          )}
          {mobileTab === "scores" && <Scoreboard />}
          {mobileTab === "log" && <GameLog />}
          {mobileTab === "hand" && <PlayerHand />}
        </div>

        {mobileTab !== "hand" && (
          <div className="pb-1">
            <div className="inline-flex gap-4 bg-black/30 rounded-2xl px-4 py-2 border border-white/10 w-full justify-center">
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wider">Deste</div>
                <div className="text-white font-bold text-sm">{drawDeck.length}</div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wider">El</div>
                <div className="text-white font-bold text-sm">{current?.hand.length ?? 0}</div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wider">Puan</div>
                <div className="text-yellow-300 font-bold text-sm">⭐ {current?.points ?? 0}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop landscape layout */}
      <div className="hidden sm:flex flex-col lg:flex-row gap-3 flex-1">
        <div className="lg:w-56 flex flex-col gap-3">
          <Scoreboard />
          <GameLog />
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex-1 flex items-center justify-center">
            <MarketArea />
          </div>

          <div>
            <PlayerHand />
          </div>

          <div className="text-center">
            <div className="inline-flex gap-4 bg-black/30 rounded-2xl px-6 py-2.5 border border-white/10">
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wider">Deste</div>
                <div className="text-white font-bold text-sm">{drawDeck.length}</div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wider">El</div>
                <div className="text-white font-bold text-sm">{current?.hand.length ?? 0}</div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wider">Puan</div>
                <div className="text-yellow-300 font-bold text-sm">⭐ {current?.points ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-white/20 text-xs hidden sm:block">
        Kart çek → Malzemeleri seç → Bölge kartına tıkla → Sırayı bitir
      </div>
    </div>
  );
}
