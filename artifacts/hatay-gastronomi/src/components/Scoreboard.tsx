import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { GameCard } from "./GameCard";
import { cn } from "@/lib/utils";

export function Scoreboard() {
  const { players, currentPlayerIndex, victoryPoints } = useGameStore();

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/10 space-y-4">
      <h3 className="text-white font-semibold text-sm text-center uppercase tracking-wider">
        🏆 Puan Tablosu
      </h3>

      <div className="space-y-3">
        {[...players]
          .sort((a, b) => b.points - a.points)
          .map((player, rank) => {
            const isActive = players[currentPlayerIndex]?.id === player.id;
            const progress = Math.min((player.points / victoryPoints) * 100, 100);

            return (
              <motion.div
                key={player.id}
                animate={{ scale: isActive ? 1.02 : 1 }}
                className={cn(
                  "rounded-xl p-3 border transition-all",
                  isActive
                    ? "border-yellow-400 bg-yellow-400/10"
                    : "border-white/10 bg-white/5"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "👤"}
                    </span>
                    <span
                      className={cn(
                        "font-medium text-sm",
                        isActive ? "text-yellow-300" : "text-white/90"
                      )}
                    >
                      {player.name}
                      {isActive && (
                        <span className="ml-1 text-xs animate-pulse">◀ sıra</span>
                      )}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-bold",
                      isActive ? "text-yellow-300" : "text-white"
                    )}
                  >
                    ⭐ {player.points}
                  </span>
                </div>

                <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                  />
                </div>

                <div className="text-[10px] text-white/50">
                  {player.scoredRegions.length} bölge tamamlandı
                  {player.skippedNextTurn && (
                    <span className="ml-1 text-red-400">⏸ atlanacak</span>
                  )}
                </div>

                {player.scoredRegions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {player.scoredRegions.slice(-4).map((r) => (
                      <span
                        key={r.id + "-scored"}
                        className="text-xs bg-white/10 rounded px-1 py-0.5 text-white/70 flex items-center gap-0.5"
                      >
                        {r.emoji} {r.name}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
      </div>

      <div className="text-center text-white/40 text-xs">
        Hedef: {victoryPoints} puan
      </div>
    </div>
  );
}
