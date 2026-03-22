import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineStore } from "../store/onlineStore";
import { GameCard } from "../components/GameCard";
import { cn } from "@/lib/utils";
import { Card, EventCard, MaterialCard, FoodCard } from "../data/cards";

function ActionFeed() {
  const messages = useOnlineStore((s) => s.messages);
  const [shownIds, setShownIds] = useState<Set<number>>(new Set());
  const [toasts, setToasts] = useState<Array<{ id: number; text: string; type: string }>>([]);

  useEffect(() => {
    if (messages.length === 0) return undefined;
    const newest = messages[0];
    if (shownIds.has(newest.id)) return undefined;
    setShownIds((prev) => new Set([...prev, newest.id]));
    setToasts((prev) => [newest, ...prev].slice(0, 4));
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((m) => m.id !== newest.id));
    }, 4000);
    return () => clearTimeout(t);
  }, [messages]);

  return (
    <div className="fixed bottom-28 left-3 z-50 flex flex-col gap-2 w-64 pointer-events-none">
      <AnimatePresence>
        {toasts.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "px-4 py-2.5 rounded-xl text-sm shadow-xl backdrop-blur-sm border",
              msg.type === "success" && "bg-green-900/90 border-green-500/50 text-green-200",
              msg.type === "warning" && "bg-yellow-900/90 border-yellow-500/50 text-yellow-200",
              msg.type === "event" && "bg-purple-900/90 border-purple-500/50 text-purple-200",
              msg.type === "info" && "bg-slate-800/90 border-white/20 text-white/80"
            )}
          >
            {msg.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function OnlineEventModal() {
  const {
    onlinePhase,
    pendingEvent,
    players,
    myPlayerIndex,
    marketFoods,
    resolveEvent,
    cancelEvent,
    selectedCards,
    selectCard,
    myHand,
  } = useOnlineStore();

  if (onlinePhase !== "event_pending" || !pendingEvent) return null;

  const card = pendingEvent as EventCard;
  const needsTarget = card.action === "skip_turn" || card.action === "steal_card" || card.action === "trade_two" || card.action === "swap_all_cards";
  const needsMarketFood = card.action === "multiply_points";
  const others = players.filter((_, i) => i !== myPlayerIndex);

  const handleTargetSelect = (targetPlayerIdx: number) => {
    if (card.action === "trade_two") {
      if (selectedCards.length < 2) return;
      resolveEvent(targetPlayerIdx, selectedCards);
    } else {
      resolveEvent(targetPlayerIdx);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 40 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 max-w-sm w-full border border-white/20 shadow-2xl"
        >
          <div className="text-center mb-4">
            <div className="text-5xl mb-2">{card.emoji}</div>
            <h2 className="text-xl font-bold text-white">{card.effectName}</h2>
            <p className="text-white/60 text-sm mt-1">{card.description}</p>
          </div>

          {needsMarketFood && (
            <div className="space-y-2 mb-4">
              <p className="text-white/70 text-sm text-center">Hangi siparişin puanını 2x yapayım?</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {marketFoods.map((f) => (
                  <motion.button
                    key={f.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => resolveEvent(undefined, [f.id])}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 py-2 text-sm border border-white/10 hover:border-amber-400 transition-all"
                  >
                    {f.emoji} {f.name} (⭐{f.points})
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {needsTarget && (
            <div className="space-y-3 mb-4">
              {card.action === "trade_two" && (
                <div>
                  <p className="text-white/70 text-sm text-center mb-2">
                    Takas için 2 kartını seç ({selectedCards.length}/2):
                  </p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {myHand
                      .filter((c): c is MaterialCard => c.type === "material")
                      .map((c) => (
                        <motion.button
                          key={c.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => selectCard(c.id)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-xs border transition-all",
                            selectedCards.includes(c.id)
                              ? "bg-amber-500 text-black border-amber-400"
                              : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                          )}
                        >
                          {c.emoji} {c.materialType}
                        </motion.button>
                      ))}
                  </div>
                </div>
              )}

              <p className="text-white/70 text-sm text-center">Hedef oyuncu seç:</p>
              {others.map((player, i) => {
                const actualIdx = players.findIndex((p) => p.name === player.name);
                return (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleTargetSelect(actualIdx)}
                    disabled={card.action === "trade_two" && selectedCards.length < 2}
                    className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-3 flex items-center justify-between transition-all border border-white/10 hover:border-white/30"
                  >
                    <span className="text-white font-medium">{player.name}</span>
                    <span className="text-white/50 text-sm">
                      {player.cardCount} kart · ⭐ {player.points}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={cancelEvent}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white/70 rounded-xl py-2 text-sm transition-all"
            >
              İptal
            </motion.button>
            {!needsTarget && !needsMarketFood && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => resolveEvent()}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl py-2 text-sm"
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

function OtherPlayersArea() {
  const { players, myPlayerIndex, currentPlayerIndex } = useOnlineStore();

  const others = players
    .map((p, i) => ({ ...p, index: i }))
    .filter((p) => p.index !== myPlayerIndex);

  if (others.length === 0) return null;

  return (
    <div className="flex gap-3 flex-wrap justify-center">
      {others.map((player) => {
        const isActive = player.index === currentPlayerIndex;
        return (
          <motion.div
            key={player.index}
            animate={{ scale: isActive ? 1.02 : 1 }}
            className={cn(
              "bg-black/30 rounded-2xl p-3 border transition-all min-w-[140px]",
              isActive ? "border-amber-400 shadow-amber-400/20 shadow-lg" : "border-white/10"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-amber-400 animate-pulse" : "bg-white/30")} />
              <span className={cn("text-sm font-medium", isActive ? "text-amber-300" : "text-white/80")}>
                {player.name}
                {isActive && <span className="ml-1 text-xs">◀ sıra</span>}
              </span>
            </div>

            <div className="flex gap-1 flex-wrap justify-center min-h-[3rem] mb-2">
              {Array.from({ length: Math.min(player.cardCount, 8) }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="w-7 h-10 rounded-md bg-gradient-to-br from-slate-600 to-slate-800 border border-white/20 flex items-center justify-center text-xs"
                >
                  🎴
                </motion.div>
              ))}
              {player.cardCount > 8 && (
                <div className="text-white/40 text-xs self-center">+{player.cardCount - 8}</div>
              )}
              {player.cardCount === 0 && (
                <div className="text-white/30 text-xs self-center">Boş</div>
              )}
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-white/50">{player.cardCount} kart</span>
              <span className="text-yellow-300 font-bold">⭐ {player.points}</span>
            </div>

            {player.skippedNextTurn && (
              <div className="mt-1 text-red-400 text-xs text-center">⏸ Sıra atlanacak</div>
            )}
            {player.blockedFromRegion && (
              <div className="mt-1 text-orange-400 text-xs text-center">🚫 Sipariş yok</div>
            )}

            <div className="mt-2">
              <div className="text-white/30 text-[10px] mb-0.5">
                {player.scoredFoods.length} sipariş
              </div>
              <div className="w-full bg-white/10 rounded-full h-1">
                <motion.div
                  animate={{ width: `${Math.min((player.points / 50) * 100, 100)}%` }}
                  className="h-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function OnlineMarketArea() {
  const {
    marketFoods,
    drawDeckSize,
    discardPileSize,
    drawCard,
    tryComplete,
    onlinePhase,
    hasDrawnThisTurn,
    cookingAnimation,
    doubledMarketFoodId,
    myPlayerIndex,
    currentPlayerIndex,
  } = useOnlineStore();

  const isMyTurn = myPlayerIndex === currentPlayerIndex;
  const canAct = onlinePhase === "playing" && isMyTurn;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 justify-center items-start flex-wrap">
        <div className="flex flex-col items-center gap-2">
          <div className="text-white/60 text-xs font-medium uppercase tracking-wider">Deste</div>
          <motion.div
            whileHover={{ scale: canAct && !hasDrawnThisTurn ? 1.05 : 1 }}
            whileTap={{ scale: canAct && !hasDrawnThisTurn ? 0.97 : 1 }}
            onClick={canAct && !hasDrawnThisTurn ? drawCard : undefined}
            className={cn(
              "w-28 h-40 rounded-xl border-2 bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col items-center justify-center gap-2 transition-all",
              canAct && !hasDrawnThisTurn
                ? "border-blue-400 shadow-lg shadow-blue-500/30 hover:border-blue-300 cursor-pointer"
                : "border-white/20 opacity-60 cursor-not-allowed"
            )}
          >
            <span className="text-4xl">🎴</span>
            <span className="text-white/70 text-xs">{drawDeckSize} kart</span>
            {canAct && !hasDrawnThisTurn && (
              <span className="text-blue-300 text-[10px] font-medium animate-pulse">Çek!</span>
            )}
          </motion.div>
          {discardPileSize > 0 && (
            <div className="text-white/30 text-xs">{discardPileSize} çöp</div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-white/60 text-xs font-medium uppercase tracking-wider text-center">
            🍽️ Sipariş Penceresi
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <AnimatePresence>
              {marketFoods.map((food) => {
                const isDoubled = doubledMarketFoodId === food.id;
                const isAnimating = cookingAnimation === food.id;
                return (
                  <motion.div
                    key={food.id}
                    initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative"
                  >
                    {isDoubled && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-black text-[10px] font-bold rounded-full px-2 py-0.5 z-10 whitespace-nowrap">
                        2x Puan!
                      </div>
                    )}
                    <motion.div
                      animate={isAnimating ? { scale: [1, 1.15, 1], rotate: [0, -3, 3, 0] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      <GameCard
                        card={food}
                        onClick={canAct ? () => tryComplete(food.id) : undefined}
                        disabled={!canAct}
                        className={cn(isDoubled && "ring-2 ring-amber-400")}
                      />
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {marketFoods.length === 0 && (
              <div className="text-white/40 text-sm flex items-center justify-center h-40 w-40">
                Sipariş penceresi boş
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OnlinePlayerHand() {
  const {
    myHand,
    selectedCards,
    selectCard,
    useEventCard,
    onlinePhase,
    hasDrawnThisTurn,
    myPlayerIndex,
    currentPlayerIndex,
  } = useOnlineStore();

  const isMyTurn = myPlayerIndex === currentPlayerIndex;
  const canAct = onlinePhase === "playing" && isMyTurn;

  const handleCardClick = (card: Card) => {
    if (!canAct) return;
    if (card.type === "event") {
      useEventCard(card.id);
      return;
    }
    selectCard(card.id);
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">
          🃏 Elin ({myHand.length} kart)
        </h3>
        <div className="text-xs text-white/50">
          {!isMyTurn && <span className="text-white/30">Sıranı bekle...</span>}
          {isMyTurn && myHand.some((c) => c.type === "event") && (
            <span className="text-yellow-300">⚡ Olay kartına tıkla → hemen kullan</span>
          )}
          {isMyTurn && !hasDrawnThisTurn && myHand.some((c) => c.type === "material") && (
            <span className="text-blue-300 ml-2">Önce kart çek 👆</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap justify-center min-h-[10rem]">
        <AnimatePresence>
          {myHand.map((card, idx) => {
            const isSelected = selectedCards.includes(card.id);
            const isEvent = card.type === "event";
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30, scale: 0.8 }}
                transition={{ delay: idx * 0.04 }}
                className="relative"
              >
                <GameCard
                  card={card}
                  selected={isSelected}
                  onClick={() => handleCardClick(card)}
                  disabled={!canAct}
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
        {myHand.length === 0 && (
          <div className="flex items-center justify-center w-full text-white/40 text-sm">
            {isMyTurn ? "Elin boş — kart çek!" : "Elin boş"}
          </div>
        )}
      </div>

      {selectedCards.length > 0 && (
        <div className="mt-2 text-center text-yellow-300 text-xs">
          {selectedCards.length} kart seçildi — sipariş kartına tıkla!
        </div>
      )}
    </div>
  );
}

function MessagePanel() {
  const messages = useOnlineStore((s) => s.messages);

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-3 border border-white/10 flex flex-col gap-1 max-h-36 overflow-y-auto">
      <div className="text-white/50 text-[10px] uppercase tracking-wider mb-1">📜 Son Aksiyonlar</div>
      {messages.length === 0 && (
        <div className="text-white/30 text-xs">Henüz aksiyon yok...</div>
      )}
      {messages.slice(0, 15).map((m) => (
        <div
          key={m.id}
          className={cn(
            "text-xs rounded px-2 py-1",
            m.type === "success" && "text-green-300",
            m.type === "warning" && "text-yellow-300",
            m.type === "event" && "text-purple-300",
            m.type === "info" && "text-white/60"
          )}
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}

function playGameSound(type: "your_turn" | "turn_end") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";

    if (type === "your_turn") {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.frequency.setValueAtTime(659, ctx.currentTime);
      osc.frequency.setValueAtTime(523, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {}
}

export function OnlineGamePage() {
  const {
    players,
    myPlayerIndex,
    currentPlayerIndex,
    endTurn,
    leaveRoom,
    hasDrawnThisTurn,
    canEndTurn,
    drawDeckSize,
    onlinePhase,
    roomCode,
    victoryPoints,
  } = useOnlineStore();

  const myPlayer = players[myPlayerIndex];
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = myPlayerIndex === currentPlayerIndex;

  const prevIsMyTurn = useRef<boolean | null>(null);
  useEffect(() => {
    if (onlinePhase !== "playing") {
      prevIsMyTurn.current = isMyTurn;
      return;
    }
    if (prevIsMyTurn.current === null) {
      prevIsMyTurn.current = isMyTurn;
      return;
    }
    if (isMyTurn && !prevIsMyTurn.current) {
      playGameSound("your_turn");
    } else if (!isMyTurn && prevIsMyTurn.current) {
      playGameSound("turn_end");
    }
    prevIsMyTurn.current = isMyTurn;
  }, [isMyTurn, onlinePhase]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-amber-950 to-red-950 p-3 flex flex-col">
      <ActionFeed />
      <OnlineEventModal />

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍽️</span>
          <div>
            <h1 className="text-white font-bold text-sm leading-none">Hatay Gastronomi Rotası</h1>
            <p className={cn("text-xs", isMyTurn ? "text-amber-400 font-semibold" : "text-white/50")}>
              {isMyTurn ? "⭐ Senin sıran!" : `${currentPlayer?.name ?? "?"}'ın sırası`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-white/30 text-xs bg-white/5 rounded-lg px-2 py-1">
            #{roomCode}
          </div>
          {isMyTurn && (
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
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={leaveRoom}
            className="px-3 py-2 rounded-xl text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 transition-all"
          >
            ↩ Çık
          </motion.button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 flex-1">
        <div className="lg:w-52 flex flex-col gap-3">
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-3 border border-white/10 space-y-2">
            <h3 className="text-white font-semibold text-xs text-center uppercase tracking-wider">
              🏆 Puan Tablosu
            </h3>
            {[...players]
              .map((p, i) => ({ ...p, index: i }))
              .sort((a, b) => b.points - a.points)
              .map((player, rank) => {
                const isActive = player.index === currentPlayerIndex;
                const isMe = player.index === myPlayerIndex;
                const progress = Math.min((player.points / victoryPoints) * 100, 100);
                return (
                  <motion.div
                    key={player.index}
                    animate={{ scale: isActive ? 1.02 : 1 }}
                    className={cn(
                      "rounded-xl p-2 border text-xs",
                      isActive ? "border-amber-400 bg-amber-400/10" : isMe ? "border-blue-400/50 bg-blue-400/5" : "border-white/10 bg-white/5"
                    )}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn("font-medium", isActive ? "text-amber-300" : isMe ? "text-blue-300" : "text-white/80")}>
                        {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "👤"} {player.name}
                        {isMe && <span className="text-white/40 ml-1">(sen)</span>}
                        {isActive && <span className="ml-1 animate-pulse">◀</span>}
                      </span>
                      <span className={cn("font-bold", isActive ? "text-amber-300" : "text-white")}>
                        ⭐{player.points}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1">
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        className="h-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                      />
                    </div>
                    <div className="mt-1 text-white/40">
                      {player.scoredFoods.length} sipariş · {player.cardCount} kart
                    </div>
                  </motion.div>
                );
              })}
            <div className="text-center text-white/30 text-[10px]">Hedef: {victoryPoints} puan</div>
          </div>

          <MessagePanel />
        </div>

        <div className="flex-1 flex flex-col gap-3">
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <OtherPlayersArea />
          </div>

          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex-1 flex items-center justify-center">
            <OnlineMarketArea />
          </div>

          <div>
            <OnlinePlayerHand />
          </div>

          <div className="text-center">
            <div className="inline-flex gap-4 bg-black/30 rounded-2xl px-6 py-2.5 border border-white/10">
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wider">Deste</div>
                <div className="text-white font-bold text-sm">{drawDeckSize}</div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wider">El</div>
                <div className="text-white font-bold text-sm">{myPlayer?.cardCount ?? 0}</div>
              </div>
              <div className="w-px bg-white/10" />
              <div className="text-center">
                <div className="text-white/50 text-[10px] uppercase tracking-wider">Puan</div>
                <div className="text-yellow-300 font-bold text-sm">⭐ {myPlayer?.points ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-white/20 text-xs">
        {isMyTurn ? "Kart çek → Malzemeleri seç → Sipariş kartına tıkla → Sırayı bitir" : "Diğer oyuncuların hamlesini bekle..."}
      </div>
    </div>
  );
}
