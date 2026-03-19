import { Card, RegionCard, EventCard, MaterialCard, MaterialType, buildInitialDecks, shuffle } from "./cards.js";

export type GameMessage = {
  id: number;
  text: string;
  type: "info" | "success" | "warning" | "event";
};

export type ServerPlayer = {
  name: string;
  socketId: string;
  hand: Card[];
  scoredRegions: RegionCard[];
  points: number;
  skippedNextTurn: boolean;
  blockedFromRegion: boolean;
};

export type GamePhase = "lobby" | "playing" | "event_pending" | "game_over";

export type ServerGameState = {
  phase: GamePhase;
  players: ServerPlayer[];
  currentPlayerIndex: number;
  marketRegions: RegionCard[];
  drawDeck: Card[];
  regionDeck: RegionCard[];
  discardPile: Card[];
  selectedCards: string[];
  pendingEvent: EventCard | null;
  messages: GameMessage[];
  msgCounter: number;
  winnerIndex: number | null;
  hasDrawnThisTurn: boolean;
  canEndTurn: boolean;
  cookingAnimation: string | null;
  doubledMarketRegionId: string | null;
  victoryPoints: number;
};

export type Room = {
  code: string;
  hostSocketId: string;
  state: ServerGameState;
};

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function makeInitialState(): ServerGameState {
  return {
    phase: "lobby",
    players: [],
    currentPlayerIndex: 0,
    marketRegions: [],
    drawDeck: [],
    regionDeck: [],
    discardPile: [],
    selectedCards: [],
    pendingEvent: null,
    messages: [],
    msgCounter: 0,
    winnerIndex: null,
    hasDrawnThisTurn: false,
    canEndTurn: false,
    cookingAnimation: null,
    doubledMarketRegionId: null,
    victoryPoints: 50,
  };
}

export function addMessage(state: ServerGameState, text: string, type: GameMessage["type"] = "info"): void {
  state.messages = [{ id: state.msgCounter++, text, type }, ...state.messages].slice(0, 40);
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();

export function createRoom(hostSocketId: string, playerName: string): Room {
  let code = generateCode();
  while (rooms.has(code)) code = generateCode();

  const state = makeInitialState();
  state.players.push({ name: playerName, socketId: hostSocketId, hand: [], scoredRegions: [], points: 0, skippedNextTurn: false, blockedFromRegion: false });
  addMessage(state, `${playerName} odayı oluşturdu`, "info");

  const room: Room = { code, hostSocketId, state };
  rooms.set(code, room);
  socketToRoom.set(hostSocketId, code);
  return room;
}

export function joinRoom(socketId: string, code: string, playerName: string): { room: Room; error?: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { room: null!, error: "Oda bulunamadı!" };
  if (room.state.phase !== "lobby") return { room: null!, error: "Oyun zaten başladı!" };
  if (room.state.players.length >= 4) return { room: null!, error: "Oda dolu! (Max 4 oyuncu)" };
  if (room.state.players.some(p => p.socketId === socketId)) return { room, error: undefined };

  room.state.players.push({ name: playerName, socketId, hand: [], scoredRegions: [], points: 0, skippedNextTurn: false, blockedFromRegion: false });
  addMessage(room.state, `${playerName} odaya katıldı`, "info");
  socketToRoom.set(socketId, code.toUpperCase());
  return { room };
}

export function getRoomBySocket(socketId: string): Room | null {
  const code = socketToRoom.get(socketId);
  if (!code) return null;
  return rooms.get(code) ?? null;
}

export function getRoom(code: string): Room | null {
  return rooms.get(code.toUpperCase()) ?? null;
}

export function rejoinRoom(newSocketId: string, code: string, playerName: string): { room: Room | null; error?: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { room: null, error: "Oda bulunamadı!" };
  if (room.state.phase === "lobby") return { room: null, error: "Oyun henüz başlamadı!" };

  const pIdx = room.state.players.findIndex(p => p.name === playerName);
  if (pIdx === -1) return { room: null, error: "Oyuncu bulunamadı!" };

  const oldSocketId = room.state.players[pIdx].socketId;
  room.state.players[pIdx].socketId = newSocketId;
  socketToRoom.delete(oldSocketId);
  socketToRoom.set(newSocketId, code.toUpperCase());

  if (room.hostSocketId === oldSocketId) {
    room.hostSocketId = newSocketId;
  }

  addMessage(room.state, `${playerName} yeniden bağlandı`, "info");
  return { room };
}

export function removePlayer(socketId: string): { room: Room | null; wasHost: boolean; playerName: string } {
  const room = getRoomBySocket(socketId);
  if (!room) return { room: null, wasHost: false, playerName: "" };

  const pIdx = room.state.players.findIndex(p => p.socketId === socketId);
  const playerName = pIdx >= 0 ? room.state.players[pIdx].name : "";
  const wasHost = room.hostSocketId === socketId;

  socketToRoom.delete(socketId);

  if (room.state.phase === "lobby") {
    room.state.players = room.state.players.filter(p => p.socketId !== socketId);
    if (room.state.players.length === 0) {
      rooms.delete(room.code);
      return { room: null, wasHost, playerName };
    }
    if (wasHost && room.state.players.length > 0) {
      room.hostSocketId = room.state.players[0].socketId;
    }
    addMessage(room.state, `${playerName} odadan ayrıldı`, "warning");
  } else {
    addMessage(room.state, `${playerName} bağlantısı kesildi`, "warning");
  }

  return { room, wasHost, playerName };
}

export function startGame(room: Room): string | null {
  const state = room.state;
  if (state.players.length < 2) return "En az 2 oyuncu gerekli!";

  const { regionDeck, materialEventDeck } = buildInitialDecks();
  let deck = [...materialEventDeck];

  state.players = state.players.map(p => {
    const hand = deck.splice(0, 5);
    return { ...p, hand, scoredRegions: [], points: 0, skippedNextTurn: false, blockedFromRegion: false };
  });

  const market: RegionCard[] = [];
  let regDeck = [...regionDeck];
  while (market.length < 3 && regDeck.length > 0) market.push(regDeck.shift()!);

  state.phase = "playing";
  state.drawDeck = deck;
  state.regionDeck = regDeck;
  state.marketRegions = market;
  state.discardPile = [];
  state.currentPlayerIndex = 0;
  state.winnerIndex = null;
  state.hasDrawnThisTurn = false;
  state.canEndTurn = false;
  state.doubledMarketRegionId = null;
  state.pendingEvent = null;
  state.cookingAnimation = null;
  state.messages = [];
  state.msgCounter = 0;

  addMessage(state, "🎉 Oyun başladı! İyi eğlenceler!", "success");
  addMessage(state, `${state.players[0].name}'ın sırası`, "info");
  return null;
}

function checkMaterials(hand: Card[], required: MaterialType[]): boolean {
  const mats = hand.filter((c): c is MaterialCard => c.type === "material");
  const req = [...required];
  for (const r of req) {
    const exact = mats.findIndex(m => m.materialType === r);
    if (exact !== -1) { mats.splice(exact, 1); continue; }
    const joker = mats.findIndex(m => m.materialType === "Joker");
    if (joker !== -1) { mats.splice(joker, 1); continue; }
    return false;
  }
  return true;
}

function consumeMaterials(hand: Card[], required: MaterialType[]): Card[] {
  let remaining = [...hand];
  for (const r of required) {
    const exactIdx = remaining.findIndex((c): c is MaterialCard => c.type === "material" && (c as MaterialCard).materialType === r);
    if (exactIdx !== -1) { remaining.splice(exactIdx, 1); continue; }
    const jokerIdx = remaining.findIndex((c): c is MaterialCard => c.type === "material" && (c as MaterialCard).materialType === "Joker");
    if (jokerIdx !== -1) remaining.splice(jokerIdx, 1);
  }
  return remaining;
}

export function handleDrawCard(room: Room, socketId: string): string | null {
  const state = room.state;
  if (state.phase !== "playing") return "Yanlış aşama!";
  const cur = state.players[state.currentPlayerIndex];
  if (cur.socketId !== socketId) return "Sıra sende değil!";
  if (state.hasDrawnThisTurn) return "Bu tur zaten kart çektin!";

  if (state.drawDeck.length === 0) {
    if (state.discardPile.length === 0) {
      state.phase = "game_over";
      const winner = [...state.players].sort((a, b) => b.points - a.points)[0];
      state.winnerIndex = state.players.findIndex(p => p.socketId === winner.socketId);
      addMessage(state, "Deste bitti! Oyun sona eriyor...", "warning");
      return null;
    }
    state.drawDeck = shuffle([...state.discardPile]);
    state.discardPile = [];
    addMessage(state, "Çöp destesi karıştırıldı!", "warning");
  }

  const drawn = state.drawDeck.shift()!;
  cur.hand.push(drawn);
  state.hasDrawnThisTurn = true;
  state.canEndTurn = true;
  const label = drawn.type === "material" ? (drawn as MaterialCard).name : drawn.type === "event" ? (drawn as EventCard).effectName : (drawn as RegionCard).dish;
  addMessage(state, `${cur.name} kart çekti`, "info");
  return null;
}

export function handleTryComplete(room: Room, socketId: string, regionId: string): string | null {
  const state = room.state;
  if (state.phase !== "playing") return "Yanlış aşama!";
  const cur = state.players[state.currentPlayerIndex];
  if (cur.socketId !== socketId) return "Sıra sende değil!";
  if (cur.blockedFromRegion) return "Bu tur bölge tamamlayamazsın! (Sıcak Hava Dalgası)";

  const region = state.marketRegions.find(r => r.id === regionId);
  if (!region) return "Bölge bulunamadı!";
  if (!checkMaterials(cur.hand, region.requiredMaterials)) return `Yeterli malzemen yok! (${region.requiredMaterials.join(", ")})`;

  cur.hand = consumeMaterials(cur.hand, region.requiredMaterials);
  state.marketRegions = state.marketRegions.filter(r => r.id !== regionId);
  if (state.regionDeck.length > 0) state.marketRegions.push(state.regionDeck.shift()!);

  const isDoubled = state.doubledMarketRegionId === regionId;
  const earned = isDoubled ? region.points * 2 : region.points;
  cur.points += earned;
  cur.scoredRegions.push(region);
  if (isDoubled) state.doubledMarketRegionId = null;

  state.cookingAnimation = regionId;
  setTimeout(() => { if (room.state.cookingAnimation === regionId) room.state.cookingAnimation = null; }, 1500);

  addMessage(state, `🍽️ ${cur.name}, ${region.name} - ${region.dish} tamamladı! +${earned} puan${isDoubled ? " (2x!)" : ""}`, "success");

  if (cur.points >= state.victoryPoints) {
    state.phase = "game_over";
    state.winnerIndex = state.currentPlayerIndex;
    addMessage(state, `🏆 ${cur.name} kazandı! ${cur.points} puan!`, "success");
  }

  return null;
}

export function handleUseEventCard(room: Room, socketId: string, cardId: string): { error?: string; needsTarget?: boolean } {
  const state = room.state;
  if (state.phase !== "playing") return { error: "Yanlış aşama!" };
  const cur = state.players[state.currentPlayerIndex];
  if (cur.socketId !== socketId) return { error: "Sıra sende değil!" };

  const card = cur.hand.find(c => c.id === cardId) as EventCard | undefined;
  if (!card || card.type !== "event") return { error: "Geçersiz kart!" };

  if (card.action === "draw_two") {
    const drawn: Card[] = [];
    for (let i = 0; i < 2 && state.drawDeck.length > 0; i++) drawn.push(state.drawDeck.shift()!);
    cur.hand = cur.hand.filter(c => c.id !== cardId).concat(drawn);
    state.discardPile.push(card);
    addMessage(state, `🌿 ${cur.name} "Bereketli Topraklar" kullandı! 2 kart çekti.`, "event");
    return {};
  }

  if (card.action === "reshuffle_all") {
    // Collect ALL cards: draw + discard + all hands (excluding the played card)
    const allCards: Card[] = [...state.drawDeck, ...state.discardPile];
    state.players.forEach(p => {
      allCards.push(...p.hand.filter(c => c.id !== cardId));
      p.hand = [];
    });
    const shuffled = shuffle(allCards);
    let idx = 0;
    state.players.forEach(p => {
      p.hand = [];
      for (let i = 0; i < 5 && idx < shuffled.length; i++) p.hand.push(shuffled[idx++]);
    });
    state.drawDeck = shuffled.slice(idx);
    state.discardPile = [];
    addMessage(state, `🌊 ${cur.name} "Asi Nehri Taştı" kullandı! Herkes yeniden çekti.`, "event");
    return {};
  }

  if (card.action === "block_region") {
    state.players.forEach((p, i) => {
      if (i !== state.currentPlayerIndex) p.blockedFromRegion = true;
    });
    cur.hand = cur.hand.filter(c => c.id !== cardId);
    state.discardPile.push(card);
    addMessage(state, `☀️ ${cur.name} "Sıcak Hava Dalgası" kullandı! Diğer oyuncular bir tur bölge tamamlayamaz.`, "event");
    return {};
  }

  if (card.action === "multiply_points") {
    if (state.marketRegions.length === 0) return { error: "Markette bölge kartı yok!" };
    state.pendingEvent = card;
    state.phase = "event_pending";
    return { needsTarget: true };
  }

  if (card.action === "skip_turn" || card.action === "steal_card" || card.action === "trade_two") {
    state.pendingEvent = card;
    state.phase = "event_pending";
    return { needsTarget: true };
  }

  return { error: "Bilinmeyen kart etkisi!" };
}

export function handleResolveEvent(room: Room, socketId: string, targetPlayerId?: number, cardIds?: string[]): string | null {
  const state = room.state;
  if (state.phase !== "event_pending" || !state.pendingEvent) return "Bekleyen olay yok!";
  const cur = state.players[state.currentPlayerIndex];
  if (cur.socketId !== socketId) return "Sıra sende değil!";

  const card = state.pendingEvent;

  if (card.action === "multiply_points") {
    if (!cardIds?.length) return "Bölge seçilmedi!";
    const regionId = cardIds[0];
    const region = state.marketRegions.find(r => r.id === regionId);
    if (!region) return "Bölge bulunamadı!";
    cur.hand = cur.hand.filter(c => c.id !== card.id);
    state.discardPile.push(card);
    state.doubledMarketRegionId = regionId;
    state.pendingEvent = null;
    state.phase = "playing";
    addMessage(state, `🧁 ${cur.name} "Künefe Şöleni" kullandı! ${region.name} - ${region.dish} kartı 2x puan!`, "event");
    return null;
  }

  if (card.action === "skip_turn") {
    if (targetPlayerId === undefined) return "Hedef seçilmedi!";
    const target = state.players[targetPlayerId];
    if (!target) return "Hedef bulunamadı!";
    target.skippedNextTurn = true;
    cur.hand = cur.hand.filter(c => c.id !== card.id);
    state.discardPile.push(card);
    state.pendingEvent = null;
    state.phase = "playing";
    addMessage(state, `🌶️ ${cur.name} "${card.effectName}" kullandı! ${target.name} sırasını atlıyor.`, "event");
    return null;
  }

  if (card.action === "steal_card") {
    if (targetPlayerId === undefined) return "Hedef seçilmedi!";
    const target = state.players[targetPlayerId];
    if (!target || target.hand.length === 0) return "Hedef oyuncunun eli boş!";
    const stolenIdx = Math.floor(Math.random() * target.hand.length);
    const stolen = target.hand[stolenIdx];
    target.hand.splice(stolenIdx, 1);
    cur.hand = cur.hand.filter(c => c.id !== card.id);
    cur.hand.push(stolen);
    state.discardPile.push(card);
    state.pendingEvent = null;
    state.phase = "playing";
    addMessage(state, `🤝 ${cur.name} "${card.effectName}" kullandı! ${target.name}'den kart çaldı.`, "event");
    return null;
  }

  if (card.action === "trade_two") {
    if (targetPlayerId === undefined || !cardIds || cardIds.length < 2) return "Takas için 2 kart ve hedef seçilmeli!";
    const target = state.players[targetPlayerId];
    if (!target || target.hand.length < 2) return "Hedef oyuncunun yeterli kartı yok!";
    const myCards = cardIds.slice(0, 2);
    const targetCards = target.hand.slice(0, 2).map(c => c.id);
    const myKept = cur.hand.filter(c => c.id !== card.id && !myCards.includes(c.id));
    const myGained = target.hand.filter(c => targetCards.includes(c.id));
    const targetKept = target.hand.filter(c => !targetCards.includes(c.id));
    const targetGained = cur.hand.filter(c => myCards.includes(c.id));
    cur.hand = [...myKept, ...myGained];
    target.hand = [...targetKept, ...targetGained];
    state.discardPile.push(card);
    state.pendingEvent = null;
    state.phase = "playing";
    addMessage(state, `🏪 ${cur.name} "Esnaf Dayanışması" kullandı! ${target.name} ile 2 kart takas etti.`, "event");
    return null;
  }

  state.pendingEvent = null;
  state.phase = "playing";
  return null;
}

export function handleEndTurn(room: Room, socketId: string): string | null {
  const state = room.state;
  if (state.phase !== "playing") return "Yanlış aşama!";
  const cur = state.players[state.currentPlayerIndex];
  if (cur.socketId !== socketId) return "Sıra sende değil!";
  if (!state.hasDrawnThisTurn && !state.canEndTurn) return "Önce kart çekmelisin!";

  const numPlayers = state.players.length;

  // Clear current player's block
  cur.blockedFromRegion = false;

  let nextIdx = (state.currentPlayerIndex + 1) % numPlayers;
  let skipped = 0;
  while (state.players[nextIdx].skippedNextTurn && skipped < numPlayers) {
    addMessage(state, `${state.players[nextIdx].name} sırasını atlıyor!`, "warning");
    state.players[nextIdx].skippedNextTurn = false;
    nextIdx = (nextIdx + 1) % numPlayers;
    skipped++;
  }

  state.currentPlayerIndex = nextIdx;
  state.hasDrawnThisTurn = false;
  state.canEndTurn = false;
  addMessage(state, `${state.players[nextIdx].name}'ın sırası`, "info");
  return null;
}

export function buildPlayerView(room: Room, playerIndex: number) {
  const state = room.state;
  const me = state.players[playerIndex];
  const isMyTurn = playerIndex === state.currentPlayerIndex;

  return {
    roomCode: room.code,
    hostSocketId: room.hostSocketId,
    myPlayerIndex: playerIndex,
    phase: state.phase,
    players: state.players.map(p => ({
      name: p.name,
      cardCount: p.hand.length,
      points: p.points,
      scoredRegions: p.scoredRegions,
      skippedNextTurn: p.skippedNextTurn,
      blockedFromRegion: p.blockedFromRegion,
    })),
    myHand: me?.hand ?? [],
    currentPlayerIndex: state.currentPlayerIndex,
    marketRegions: state.marketRegions,
    drawDeckSize: state.drawDeck.length,
    discardPileSize: state.discardPile.length,
    regionDeckSize: state.regionDeck.length,
    doubledMarketRegionId: state.doubledMarketRegionId,
    messages: state.messages,
    winnerIndex: state.winnerIndex,
    hasDrawnThisTurn: isMyTurn ? state.hasDrawnThisTurn : false,
    canEndTurn: isMyTurn ? state.canEndTurn : false,
    pendingEvent: isMyTurn && state.phase === "event_pending" ? state.pendingEvent : null,
    cookingAnimation: state.cookingAnimation,
    victoryPoints: state.victoryPoints,
  };
}
