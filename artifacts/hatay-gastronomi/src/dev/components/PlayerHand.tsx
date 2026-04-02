import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameCard } from "./GameCard";
import { useGameStore } from "../store/gameStore";
import { Card, MaterialCard, MaterialType } from "../data/cards";
import { cn } from "@/lib/utils";

function getCompletableCardIds(hand: Card[], required: MaterialType[]): string[] | null {
  const mats = hand.filter((c): c is MaterialCard => c.type === "material");
  const req = [...required];
  const used: MaterialCard[] = [];
  const pool = [...mats];
  for (const r of req) {
    const exact = pool.findIndex((m) => m.materialType === r);
    if (exact !== -1) { used.push(pool[exact]); pool.splice(exact, 1); continue; }
    const joker = pool.findIndex((m) => m.materialType === "Joker");
    if (joker !== -1) { used.push(pool[joker]); pool.splice(joker, 1); continue; }
    return null;
  }
  return used.map((c) => c.id);
}

export function PlayerHand() {
  const {
    players,
    currentPlayerIndex,
    selectedCards,
    selectCard,
    useEventCard,
    phase,
    hasDrawnThisTurn,
    endTurn,
    marketFoods,
  } = useGameStore();

  const current = players[currentPlayerIndex];
  if (!current) return null;

  const completableIds = new Set<string>();
  for (const food of marketFoods) {
    const ids = getCompletableCardIds(current.hand, food.requiredMaterials);
    if (ids) ids.forEach((id) => completableIds.add(id));
  }

  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [handOrder, setHandOrder] = useState<string[]>(() => current.hand.map(c => c.id));
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragCardIdRef = useRef<string | null>(null);
  const wasDraggingRef = useRef(false);

  useEffect(() => {
    const handIds = current.hand.map(c => c.id);
    setHandOrder(prev => {
      const kept = prev.filter(id => handIds.includes(id));
      const added = handIds.filter(id => !prev.includes(id));
      return [...kept, ...added];
    });
  }, [current.hand]);

  const sortedHand = handOrder
    .map(id => current.hand.find(c => c.id === id))
    .filter(Boolean) as Card[];

  const handleCardClick = (card: Card) => {
    if (wasDraggingRef.current) return;
    if (phase !== "playing") return;
    if (card.type === "event") { useEventCard(card.id); return; }
    selectCard(card.id);
  };

  const startLongPress = (card: Card, pointerId: number, target: HTMLElement) => {
    longPressTimerRef.current = setTimeout(() => {
      dragCardIdRef.current = card.id;
      wasDraggingRef.current = true;
      setIsDragging(true);
      try { target.setPointerCapture(pointerId); } catch {}
      if (navigator.vibrate) navigator.vibrate(30);
    }, 320);
  };

  const handlePointerDown = (card: Card, e: React.PointerEvent<HTMLDivElement>) => {
    setHoveredCardId(card.id);
    startLongPress(card, e.pointerId, e.currentTarget);
  };

  const handlePointerMove = (card: Card, e: React.PointerEvent<HTMLDivElement>) => {
    if (dragCardIdRef.current !== card.id || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const total = handOrder.length;
    const spacing = 65;
    const center = total / 2;
    let targetIdx = Math.round(relX / spacing + center - 0.5);
    targetIdx = Math.max(0, Math.min(total - 1, targetIdx));
    const curIdx = handOrder.indexOf(card.id);
    if (curIdx !== -1 && curIdx !== targetIdx) {
      setHandOrder(prev => {
        const next = [...prev];
        next.splice(curIdx, 1);
        next.splice(targetIdx, 0, card.id);
        return next;
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    setHoveredCardId(null);
    setIsDragging(false);
    dragCardIdRef.current = null;
    setTimeout(() => { wasDraggingRef.current = false; }, 100);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragCardIdRef.current) {
      setHoveredCardId(null);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">
          🃏 Elin ({current.hand.length} kart)
        </h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/50">
            {isDragging && (
              <span className="text-purple-300">↔ Sürüklemeye devam et</span>
            )}
            {!isDragging && current.hand.filter((c) => c.type === "event").length > 0 && (
              <span className="text-yellow-300">⚡ Olay kartına bas → hemen kullan</span>
            )}
            {!isDragging && current.hand.filter((c) => c.type === "material").length > 0 && !hasDrawnThisTurn && (
              <span className="text-blue-300 ml-2">Önce kart çek 👆</span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={endTurn}
            disabled={!hasDrawnThisTurn}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              hasDrawnThisTurn
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            )}
          >
            Sırayı Bitir →
          </motion.button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative h-48 flex items-end justify-center"
        style={{ touchAction: isDragging ? "none" : "auto" }}
      >
        <AnimatePresence>
          {sortedHand.map((card, idx) => {
            const isSelected = selectedCards.includes(card.id);
            const isEvent = card.type === "event";
            const isCompletable = completableIds.has(card.id);
            const isHovered = hoveredCardId === card.id;
            const isBeingDragged = dragCardIdRef.current === card.id;
            const totalCards = sortedHand.length;
            const angleSpread = Math.min(totalCards * 8, 60);
            const centerIdx = totalCards / 2;
            const cardAngle = (idx - centerIdx + 0.5) * (angleSpread / Math.max(totalCards - 1, 1));
            const cardSpacing = 65;
            const baseX = (idx - centerIdx + 0.5) * cardSpacing;

            let hoverXOffset = 0;
            if (hoveredCardId) {
              const hoveredIdx = sortedHand.findIndex(c => c.id === hoveredCardId);
              if (!isHovered) {
                hoverXOffset = idx < hoveredIdx ? -60 : 60;
              }
            }

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 80, rotateZ: -45, rotateY: 90 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotateZ: (isHovered || isBeingDragged) ? 0 : cardAngle,
                  rotateY: 0,
                  x: baseX + hoverXOffset,
                  scale: isBeingDragged ? 1.15 : isHovered ? 1.1 : 1,
                  zIndex: isBeingDragged ? 60 : isHovered ? 50 : idx,
                }}
                exit={{ opacity: 0, y: -120, scale: 0.5, rotateZ: 20 }}
                transition={{
                  duration: 0.35,
                  delay: isDragging ? 0 : idx * 0.05,
                  ease: "easeOut",
                  exit: { duration: 0.4, ease: "easeIn" },
                  x: { duration: isDragging ? 0.15 : 0.3, ease: "easeOut" },
                }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 cursor-pointer"
                style={{ perspective: 1000 }}
                onMouseEnter={() => !isDragging && setHoveredCardId(card.id)}
                onMouseLeave={() => !isDragging && setHoveredCardId(null)}
                onPointerDown={(e) => handlePointerDown(card, e)}
                onPointerMove={(e) => handlePointerMove(card, e)}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerLeave={handlePointerLeave}
              >
                <GameCard
                  card={card}
                  selected={isSelected}
                  onClick={() => handleCardClick(card)}
                  disabled={phase !== "playing"}
                />
                {isBeingDragged && (
                  <div className="absolute inset-0 rounded-xl ring-2 ring-purple-400 ring-offset-1 ring-offset-transparent pointer-events-none" />
                )}
                {isEvent && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    ⚡
                  </span>
                )}
                {isCompletable && !isSelected && !isBeingDragged && (
                  <span className="absolute -top-1 -left-1 bg-green-400 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                    ✓
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

      {isDragging && (
        <div className="mt-2 text-center text-purple-300/70 text-xs animate-pulse">
          Kartı sürükleyerek yerini değiştir
        </div>
      )}
      {!isDragging && selectedCards.length > 0 && (
        <div className="mt-2 text-center text-yellow-300 text-xs">
          {selectedCards.length} malzeme seçildi — şimdi sipariş kartına tıkla!
        </div>
      )}
    </div>
  );
}
