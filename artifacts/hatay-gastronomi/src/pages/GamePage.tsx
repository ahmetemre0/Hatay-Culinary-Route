import { motion } from "framer-motion";
import { MarketArea } from "../components/MarketArea";
import { PlayerHand } from "../components/PlayerHand";
import { Scoreboard } from "../components/Scoreboard";
import { GameLog } from "../components/GameLog";
import { EventModal } from "../components/EventModal";
import { useGameStore } from "../store/gameStore";
import { cn } from "@/lib/utils";

export function GamePage() {
  const {
    players,
    currentPlayerIndex,
    endTurn,
    resetGame,
    hasDrawnThisTurn,
    canEndTurn,
    drawDeck,
    phase,
  } = useGameStore();

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
            onClick={endTurn}
            disabled={!canEndTurn && !hasDrawnThisTurn}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              hasDrawnThisTurn
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "bg-white/10 text-white/40 cursor-not-allowed"
            )}
          >
            Sırayı Bitir →
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={resetGame}
            className="px-3 py-2 rounded-xl text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 transition-all"
          >
            ↩ Yeniden
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-1">
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

      <div className="mt-2 text-center text-white/20 text-xs">
        Kart çek → Malzemeleri seç → Bölge kartına tıkla → Sırayı bitir
      </div>
    </div>
  );
}
