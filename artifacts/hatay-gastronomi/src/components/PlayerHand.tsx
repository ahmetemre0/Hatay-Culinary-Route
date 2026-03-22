import { motion, AnimatePresence } from "framer-motion";
import { GameCard } from "./GameCard";
import { useGameStore } from "../store/gameStore";
import { Card, EventCard, MaterialCard } from "../data/cards";

export function PlayerHand() {
  const {
    players,
    currentPlayerIndex,
    selectedCards,
    selectCard,
    useEventCard,
    phase,
    hasDrawnThisTurn,
  } = useGameStore();

  const current = players[currentPlayerIndex];
  if (!current) return null;

  const handleCardClick = (card: Card) => {
    if (phase !== "playing") return;
    if (card.type === "event") {
      useEventCard(card.id);
      return;
    }
    selectCard(card.id);
  };

  const getCardLabel = (card: Card) => {
    if (card.type === "material") return (card as MaterialCard).name;
    if (card.type === "event") return (card as EventCard).effectName;
    return "Bölge";
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">
          🃏 Elin ({current.hand.length} kart)
        </h3>
        <div className="text-xs text-white/50">
          {current.hand.filter((c) => c.type === "event").length > 0 && (
            <span className="text-yellow-300">⚡ Olay kartına tıkla → hemen kullan</span>
          )}
          {current.hand.filter((c) => c.type === "material").length > 0 && !hasDrawnThisTurn && (
            <span className="text-blue-300 ml-2">Önce kart çek 👆</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap justify-center min-h-[10rem]">
        <AnimatePresence>
          {current.hand.map((card, idx) => {
            const isSelected = selectedCards.includes(card.id);
            const isEvent = card.type === "event";
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30, scale: 0.8 }}
                transition={{ delay: idx * 0.05 }}
                className="relative"
              >
                <GameCard
                  card={card}
                  selected={isSelected}
                  onClick={() => handleCardClick(card)}
                  disabled={phase !== "playing"}
                />
                {isEvent && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    ⚡
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {current.hand.length === 0 && (
          <div className="flex items-center justify-center w-full text-white/40 text-sm">
            Elin boş — kart çek!
          </div>
        )}
      </div>

      {selectedCards.length > 0 && (
        <div className="mt-2 text-center text-yellow-300 text-xs">
          {selectedCards.length} malzeme seçildi — şimdi sipariş kartına tıkla!
        </div>
      )}
    </div>
  );
}
