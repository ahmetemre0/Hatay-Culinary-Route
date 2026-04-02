import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { Card, EventCard, FoodCard } from "../data/cards";
import { useVersionStore } from "../../store/versionStore";

export type OnlineMessage = {
  id: number;
  text: string;
  type: "info" | "success" | "warning" | "event";
};

export type ChatMessage = {
  id: number;
  playerName: string;
  text: string;
  timestamp: number;
};

export type OnlinePlayerInfo = {
  name: string;
  cardCount: number;
  points: number;
  scoredFoods: FoodCard[];
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
  marketFoods: FoodCard[];
  drawDeckSize: number;
  discardPileSize: number;
  foodDeckSize: number;
  doubledMarketFoodIds: string[];
  messages: OnlineMessage[];
  winnerIndex: number | null;
  hasDrawnThisTurn: boolean;
  canEndTurn: boolean;
  pendingEvent: EventCard | null;
  cookingAnimation: string | null;
  victoryPoints: number;
};

const SESSION_KEY = "hatay_dev_game_session";

function saveSession(roomCode: string, username: string, playerName: string) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, username, playerName })); } catch {}
}

function loadSession(): { roomCode: string; username: string; playerName: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

function getRoomCodeFromUrl(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("room");
  } catch { return null; }
}

function setUrlRoomCode(code: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("room", code);
    window.history.replaceState(null, "", url.toString());
  } catch {}
}

function clearUrlRoomCode() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    window.history.replaceState(null, "", url.toString());
  } catch {}
}

const urlRoomCode = getRoomCodeFromUrl();
const savedSession = loadSession();
const initialRoomCode = urlRoomCode ?? savedSession?.roomCode ?? "";
const initialPlayerName = savedSession?.playerName ?? "";

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
  marketFoods: FoodCard[];
  drawDeckSize: number;
  discardPileSize: number;
  foodDeckSize: number;
  doubledMarketFoodIds: string[];
  messages: OnlineMessage[];
  winnerIndex: number | null;
  hasDrawnThisTurn: boolean;
  canEndTurn: boolean;
  pendingEvent: EventCard | null;
  cookingAnimation: string | null;
  victoryPoints: number;
  selectedCards: string[];

  chatMessages: ChatMessage[];

  connect: () => void;
  disconnect: () => void;
  setPlayerName: (name: string) => void;
  setRoomCode: (code: string) => void;
  createRoom: (username?: string) => void;
  joinRoom: (code: string, username?: string) => void;
  startGame: () => void;
  leaveRoom: () => void;
  drawCard: () => void;
  selectCard: (cardId: string) => void;
  tryComplete: (foodId: string) => void;
  useEventCard: (cardId: string) => void;
  resolveEvent: (targetPlayerId?: number, cardIds?: string[]) => void;
  cancelEvent: () => void;
  endTurn: () => void;
  clearError: () => void;
  resetOnline: () => void;
  checkRoomVersion: (code: string, cb: (version: "stable" | "dev" | null) => void) => void;
  sendChatMessage: (text: string) => void;
};

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function getSocketUrl(): string {
  return "https://hatay-culinary-route.onrender.com";
}

export const useOnlineStore = create<OnlineState>((set, get) => ({
  socket: null,
  connected: false,
  onlinePhase: "idle",
  errorMessage: null,

  playerName: initialPlayerName,
  roomCode: initialRoomCode,
  isHost: false,
  myPlayerIndex: -1,

  players: [],
  myHand: [],
  currentPlayerIndex: 0,
  marketFoods: [],
  drawDeckSize: 0,
  discardPileSize: 0,
  foodDeckSize: 0,
  doubledMarketFoodIds: [],
  messages: [],
  winnerIndex: null,
  hasDrawnThisTurn: false,
  canEndTurn: false,
  pendingEvent: null,
  cookingAnimation: null,
  victoryPoints: 31,
  selectedCards: [],
  chatMessages: [],

  connect: () => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(getSocketUrl(), {
      path: "/api/socket.io",
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      set({ connected: true, errorMessage: null });

      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (socket.connected) socket.emit("client_ping");
      }, 25000);

      const session = loadSession();
      const urlRoom = getRoomCodeFromUrl();
      const roomCode = urlRoom ?? session?.roomCode;
      const username = session?.username;
      const playerName = session?.playerName ?? get().playerName;

      if (roomCode && (username || playerName)) {
        socket.emit("rejoin_room", { roomCode, playerName: playerName, username });
      }
    });

    socket.on("disconnect", (reason) => {
      set({ connected: false });
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (reason === "io server disconnect") socket.connect();
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
    });

    socket.on("room_joined", ({ roomCode, version }: { roomCode: string; version?: "stable" | "dev" }) => {
      const { playerName } = get();
      const session = loadSession();
      saveSession(roomCode, session?.username ?? "", playerName);
      setUrlRoomCode(roomCode);
      set({ roomCode, onlinePhase: "waiting_room" });
      if (version && version !== "dev") {
        useVersionStore.getState().setVersion(version);
      }
    });

    socket.on("rejoin_ok", () => {
      set({ errorMessage: null });
    });

    socket.on("rejoin_failed", ({ message }: { message: string }) => {
      clearSession();
      clearUrlRoomCode();
      set({ errorMessage: message, onlinePhase: "idle", roomCode: "" });
    });

    socket.on("game_state", (view: PlayerView) => {
      const state = get();
      const isHost = socket.id === view.hostSocketId;

      let onlinePhase: OnlinePhase = "waiting_room";
      if (view.phase === "playing") onlinePhase = "playing";
      else if (view.phase === "event_pending") onlinePhase = "event_pending";
      else if (view.phase === "game_over") onlinePhase = "game_over";
      else if (view.phase === "lobby") onlinePhase = "waiting_room";

      if (onlinePhase === "game_over") {
        clearSession();
        clearUrlRoomCode();
      }

      set({
        myPlayerIndex: view.myPlayerIndex,
        players: view.players,
        myHand: view.myHand,
        currentPlayerIndex: view.currentPlayerIndex,
        marketFoods: view.marketFoods,
        drawDeckSize: view.drawDeckSize,
        discardPileSize: view.discardPileSize,
        foodDeckSize: view.foodDeckSize,
        doubledMarketFoodIds: view.doubledMarketFoodIds ?? [],
        messages: view.messages,
        winnerIndex: view.winnerIndex,
        hasDrawnThisTurn: view.hasDrawnThisTurn,
        canEndTurn: view.canEndTurn,
        pendingEvent: view.pendingEvent,
        cookingAnimation: view.cookingAnimation,
        victoryPoints: view.victoryPoints,
        isHost,
        roomCode: view.roomCode,
        onlinePhase,
        selectedCards: state.selectedCards,
      });
    });

    socket.on("error_msg", ({ message }: { message: string }) => {
      set({ errorMessage: message });
    });

    socket.on("chat_history", (history: Array<{ id: number; playerName: string; text: string; timestamp: number }>) => {
      set({
        chatMessages: history.map((m) => ({
          id: m.id,
          playerName: m.playerName,
          text: m.text,
          timestamp: m.timestamp,
        })),
      });
    });

    socket.on("receive_chat", (msg: { playerName: string; text: string; timestamp: number }) => {
      set((state) => ({
        chatMessages: [
          ...state.chatMessages,
          { id: Date.now() + Math.random(), playerName: msg.playerName, text: msg.text, timestamp: msg.timestamp },
        ].slice(-100),
      }));
    });

    set({ socket });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentSocket = get().socket;
        if (currentSocket && !currentSocket.connected) {
          console.log("[Socket] Tab visible, reconnecting...");
          currentSocket.connect();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
  },

  disconnect: () => {
    const { socket } = get();
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    socket?.disconnect();
    set({ socket: null, connected: false });
  },

  setPlayerName: (name) => set({ playerName: name }),
  setRoomCode: (code) => set({ roomCode: code }),

  createRoom: (username) => {
    const { socket, playerName } = get();
    if (!socket || !playerName.trim()) return;
    const name = playerName.trim();
    saveSession("", username ?? "", name);
    socket.emit("create_room", { playerName: name, version: "dev", username });
    set({ playerName: name });
  },

  joinRoom: (code, username) => {
    const { socket, playerName } = get();
    if (!socket || !playerName.trim() || !code.trim()) return;
    const name = playerName.trim();
    const roomCode = code.trim().toUpperCase();
    saveSession(roomCode, username ?? "", name);
    socket.emit("join_room", { roomCode, playerName: name, username });
    set({ playerName: name });
  },

  startGame: () => { get().socket?.emit("start_game"); },

  leaveRoom: () => {
    get().socket?.emit("leave_room");
    clearSession();
    clearUrlRoomCode();
    set({ onlinePhase: "idle", roomCode: "", isHost: false, players: [], myHand: [], messages: [], chatMessages: [] });
  },

  drawCard: () => { get().socket?.emit("draw_card"); },

  selectCard: (cardId) => {
    const state = get();
    const selected = state.selectedCards.includes(cardId)
      ? state.selectedCards.filter((id) => id !== cardId)
      : [...state.selectedCards, cardId];
    set({ selectedCards: selected });
  },

  tryComplete: (foodId) => {
    const { socket, selectedCards } = get();
    socket?.emit("try_complete", { regionId: foodId, selectedCards });
    set({ selectedCards: [] });
  },

  useEventCard: (cardId) => { get().socket?.emit("use_event_card", { cardId }); },

  resolveEvent: (targetPlayerId, cardIds) => {
    get().socket?.emit("resolve_event", { targetPlayerId, cardIds });
    set({ selectedCards: [] });
  },

  cancelEvent: () => { get().socket?.emit("cancel_event"); },

  endTurn: () => { get().socket?.emit("end_turn"); },

  sendChatMessage: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    get().socket?.emit("send_chat", { text: trimmed });
  },

  clearError: () => set({ errorMessage: null }),

  checkRoomVersion: (code, cb) => {
    const { socket } = get();
    if (!socket) { cb(null); return; }
    socket.once("room_version_result", ({ version, error }: { version: "stable" | "dev" | null; error?: string }) => {
      if (error) { cb(null); return; }
      cb(version);
    });
    socket.emit("check_room_version", { roomCode: code.toUpperCase() });
  },

  resetOnline: () => {
    const { socket } = get();
    socket?.emit("leave_room");
    socket?.disconnect();
    clearSession();
    clearUrlRoomCode();
    set({
      socket: null, connected: false, onlinePhase: "idle", errorMessage: null,
      playerName: "", roomCode: "", isHost: false, myPlayerIndex: -1,
      players: [], myHand: [], currentPlayerIndex: 0,
      marketFoods: [], drawDeckSize: 0, discardPileSize: 0, foodDeckSize: 0,
      doubledMarketFoodIds: [], messages: [], winnerIndex: null,
      hasDrawnThisTurn: false, canEndTurn: false, pendingEvent: null,
      cookingAnimation: null, selectedCards: [], chatMessages: [],
    });
  },
}));

export function persistSession(roomCode: string, playerName: string) {
  saveSession(roomCode, "", playerName);
}
