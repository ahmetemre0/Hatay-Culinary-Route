import { create } from "zustand";
import {
  Card,
  FoodCard,
  MaterialCard,
  EventCard,
  MaterialType,
  buildInitialDecks,
  shuffle,
} from "../data/cards";

export type Player = {
  id: number;
  name: string;
  hand: Card[];
  scoredFoods: FoodCard[];
  points: number;
  skippedNextTurn: boolean;
  blockedFromRegion: boolean;
};

export type GamePhase =
  | "setup"
  | "playing"
  | "event_pending"
  | "trade_pending"
  | "steal_pending"
  | "game_over";

export type GameLog = {
  id: number;
  text: string;
  type: "info" | "success" | "warning" | "event";
};

type GameState = {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  marketFoods: FoodCard[];
  drawDeck: Card[];
  foodDeck: FoodCard[];
  discardPile: Card[];
  selectedCards: string[];
  pendingEvent: EventCard | null;
  pendingEventTarget: number | null;
  logs: GameLog[];
  logIdCounter: number;
  tradeSourceCards: string[];
  tradeTargetPlayer: number | null;
  winnerIndex: number | null;
  hasDrawnThisTurn: boolean;
  canEndTurn: boolean;
  victoryPoints: number;
  cookingAnimation: string | null;
  doubledMarketFoodId: string | null;

  startGame: (numPlayers: number, names: string[]) => void;
  drawCard: () => void;
  selectCard: (cardId: string) => void;
  tryComplete: (foodId: string) => void;
  useEventCard: (cardId: string) => void;
  resolveEvent: (targetPlayerId?: number, cardIds?: string[]) => void;
  cancelEvent: () => void;
  endTurn: () => void;
  resetGame: () => void;
};

function makePlayer(id: number, name: string, hand: Card[]): Player {
  return { id, name, hand, scoredFoods: [], points: 0, skippedNextTurn: false, blockedFromRegion: false };
}

function addLog(
  logs: GameLog[],
  counter: number,
  text: string,
  type: GameLog["type"] = "info"
): { logs: GameLog[]; counter: number } {
  return { logs: [{ id: counter, text, type }, ...logs].slice(0, 30), counter: counter + 1 };
}

function checkMaterials(hand: Card[], required: MaterialType[]): boolean {
  const mats = hand.filter((c): c is MaterialCard => c.type === "material");
  const req = [...required];
  for (const r of req) {
    const idx = mats.findIndex((m) => m.materialType === r);
    if (idx !== -1) { mats.splice(idx, 1); continue; }
    const joker = mats.findIndex((m) => m.materialType === "Joker");
    if (joker !== -1) { mats.splice(joker, 1); continue; }
    return false;
  }
  return true;
}

function consumeMaterials(hand: Card[], required: MaterialType[]): Card[] {
  let remaining = [...hand];
  for (const r of required) {
    const exactIdx = remaining.findIndex(
      (c): c is MaterialCard => c.type === "material" && c.materialType === r
    );
    if (exactIdx !== -1) { remaining.splice(exactIdx, 1); continue; }
    const jokerIdx = remaining.findIndex(
      (c): c is MaterialCard => c.type === "material" && c.materialType === "Joker"
    );
    if (jokerIdx !== -1) remaining.splice(jokerIdx, 1);
  }
  return remaining;
}

function checkSelectedMaterials(hand: Card[], selectedIds: string[], required: MaterialType[]): boolean {
  const selectedMats = hand.filter(
    (c): c is MaterialCard => c.type === "material" && selectedIds.includes(c.id)
  );
  if (selectedMats.length !== required.length) return false;
  const req = [...required];
  const mats = [...selectedMats];
  for (const r of req) {
    const exact = mats.findIndex((m) => m.materialType === r);
    if (exact !== -1) { mats.splice(exact, 1); continue; }
    const joker = mats.findIndex((m) => m.materialType === "Joker");
    if (joker !== -1) { mats.splice(joker, 1); continue; }
    return false;
  }
  return true;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "setup",
  players: [],
  currentPlayerIndex: 0,
  marketFoods: [],
  drawDeck: [],
  foodDeck: [],
  discardPile: [],
  selectedCards: [],
  pendingEvent: null,
  pendingEventTarget: null,
  logs: [],
  logIdCounter: 0,
  tradeSourceCards: [],
  tradeTargetPlayer: null,
  winnerIndex: null,
  hasDrawnThisTurn: false,
  canEndTurn: false,
  victoryPoints: 50,
  cookingAnimation: null,
  doubledMarketFoodId: null,

  startGame: (numPlayers, names) => {
    const { foodDeck, materialEventDeck } = buildInitialDecks();
    let deck = [...materialEventDeck];

    const players: Player[] = [];
    for (let i = 0; i < numPlayers; i++) {
      players.push(makePlayer(i, names[i], deck.splice(0, 5)));
    }

    const market: FoodCard[] = [];
    let fDeck = [...foodDeck];
    while (market.length < 3 && fDeck.length > 0) market.push(fDeck.shift()!);

    let logs: GameLog[] = [];
    let counter = 0;
    let r = addLog(logs, counter, "Oyun başladı! İyi eğlenceler 🎉", "success");
    logs = r.logs; counter = r.counter;
    r = addLog(logs, counter, `${names[0]}'ın sırası`, "info");
    logs = r.logs; counter = r.counter;

    set({
      phase: "playing", players, currentPlayerIndex: 0,
      marketFoods: market, drawDeck: deck, foodDeck: fDeck, discardPile: [],
      selectedCards: [], logs, logIdCounter: counter, winnerIndex: null,
      hasDrawnThisTurn: false, canEndTurn: false, doubledMarketFoodId: null,
    });
  },

  drawCard: () => {
    const state = get();
    if (state.hasDrawnThisTurn || state.phase !== "playing") return;

    let deck = [...state.drawDeck];
    let discard = [...state.discardPile];

    if (deck.length === 0) {
      if (discard.length === 0) {
        const winner = [...state.players].sort((a, b) => b.points - a.points)[0];
        const winIdx = state.players.findIndex((p) => p.id === winner.id);
        const r = addLog(state.logs, state.logIdCounter, "Deste bitti!", "warning");
        set({ phase: "game_over", winnerIndex: winIdx, logs: r.logs, logIdCounter: r.counter });
        return;
      }
      deck = shuffle([...discard]);
      discard = [];
      const r = addLog(state.logs, state.logIdCounter, "Çöp destesi karıştırıldı!", "warning");
      set({ drawDeck: deck, discardPile: discard, logs: r.logs, logIdCounter: r.counter });
    }

    const drawn = deck.shift()!;
    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex ? { ...p, hand: [...p.hand, drawn] } : p
    );
    const cur = state.players[state.currentPlayerIndex];
    const cardName = drawn.type === "material" ? (drawn as MaterialCard).name
      : drawn.type === "event" ? (drawn as EventCard).effectName
      : (drawn as FoodCard).name;
    const r = addLog(state.logs, state.logIdCounter, `${cur.name} bir kart çekti (${cardName})`, "info");
    set({ players, drawDeck: deck, logs: r.logs, logIdCounter: r.counter, hasDrawnThisTurn: true, canEndTurn: true });
  },

  selectCard: (cardId) => {
    const state = get();
    if (state.phase !== "playing") return;
    const selected = state.selectedCards.includes(cardId)
      ? state.selectedCards.filter((id) => id !== cardId)
      : [...state.selectedCards, cardId];
    set({ selectedCards: selected });
  },

  tryComplete: (foodId) => {
    const state = get();
    if (state.phase !== "playing") return;
    const cur = state.players[state.currentPlayerIndex];
    if (cur.blockedFromRegion) {
      const r = addLog(state.logs, state.logIdCounter, "Bu tur sipariş tamamlayamazsın! (Sıcak Hava Dalgası)", "warning");
      set({ logs: r.logs, logIdCounter: r.counter });
      return;
    }

    const food = state.marketFoods.find((f) => f.id === foodId);
    if (!food) return;

    if (state.selectedCards.length === 0) {
      const r = addLog(state.logs, state.logIdCounter, `Önce gerekli malzemeleri seç! Gereken: ${food.requiredMaterials.join(", ")}`, "warning");
      set({ logs: r.logs, logIdCounter: r.counter });
      return;
    }

    if (!checkSelectedMaterials(cur.hand, state.selectedCards, food.requiredMaterials)) {
      const r = addLog(state.logs, state.logIdCounter, `Seçilen malzemeler tarife uymuyor! Gereken: ${food.requiredMaterials.join(", ")}`, "warning");
      set({ logs: r.logs, logIdCounter: r.counter });
      return;
    }

    const newHand = cur.hand.filter((c) => !state.selectedCards.includes(c.id));
    const newMarket = state.marketFoods.filter((f) => f.id !== foodId);
    let newFoodDeck = [...state.foodDeck];
    if (newFoodDeck.length > 0) newMarket.push(newFoodDeck.shift()!);

    const isDoubled = state.doubledMarketFoodId === food.id;
    const earnedPoints = isDoubled ? food.points * 2 : food.points;
    const totalPts = cur.points + earnedPoints;

    const players = state.players.map((p, i) =>
      i === state.currentPlayerIndex
        ? { ...p, hand: newHand, scoredFoods: [...p.scoredFoods, food], points: totalPts }
        : p
    );

    let { logs, logIdCounter } = state;
    const r = addLog(logs, logIdCounter,
      `🍽️ ${cur.name} "${food.name}" siparişini tamamladı! +${earnedPoints} puan${isDoubled ? " (2x!)" : ""}`,
      "success"
    );
    logs = r.logs; logIdCounter = r.counter;

    const newState: Partial<GameState> = {
      players, marketFoods: newMarket, foodDeck: newFoodDeck,
      selectedCards: [], logs, logIdCounter,
      cookingAnimation: foodId,
      doubledMarketFoodId: isDoubled ? null : state.doubledMarketFoodId,
    };

    if (totalPts >= state.victoryPoints) {
      newState.phase = "game_over";
      newState.winnerIndex = state.currentPlayerIndex;
      const r2 = addLog(logs, logIdCounter, `🏆 ${cur.name} kazandı! ${totalPts} puan!`, "success");
      newState.logs = r2.logs; newState.logIdCounter = r2.counter;
    }

    set(newState);
    setTimeout(() => set({ cookingAnimation: null }), 1500);
  },

  useEventCard: (cardId) => {
    const state = get();
    if (state.phase !== "playing") return;
    const cur = state.players[state.currentPlayerIndex];
    const card = cur.hand.find((c) => c.id === cardId) as EventCard | undefined;
    if (!card || card.type !== "event") return;

    if (card.action === "draw_two") {
      let deck = [...state.drawDeck];
      const drawn: Card[] = [];
      for (let i = 0; i < 2 && deck.length > 0; i++) drawn.push(deck.shift()!);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex
          ? { ...p, hand: [...p.hand.filter((c) => c.id !== cardId), ...drawn] }
          : p
      );
      const r = addLog(state.logs, state.logIdCounter, `🌿 ${cur.name} "Bereketli Topraklar" kullandı! 2 kart çekti.`, "event");
      set({ players, drawDeck: deck, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "reshuffle_all") {
      // Her oyuncunun mevcut el büyüklüğü kaydedilir
      const handSizes = state.players.map((p) =>
        p.id === cur.id ? p.hand.filter((c) => c.id !== cardId).length : p.hand.length
      );
      // Tüm ellerden kartlar + mevcut deste birleştirilip karıştırılır
      let pool: Card[] = [...state.drawDeck];
      state.players.forEach((p) => {
        if (p.id === cur.id) pool.push(...p.hand.filter((c) => c.id !== cardId));
        else pool.push(...p.hand);
      });
      pool = shuffle(pool);
      // Her oyuncu elini sıfırlar ve N yeni kart çeker
      let poolIdx = 0;
      const newPlayers = state.players.map((p, i) => {
        const drawn: Card[] = [];
        for (let j = 0; j < handSizes[i] && poolIdx < pool.length; j++) drawn.push(pool[poolIdx++]);
        return { ...p, hand: drawn };
      });
      const newDeck = pool.slice(poolIdx);
      const r = addLog(state.logs, state.logIdCounter, `🌊 ${cur.name} "Asi Nehri Taştı" kullandı! Herkes elini bıraktı ve aynı sayıda yeni kart çekti.`, "event");
      set({ players: newPlayers, drawDeck: newDeck, discardPile: [...state.discardPile, card], logs: r.logs, logIdCounter: r.counter });
      return;
    }

    if (card.action === "block_region") {
      const newHand = cur.hand.filter((c) => c.id !== cardId);
      const updatedPlayers = state.players.map((p, i) => ({
        ...p,
        hand: i === state.currentPlayerIndex ? newHand : p.hand,
        blockedFromRegion: i !== state.currentPlayerIndex,
      }));
      const r = addLog(state.logs, state.logIdCounter, `☀️ ${cur.name} "Sıcak Hava Dalgası" kullandı! Diğer oyuncular bir tur sipariş tamamlayamaz.`, "event");
      set({ players: updatedPlayers, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "collect_all_meat") {
      const meatCards: Card[] = [];
      const newPlayers = state.players.map((p, i) => {
        if (i === state.currentPlayerIndex) return { ...p, hand: p.hand.filter((c) => c.id !== cardId) };
        const meats = p.hand.filter((c) => c.type === "material" && (c as MaterialCard).materialType === "Et");
        meatCards.push(...meats);
        return { ...p, hand: p.hand.filter((c) => !(c.type === "material" && (c as MaterialCard).materialType === "Et")) };
      });
      newPlayers[state.currentPlayerIndex].hand.push(...meatCards);
      const r = addLog(state.logs, state.logIdCounter, `🥩 ${cur.name} "Etobur" kullandı! ${meatCards.length} Et kartı aldı.`, "event");
      set({ players: newPlayers, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "refresh_orders") {
      const discarded = [...state.discardPile, ...state.marketFoods, card];
      const newMarket: FoodCard[] = [];
      let newFoodDeck = [...state.foodDeck];
      while (newMarket.length < 3 && newFoodDeck.length > 0) newMarket.push(newFoodDeck.shift()!);
      const newHand = cur.hand.filter((c) => c.id !== cardId);
      const players = state.players.map((p, i) => i === state.currentPlayerIndex ? { ...p, hand: newHand } : p);
      const r = addLog(state.logs, state.logIdCounter, `🍾 ${cur.name} "Araktini Kafa Yaptı" kullandı! Sipariş penceresi yenilendi.`, "event");
      set({ players, marketFoods: newMarket, foodDeck: newFoodDeck, discardPile: discarded, logs: r.logs, logIdCounter: r.counter });
      return;
    }

    if (card.action === "instant_points") {
      const newHand = cur.hand.filter((c) => c.id !== cardId);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand, points: p.points + 3 } : p
      );
      const r = addLog(state.logs, state.logIdCounter, `💝 ${cur.name} "Yaruhe Kalbek" kullandı! +3 puan.`, "event");
      const newState: Partial<GameState> = { players, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] };
      if (cur.points + 3 >= state.victoryPoints) {
        newState.phase = "game_over";
        newState.winnerIndex = state.currentPlayerIndex;
      }
      set(newState);
      return;
    }

    if (card.action === "multiply_lowest_points") {
      const lowestFood = [...cur.scoredFoods].sort((a, b) => a.points - b.points)[0];
      if (!lowestFood) {
        const r = addLog(state.logs, state.logIdCounter, "Tamamlanmış siparişin yok!", "warning");
        set({ logs: r.logs, logIdCounter: r.counter });
        return;
      }
      const bonus = lowestFood.points;
      const newHand = cur.hand.filter((c) => c.id !== cardId);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand, points: p.points + bonus } : p
      );
      const r = addLog(state.logs, state.logIdCounter, `🏡 ${cur.name} "Memleket Hasreti" kullandı! "${lowestFood.name}" puanı 2x → +${bonus} puan.`, "event");
      const newState: Partial<GameState> = { players, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] };
      if (cur.points + bonus >= state.victoryPoints) {
        newState.phase = "game_over";
        newState.winnerIndex = state.currentPlayerIndex;
      }
      set(newState);
      return;
    }

    if (card.action === "multiply_points") {
      if (state.marketFoods.length === 0) {
        const r = addLog(state.logs, state.logIdCounter, "Sipariş penceresinde yemek yok!", "warning");
        set({ logs: r.logs, logIdCounter: r.counter });
        return;
      }
      set({ pendingEvent: card, phase: "event_pending" });
      return;
    }

    set({ pendingEvent: card, phase: "event_pending" });
  },

  resolveEvent: (targetPlayerId, cardIds) => {
    const state = get();
    const cur = state.players[state.currentPlayerIndex];
    const card = state.pendingEvent!;

    if (card.action === "skip_turn") {
      if (targetPlayerId === undefined) return;
      const players = state.players.map((p) => {
        if (p.id === targetPlayerId) return { ...p, skippedNextTurn: true };
        if (p.id === cur.id) return { ...p, hand: p.hand.filter((c) => c.id !== card.id) };
        return p;
      });
      const target = state.players.find((p) => p.id === targetPlayerId)!;
      const r = addLog(state.logs, state.logIdCounter, `🌶️ ${cur.name} "${card.effectName}" kullandı! ${target.name} sırasını atlıyor.`, "event");
      set({ players, phase: "playing", pendingEvent: null, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "steal_card") {
      if (targetPlayerId === undefined) return;
      const targetPlayer = state.players.find((p) => p.id === targetPlayerId)!;
      if (targetPlayer.hand.length === 0) {
        const r = addLog(state.logs, state.logIdCounter, "Hedef oyuncunun eli boş!", "warning");
        set({ logs: r.logs, logIdCounter: r.counter, phase: "playing", pendingEvent: null });
        return;
      }
      const stolenIdx = Math.floor(Math.random() * targetPlayer.hand.length);
      const stolen = targetPlayer.hand[stolenIdx];
      const players = state.players.map((p) => {
        if (p.id === targetPlayerId) return { ...p, hand: p.hand.filter((_, i) => i !== stolenIdx) };
        if (p.id === cur.id) return { ...p, hand: [...p.hand.filter((c) => c.id !== card.id), stolen] };
        return p;
      });
      const r = addLog(state.logs, state.logIdCounter, `🤝 ${cur.name} "${card.effectName}" kullandı! ${targetPlayer.name}'den kart çaldı.`, "event");
      set({ players, phase: "playing", pendingEvent: null, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "trade_two") {
      if (targetPlayerId === undefined || !cardIds || cardIds.length < 2) return;
      const targetPlayer = state.players.find((p) => p.id === targetPlayerId)!;
      const myCards = cardIds.slice(0, 2);
      const targetCards = targetPlayer.hand.slice(0, 2).map((c) => c.id);
      const players = state.players.map((p) => {
        if (p.id === cur.id) {
          const kept = p.hand.filter((c) => c.id !== card.id && !myCards.includes(c.id));
          const gained = targetPlayer.hand.filter((c) => targetCards.includes(c.id));
          return { ...p, hand: [...kept, ...gained] };
        }
        if (p.id === targetPlayerId) {
          const kept = p.hand.filter((c) => !targetCards.includes(c.id));
          const gained = cur.hand.filter((c) => myCards.includes(c.id));
          return { ...p, hand: [...kept, ...gained] };
        }
        return p;
      });
      const r = addLog(state.logs, state.logIdCounter, `🏪 ${cur.name} "${card.effectName}" kullandı! ${targetPlayer.name} ile 2 kart takas etti.`, "event");
      set({ players, phase: "playing", pendingEvent: null, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "multiply_points") {
      if (!cardIds || cardIds.length === 0) return;
      const foodId = cardIds[0];
      const food = state.marketFoods.find((f) => f.id === foodId);
      if (!food) return;
      const newHand = cur.hand.filter((c) => c.id !== card.id);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );
      const r = addLog(state.logs, state.logIdCounter, `🏰 ${cur.name} "Saray Caddesine Taşındık" kullandı! "${food.name}" kartının puanı 2x oldu!`, "event");
      set({ players, phase: "playing", pendingEvent: null, doubledMarketFoodId: foodId, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "swap_all_cards") {
      if (targetPlayerId === undefined) return;
      const targetPlayer = state.players.find((p) => p.id === targetPlayerId)!;
      const myHandWithout = cur.hand.filter((c) => c.id !== card.id);
      const targetHandCopy = [...targetPlayer.hand];
      const players = state.players.map((p) => {
        if (p.id === cur.id) return { ...p, hand: targetHandCopy };
        if (p.id === targetPlayerId) return { ...p, hand: myHandWithout };
        return p;
      });
      const r = addLog(state.logs, state.logIdCounter, `🔄 ${cur.name} "Cınno Nıtto" kullandı! ${targetPlayer.name} ile tüm kartları takas etti.`, "event");
      set({ players, phase: "playing", pendingEvent: null, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    set({ phase: "playing", pendingEvent: null });
  },

  cancelEvent: () => {
    set({ phase: "playing", pendingEvent: null, pendingEventTarget: null });
  },

  endTurn: () => {
    const state = get();
    if (!state.canEndTurn && !state.hasDrawnThisTurn) return;

    const numPlayers = state.players.length;
    let nextIdx = (state.currentPlayerIndex + 1) % numPlayers;

    let players = state.players.map((p, i) => ({
      ...p,
      blockedFromRegion: i === state.currentPlayerIndex ? false : p.blockedFromRegion,
    }));

    let skipped = 0;
    let { logs, logIdCounter } = state;
    while (players[nextIdx].skippedNextTurn && skipped < numPlayers) {
      const skippedP = players[nextIdx];
      const r = addLog(logs, logIdCounter, `${skippedP.name} sırasını atlıyor!`, "warning");
      logs = r.logs; logIdCounter = r.counter;
      players = players.map((p) =>
        p.id === skippedP.id ? { ...p, skippedNextTurn: false } : p
      );
      nextIdx = (nextIdx + 1) % numPlayers;
      skipped++;
    }

    const r = addLog(logs, logIdCounter, `${players[nextIdx].name}'ın sırası`, "info");
    logs = r.logs; logIdCounter = r.counter;

    set({ players, currentPlayerIndex: nextIdx, selectedCards: [], logs, logIdCounter, hasDrawnThisTurn: false, canEndTurn: false });
  },

  resetGame: () => {
    set({
      phase: "setup", players: [], currentPlayerIndex: 0,
      marketFoods: [], drawDeck: [], foodDeck: [], discardPile: [],
      selectedCards: [], pendingEvent: null, pendingEventTarget: null,
      logs: [], logIdCounter: 0, winnerIndex: null,
      hasDrawnThisTurn: false, canEndTurn: false,
      cookingAnimation: null, doubledMarketFoodId: null,
    });
  },
}));
