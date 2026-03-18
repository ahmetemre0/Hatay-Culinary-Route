import { create } from "zustand";
import {
  Card,
  RegionCard,
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
  scoredRegions: RegionCard[];
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
  marketRegions: RegionCard[];
  drawDeck: Card[];
  regionDeck: RegionCard[];
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
  doubledMarketRegionId: string | null;

  startGame: (numPlayers: number, names: string[]) => void;
  drawCard: () => void;
  selectCard: (cardId: string) => void;
  tryComplete: (regionId: string) => void;
  useEventCard: (cardId: string) => void;
  resolveEvent: (targetPlayerId?: number, cardIds?: string[]) => void;
  cancelEvent: () => void;
  endTurn: () => void;
  resetGame: () => void;
};

function makePlayer(id: number, name: string, hand: Card[]): Player {
  return {
    id,
    name,
    hand,
    scoredRegions: [],
    points: 0,
    skippedNextTurn: false,
    blockedFromRegion: false,
  };
}

function addLog(
  logs: GameLog[],
  counter: number,
  text: string,
  type: GameLog["type"] = "info"
): { logs: GameLog[]; counter: number } {
  const newLog: GameLog = { id: counter, text, type };
  return {
    logs: [newLog, ...logs].slice(0, 30),
    counter: counter + 1,
  };
}

function checkMaterials(hand: Card[], required: MaterialType[]): boolean {
  const mats = hand.filter(
    (c): c is MaterialCard => c.type === "material"
  );
  const req = [...required];
  for (const r of req) {
    const joker = mats.find((m) => m.materialType === "Joker");
    const exact = mats.find((m) => m.materialType === r);
    if (!exact && !joker) return false;
  }
  return true;
}

function consumeMaterials(hand: Card[], required: MaterialType[]): Card[] {
  let remaining = [...hand];
  const req = [...required];
  for (const r of req) {
    const exactIdx = remaining.findIndex(
      (c): c is MaterialCard => c.type === "material" && c.materialType === r
    );
    if (exactIdx !== -1) {
      remaining.splice(exactIdx, 1);
    } else {
      const jokerIdx = remaining.findIndex(
        (c): c is MaterialCard =>
          c.type === "material" && c.materialType === "Joker"
      );
      if (jokerIdx !== -1) remaining.splice(jokerIdx, 1);
    }
  }
  return remaining;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "setup",
  players: [],
  currentPlayerIndex: 0,
  marketRegions: [],
  drawDeck: [],
  regionDeck: [],
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
  doubledMarketRegionId: null,

  startGame: (numPlayers, names) => {
    const { regionDeck, materialEventDeck } = buildInitialDecks();
    let deck = [...materialEventDeck];

    const players: Player[] = [];
    for (let i = 0; i < numPlayers; i++) {
      const hand = deck.splice(0, 5);
      players.push(makePlayer(i, names[i], hand));
    }

    const market: RegionCard[] = [];
    let regDeck = [...regionDeck];
    while (market.length < 3 && regDeck.length > 0) {
      market.push(regDeck.shift()!);
    }

    let logs: GameLog[] = [];
    let counter = 0;
    const r = addLog(logs, counter, "Oyun başladı! İyi eğlenceler 🎉", "success");
    logs = r.logs;
    counter = r.counter;
    const r2 = addLog(logs, counter, `${names[0]}'ın sırası`, "info");
    logs = r2.logs;
    counter = r2.counter;

    set({
      phase: "playing",
      players,
      currentPlayerIndex: 0,
      marketRegions: market,
      drawDeck: deck,
      regionDeck: regDeck,
      discardPile: [],
      selectedCards: [],
      logs,
      logIdCounter: counter,
      winnerIndex: null,
      hasDrawnThisTurn: false,
      canEndTurn: false,
      doubledMarketRegionId: null,
    });
  },

  drawCard: () => {
    const state = get();
    if (state.hasDrawnThisTurn) return;
    if (state.phase !== "playing") return;

    let deck = [...state.drawDeck];
    let discard = [...state.discardPile];

    if (deck.length === 0) {
      if (discard.length === 0) {
        let { logs, logIdCounter } = state;
        const r = addLog(logs, logIdCounter, "Deste bitti! Oyun sona eriyor...", "warning");
        logs = r.logs;
        logIdCounter = r.counter;
        const winner = [...state.players].sort((a, b) => b.points - a.points)[0];
        const winIdx = state.players.findIndex((p) => p.id === winner.id);
        set({ phase: "game_over", winnerIndex: winIdx, logs, logIdCounter });
        return;
      }
      deck = shuffle([...discard]);
      discard = [];
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, "Çöp destesi karıştırıldı!", "warning");
      logs = r.logs;
      logIdCounter = r.counter;
      set({ drawDeck: deck, discardPile: discard, logs, logIdCounter });
    }

    const drawn = deck.shift()!;
    const players = state.players.map((p, i) => {
      if (i === state.currentPlayerIndex) {
        return { ...p, hand: [...p.hand, drawn] };
      }
      return p;
    });

    let { logs, logIdCounter } = state;
    const cur = state.players[state.currentPlayerIndex];
    const r = addLog(
      logs,
      logIdCounter,
      `${cur.name} bir kart çekti (${drawn.type === "material" ? (drawn as MaterialCard).name : drawn.type === "event" ? (drawn as EventCard).effectName : (drawn as RegionCard).dish})`,
      "info"
    );
    logs = r.logs;
    logIdCounter = r.counter;

    set({
      players,
      drawDeck: deck,
      logs,
      logIdCounter,
      hasDrawnThisTurn: true,
      canEndTurn: true,
    });
  },

  selectCard: (cardId) => {
    const state = get();
    if (state.phase !== "playing") return;
    const selected = state.selectedCards.includes(cardId)
      ? state.selectedCards.filter((id) => id !== cardId)
      : [...state.selectedCards, cardId];
    set({ selectedCards: selected });
  },

  tryComplete: (regionId) => {
    const state = get();
    if (state.phase !== "playing") return;
    const cur = state.players[state.currentPlayerIndex];
    if (cur.blockedFromRegion) {
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, "Bu tur bölge tamamlayamazsın! (Sıcak Hava Dalgası)", "warning");
      set({ logs: r.logs, logIdCounter: r.counter });
      return;
    }

    const region = state.marketRegions.find((r) => r.id === regionId);
    if (!region) return;

    if (!checkMaterials(cur.hand, region.requiredMaterials)) {
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, `Yeterli malzemen yok! (${region.requiredMaterials.join(", ")})`, "warning");
      set({ logs: r.logs, logIdCounter: r.counter });
      return;
    }

    const newHand = consumeMaterials(cur.hand, region.requiredMaterials);
    const newRegions = state.marketRegions.filter((r) => r.id !== regionId);

    let newRegDeck = [...state.regionDeck];
    if (newRegDeck.length > 0) {
      newRegions.push(newRegDeck.shift()!);
    }

    const isDoubled = state.doubledMarketRegionId === region.id;
    const earnedPoints = isDoubled ? region.points * 2 : region.points;
    let totalPts = cur.points + earnedPoints;

    const players = state.players.map((p, i) => {
      if (i === state.currentPlayerIndex) {
        return {
          ...p,
          hand: newHand,
          scoredRegions: [...p.scoredRegions, region],
          points: totalPts,
        };
      }
      return p;
    });

    let { logs, logIdCounter } = state;
    const r = addLog(
      logs,
      logIdCounter,
      `🍽️ ${cur.name}, ${region.name} - ${region.dish} tamamladı! +${earnedPoints} puan${isDoubled ? " (2x Künefe Şöleni!)" : ""}`,
      "success"
    );
    logs = r.logs;
    logIdCounter = r.counter;

    const newState: Partial<GameState> = {
      players,
      marketRegions: newRegions,
      regionDeck: newRegDeck,
      selectedCards: [],
      logs,
      logIdCounter,
      cookingAnimation: regionId,
      doubledMarketRegionId: isDoubled ? null : state.doubledMarketRegionId,
    };

    if (totalPts >= state.victoryPoints) {
      newState.phase = "game_over";
      newState.winnerIndex = state.currentPlayerIndex;
      const r2 = addLog(logs, logIdCounter, `🏆 ${cur.name} kazandı! ${totalPts} puan!`, "success");
      newState.logs = r2.logs;
      newState.logIdCounter = r2.counter;
    }

    set(newState);

    setTimeout(() => {
      set({ cookingAnimation: null });
    }, 1500);
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
      for (let i = 0; i < 2 && deck.length > 0; i++) {
        drawn.push(deck.shift()!);
      }
      const newHand = cur.hand
        .filter((c) => c.id !== cardId)
        .concat(drawn);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, `🌿 ${cur.name} "Bereketli Topraklar" kullandı! 2 kart çekti.`, "event");
      set({ players, drawDeck: deck, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "multiply_points") {
      if (state.marketRegions.length === 0) {
        let { logs, logIdCounter } = state;
        const r = addLog(logs, logIdCounter, "Markette bölge kartı yok!", "warning");
        set({ logs: r.logs, logIdCounter: r.counter });
        return;
      }
      set({ pendingEvent: card, phase: "event_pending" });
      return;
    }

    if (card.action === "reshuffle_all") {
      let deck = [...state.drawDeck];
      const allCards: Card[] = [];
      const players = state.players.map((p) => {
        allCards.push(...p.hand);
        return { ...p, hand: [] };
      });
      deck = shuffle([...deck, ...allCards]);
      const newPlayers = players.map((p) => {
        const hand = deck.splice(0, 5);
        return { ...p, hand };
      });
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, `🌊 ${cur.name} "Asi Nehri Taştı" kullandı! Herkes yeniden çekti.`, "event");
      set({ players: newPlayers, drawDeck: deck, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "block_region") {
      const newHand = cur.hand.filter((c) => c.id !== cardId);
      const updatedPlayers = state.players.map((p, i) => {
        if (i === state.currentPlayerIndex) {
          return { ...p, hand: newHand, blockedFromRegion: false };
        }
        return { ...p, blockedFromRegion: true };
      });
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, `☀️ ${cur.name} "Sıcak Hava Dalgası" kullandı! Diğer oyuncular bir tur bölge tamamlayamaz.`, "event");
      set({ players: updatedPlayers, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
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
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, `🌶️ ${cur.name} "${card.effectName}" kullandı! ${target.name} sırasını atlıyor.`, "event");
      set({ players, phase: "playing", pendingEvent: null, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "steal_card") {
      if (targetPlayerId === undefined) return;
      const targetPlayer = state.players.find((p) => p.id === targetPlayerId)!;
      if (targetPlayer.hand.length === 0) {
        let { logs, logIdCounter } = state;
        const r = addLog(logs, logIdCounter, "Hedef oyuncunun eli boş!", "warning");
        set({ logs: r.logs, logIdCounter: r.counter, phase: "playing", pendingEvent: null });
        return;
      }
      const stolenIdx = Math.floor(Math.random() * targetPlayer.hand.length);
      const stolen = targetPlayer.hand[stolenIdx];
      const players = state.players.map((p) => {
        if (p.id === targetPlayerId) {
          return { ...p, hand: p.hand.filter((_, i) => i !== stolenIdx) };
        }
        if (p.id === cur.id) {
          const newHand = p.hand.filter((c) => c.id !== card.id);
          return { ...p, hand: [...newHand, stolen] };
        }
        return p;
      });
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, `🤝 ${cur.name} "${card.effectName}" kullandı! ${targetPlayer.name}'den kart çaldı.`, "event");
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
          const kept = p.hand.filter(
            (c) => c.id !== card.id && !myCards.includes(c.id)
          );
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
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, `🏪 ${cur.name} "Esnaf Dayanışması" kullandı! ${targetPlayer.name} ile 2 kart takas etti.`, "event");
      set({ players, phase: "playing", pendingEvent: null, logs: r.logs, logIdCounter: r.counter, discardPile: [...state.discardPile, card] });
      return;
    }

    if (card.action === "multiply_points") {
      if (!cardIds || cardIds.length === 0) return;
      const regionId = cardIds[0];
      const region = state.marketRegions.find((r) => r.id === regionId);
      if (!region) return;
      const newHand = cur.hand.filter((c) => c.id !== card.id);
      const players = state.players.map((p, i) =>
        i === state.currentPlayerIndex ? { ...p, hand: newHand } : p
      );
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, `🧁 ${cur.name} "Künefe Şöleni" kullandı! ${region.name} - ${region.dish} kartının puanı 2x oldu!`, "event");
      set({
        players,
        phase: "playing",
        pendingEvent: null,
        doubledMarketRegionId: regionId,
        logs: r.logs,
        logIdCounter: r.counter,
        discardPile: [...state.discardPile, card],
      });
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
    while (players[nextIdx].skippedNextTurn && skipped < numPlayers) {
      const skippedPlayer = players[nextIdx];
      let { logs, logIdCounter } = state;
      const r = addLog(logs, logIdCounter, `${skippedPlayer.name} sırasını atlıyor!`, "warning");
      state.logs = r.logs;
      state.logIdCounter = r.counter;
      players = players.map((p) =>
        p.id === skippedPlayer.id ? { ...p, skippedNextTurn: false } : p
      );
      nextIdx = (nextIdx + 1) % numPlayers;
      skipped++;
    }

    const nextPlayer = players[nextIdx];
    let { logs, logIdCounter } = state;
    const r = addLog(logs, logIdCounter, `${nextPlayer.name}'ın sırası`, "info");
    logs = r.logs;
    logIdCounter = r.counter;

    set({
      players,
      currentPlayerIndex: nextIdx,
      selectedCards: [],
      logs,
      logIdCounter,
      hasDrawnThisTurn: false,
      canEndTurn: false,
    });
  },

  resetGame: () => {
    set({
      phase: "setup",
      players: [],
      currentPlayerIndex: 0,
      marketRegions: [],
      drawDeck: [],
      regionDeck: [],
      discardPile: [],
      selectedCards: [],
      pendingEvent: null,
      pendingEventTarget: null,
      logs: [],
      logIdCounter: 0,
      winnerIndex: null,
      hasDrawnThisTurn: false,
      canEndTurn: false,
      cookingAnimation: null,
      doubledMarketRegionId: null,
    });
  },
}));
