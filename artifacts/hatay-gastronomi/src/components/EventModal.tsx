import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { EventCard } from "../data/cards";
import { cn } from "@/lib/utils";

export function EventModal() {
  const {
    phase,
    pendingEvent,
    players,
    currentPlayerIndex,
    resolveEvent,
    cancelEvent,
    selectedCards,
    selectCard,
  } = useGameStore();

  if (phase !== "event_pending" || !pendingEvent) return null;

  const cur = players[currentPlayerIndex];
  const others = players.filter((p) => p.id !== cur.id);
  const card = pendingEvent as EventCard;

  const needsTarget = card.action === "skip_turn" || card.action === "steal_card" || card.action === "trade_two";

  const handleTargetSelect = (targetId: number) => {
    if (card.action === "trade_two") {
      if (selectedCards.length < 2) return;
      resolveEvent(targetId, selectedCards);
    } else {
      resolveEvent(targetId);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.8, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 40 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 max-w-md w-full border border-white/20 shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">{card.emoji}</div>
            <h2 className="text-white text-xl font-bold">{card.effectName}</h2>
            <p className="text-white/70 text-sm mt-1">{card.description}</p>
          </div>

          {needsTarget && (
            <div className="space-y-3">
              <h3 className="text-white/60 text-xs uppercase tracking-wider text-center mb-3">
                Hedef Oyuncu Seç
              </h3>

              {card.action === "trade_two" && (
                <div className="mb-4">
                  <p className="text-yellow-300 text-xs text-center mb-2">
                    Önce elinden 2 kart seç:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {cur.hand
                      .filter((c) => c.type === "material")
                      .map((c) => (
                        <motion.button
                          key={c.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => selectCard(c.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            selectedCards.includes(c.id)
                              ? "bg-yellow-400 text-black"
                              : "bg-white/10 text-white/70 hover:bg-white/20"
                          )}
                        >
                          {(c as any).emoji} {(c as any).materialType}
                        </motion.button>
                      ))}
                  </div>
                </div>
              )}

              {others.map((player) => (
                <motion.button
                  key={player.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTargetSelect(player.id)}
                  disabled={card.action === "trade_two" && selectedCards.length < 2}
                  className={cn(
                    "w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-3 flex items-center justify-between transition-all border border-white/10 hover:border-white/30"
                  )}
                >
                  <span className="text-white font-medium">{player.name}</span>
                  <span className="text-white/50 text-sm">
                    {player.hand.length} kart · ⭐ {player.points} puan
                  </span>
                </motion.button>
              ))}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={cancelEvent}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl py-2 text-sm transition-all"
            >
              İptal
            </motion.button>
            {!needsTarget && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => resolveEvent()}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl py-2 text-sm transition-all"
              >
                Kullan!
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
