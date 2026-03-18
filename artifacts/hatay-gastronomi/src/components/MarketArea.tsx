import { motion, AnimatePresence } from "framer-motion";
import { GameCard } from "./GameCard";
import { useGameStore } from "../store/gameStore";
import { cn } from "@/lib/utils";

export function MarketArea() {
  const {
    marketRegions,
    drawDeck,
    regionDeck,
    discardPile,
    drawCard,
    tryComplete,
    players,
    currentPlayerIndex,
    phase,
    hasDrawnThisTurn,
    cookingAnimation,
    doubledMarketRegionId,
  } = useGameStore();

  const current = players[currentPlayerIndex];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 justify-center items-start flex-wrap">
        <div className="flex flex-col items-center gap-2">
          <div className="text-white/60 text-xs font-medium uppercase tracking-wider">Deste</div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={phase === "playing" && !hasDrawnThisTurn ? drawCard : undefined}
            className={cn(
              "w-28 h-40 rounded-xl border-2 bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
              !hasDrawnThisTurn && phase === "playing"
                ? "border-blue-400 shadow-lg shadow-blue-500/30 hover:border-blue-300"
                : "border-white/20 opacity-60 cursor-not-allowed"
            )}
          >
            <span className="text-4xl">🎴</span>
            <span className="text-white/70 text-xs">{drawDeck.length} kart</span>
            {!hasDrawnThisTurn && phase === "playing" && (
              <span className="text-blue-300 text-[10px] font-medium animate-pulse">Çek!</span>
            )}
          </motion.div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-white/60 text-xs font-medium uppercase tracking-wider text-center">
            🗺️ Pazar Alanı
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <AnimatePresence>
              {marketRegions.map((region) => {
                const isDoubled = doubledMarketRegionId === region.id;
                return (
                  <motion.div
                    key={region.id}
                    initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: -40 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="relative"
                  >
                    <GameCard
                      card={region}
                      onClick={() => tryComplete(region.id)}
                      disabled={phase !== "playing" || current?.blockedFromRegion}
                      className={cn(
                        cookingAnimation === region.id && "ring-4 ring-yellow-400 ring-offset-2",
                        isDoubled && "ring-4 ring-green-400 ring-offset-2 ring-offset-transparent"
                      )}
                    />

                    {isDoubled && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-green-400 text-black text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-lg z-10"
                      >
                        2x
                      </motion.div>
                    )}

                    {cookingAnimation === region.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1.3 }}
                        exit={{ opacity: 0, scale: 2 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      >
                        <span className="text-6xl">🍽️</span>
                      </motion.div>
                    )}

                    <div className="mt-1 text-center text-[10px] text-white/60">
                      {region.requiredMaterials.join(" + ")}
                      {isDoubled && (
                        <span className="ml-1 text-green-400 font-bold">
                          → ⭐{region.points * 2}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {marketRegions.length === 0 && regionDeck.length === 0 && (
                <div className="w-56 h-40 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 text-sm">
                  Bölge kalmadı
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-white/60 text-xs font-medium uppercase tracking-wider">Çöp</div>
          <div className="w-28 h-40 rounded-xl border-2 border-white/10 bg-black/20 flex flex-col items-center justify-center gap-2">
            <span className="text-3xl opacity-40">🗑️</span>
            <span className="text-white/40 text-xs">{discardPile.length} kart</span>
          </div>
        </div>
      </div>

      {current?.blockedFromRegion && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-orange-400 text-xs font-medium bg-orange-950/40 border border-orange-500/30 rounded-xl py-1.5"
        >
          ☀️ Sıcak Hava Dalgası — Bu tur bölge tamamlayamazsın!
        </motion.div>
      )}

      <div className="text-center text-white/50 text-xs">
        Bölge Destesi: {regionDeck.length} kart kaldı
      </div>
    </div>
  );
}
