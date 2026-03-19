import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { Card, EventCard, RegionCard } from "../data/cards";

export type OnlineMessage = {
  id: number;
  text: string;
  type: "info" | "success" | "warning" | "event";
};

export type OnlinePlayerInfo = {
  name: string;
  cardCount: number;
  points: number;
  scoredRegions: RegionCard[];
  skippedNextTurn: boolean;
  blockedFromRegion: boolean;
};

export type OnlinePhase =
  | "idle"
  | "waiting_room"
  | "playing"
  | "event_pending"
  | "game_over";

export type PlayerView = {
  roomCode: string;
  hostSocketId: string;
  myPlayerIndex: number;
  phase: "lobby" | "playing" | "event_pending" | "game_over";
  players: OnlinePlayerInfo[];
  myHand: Card[];
  currentPlayerIndex: number;
  marketRegions: RegionCard[];
  drawDeckSize: number;
  discardPileSize: number;
  regionDeckSize: number;
  doubledMarketRegionId: string | null;
  messages: OnlineMessage[];
  winnerIndex: number | null;
  hasDrawnThisTurn: boolean;
  canEndTurn: boolean;
  pendingEvent: EventCard | null;
  cookingAnimation: string | null;
  victoryPoints: number;
};

type OnlineState = {
  socket: Socket | null;
  connected: boolean;
  onlinePhase: OnlinePhase;
  errorMessage: string | null;

  playerName: string;
  roomCode: string;
  isHost: boolean;
  myPlayerIndex: number;

  players: OnlinePlayerInfo[];
  myHand: Card[];
  currentPlayerIndex: number;
  marketRegions: RegionCard[];
  drawDeckSize: number;
  discardPileSize: number;
  regionDeckSize: number;
  doubledMarketRegionId: string | null;
  messages: OnlineMessage[];
  winnerIndex: number | null;
  hasDrawnThisTurn: boolean;
  canEndTurn: boolean;
  pendingEvent: EventCard | null;
  cookingAnimation: string | null;
  victoryPoints: number;
  selectedCards: string[];

  connect: () => void;
  disconnect: () => void;
  setPlayerName: (name: string) => void;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  startGame: () => void;
  leaveRoom: () => void;
  drawCard: () => void;
  selectCard: (cardId: string) => void;
  tryComplete: (regionId: string) => void;
  useEventCard: (cardId: string) => void;
  resolveEvent: (targetPlayerId?: number, cardIds?: string[]) => void;
  cancelEvent: () => void;
  endTurn: () => void;
  clearError: () => void;
  resetOnline: () => void;
};

function getSocketUrl(): string {
  return window.location.origin;
}

export const useOnlineStore = create<OnlineState>((set, get) => ({
  socket: null,
  connected: false,
  onlinePhase: "idle",
  errorMessage: null,

  playerName: "",
  roomCode: "",
  isHost: false,
  myPlayerIndex: -1,

  players: [],
  myHand: [],
  currentPlayerIndex: 0,
  marketRegions: [],
  drawDeckSize: 0,
  discardPileSize: 0,
  regionDeckSize: 0,
  doubledMarketRegionId: null,
  messages: [],
  winnerIndex: null,
  hasDrawnThisTurn: false,
  canEndTurn: false,
  pendingEvent: null,
  cookingAnimation: null,
  victoryPoints: 50,
  selectedCards: [],

  connect: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(getSocketUrl(), {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      set({ connected: true, errorMessage: null });
    });

    socket.on("disconnect", () => {
      set({ connected: false });
    });

    socket.on("connect_error", (err) => {
      set({ errorMessage: `Bağlantı hatası: ${err.message}` });
    });

    socket.on("room_joined", ({ roomCode }: { roomCode: string }) => {
      set({ roomCode, onlinePhase: "waiting_room" });
    });

    socket.on("game_state", (view: PlayerView) => {
      const state = get();
      const isHost = view.players[0]?.name === state.players[0]?.name
        ? state.isHost
        : socket.id === view.hostSocketId;

      let onlinePhase: OnlinePhase = "waiting_room";
      if (view.phase === "playing") onlinePhase = "playing";
      else if (view.phase === "event_pending") onlinePhase = "event_pending";
      else if (view.phase === "game_over") onlinePhase = "game_over";
      else if (view.phase === "lobby") onlinePhase = "waiting_room";

      set({
        myPlayerIndex: view.myPlayerIndex,
        players: view.players,
        myHand: view.myHand,
        currentPlayerIndex: view.currentPlayerIndex,
        marketRegions: view.marketRegions,
        drawDeckSize: view.drawDeckSize,
        discardPileSize: view.discardPileSize,
        regionDeckSize: view.regionDeckSize,
        doubledMarketRegionId: view.doubledMarketRegionId,
        messages: view.messages,
        winnerIndex: view.winnerIndex,
        hasDrawnThisTurn: view.hasDrawnThisTurn,
        canEndTurn: view.canEndTurn,
        pendingEvent: view.pendingEvent,
        cookingAnimation: view.cookingAnimation,
        victoryPoints: view.victoryPoints,
        isHost: socket.id === view.hostSocketId,
        roomCode: view.roomCode,
        onlinePhase,
        selectedCards: [],
      });
    });

    socket.on("error_msg", ({ message }: { message: string }) => {
      set({ errorMessage: message });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    socket?.disconnect();
    set({ socket: null, connected: false });
  },

  setPlayerName: (name) => set({ playerName: name }),

  createRoom: () => {
    const { socket, playerName } = get();
    if (!socket || !playerName.trim()) return;
    socket.emit("create_room", { playerName: playerName.trim() });
  },

  joinRoom: (code) => {
    const { socket, playerName } = get();
    if (!socket || !playerName.trim() || !code.trim()) return;
    socket.emit("join_room", { roomCode: code.trim().toUpperCase(), playerName: playerName.trim() });
  },

  startGame: () => {
    const { socket } = get();
    socket?.emit("start_game");
  },

  leaveRoom: () => {
    const { socket } = get();
    socket?.emit("leave_room");
    set({
      onlinePhase: "idle",
      roomCode: "",
      isHost: false,
      players: [],
      myHand: [],
      messages: [],
    });
  },

  drawCard: () => {
    const { socket } = get();
    socket?.emit("draw_card");
  },

  selectCard: (cardId) => {
    const state = get();
    const selected = state.selectedCards.includes(cardId)
      ? state.selectedCards.filter((id) => id !== cardId)
      : [...state.selectedCards, cardId];
    set({ selectedCards: selected });
  },

  tryComplete: (regionId) => {
    const { socket } = get();
    socket?.emit("try_complete", { regionId });
  },

  useEventCard: (cardId) => {
    const { socket } = get();
    socket?.emit("use_event_card", { cardId });
  },

  resolveEvent: (targetPlayerId, cardIds) => {
    const { socket } = get();
    socket?.emit("resolve_event", { targetPlayerId, cardIds });
    set({ selectedCards: [] });
  },

  cancelEvent: () => {
    const { socket } = get();
    socket?.emit("cancel_event");
  },

  endTurn: () => {
    const { socket } = get();
    socket?.emit("end_turn");
  },

  clearError: () => set({ errorMessage: null }),

  resetOnline: () => {
    const { socket } = get();
    socket?.emit("leave_room");
    socket?.disconnect();
    set({
      socket: null,
      connected: false,
      onlinePhase: "idle",
      errorMessage: null,
      playerName: "",
      roomCode: "",
      isHost: false,
      myPlayerIndex: -1,
      players: [],
      myHand: [],
      currentPlayerIndex: 0,
      marketRegions: [],
      drawDeckSize: 0,
      discardPileSize: 0,
      regionDeckSize: 0,
      doubledMarketRegionId: null,
      messages: [],
      winnerIndex: null,
      hasDrawnThisTurn: false,
      canEndTurn: false,
      pendingEvent: null,
      cookingAnimation: null,
      selectedCards: [],
    });
  },
}));
