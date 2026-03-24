import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import { Card, EventCard, FoodCard } from "../data/cards";

export type OnlineMessage = {
  id: number;
  text: string;
  type: "info" | "success" | "warning" | "event";
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
  doubledMarketFoodId: string | null;
  messages: OnlineMessage[];
  winnerIndex: number | null;
  hasDrawnThisTurn: boolean;
  canEndTurn: boolean;
  pendingEvent: EventCard | null;
  cookingAnimation: string | null;
  victoryPoints: number;
};


const SESSION_KEY = "hatay_game_session";

function saveSession(roomCode: string, playerName: string) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerName })); } catch {}
}

function loadSession(): { roomCode: string; playerName: string } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}


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
  doubledMarketFoodId: string | null;
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
  tryComplete: (foodId: string) => void;
  useEventCard: (cardId: string) => void;
  resolveEvent: (targetPlayerId?: number, cardIds?: string[]) => void;
  cancelEvent: () => void;
  endTurn: () => void;
  clearError: () => void;
  resetOnline: () => void;
};


function getSocketUrl(): string {
  return "https://hatay-culinary-route.onrender.com";
}
let heartbeatInterval: any = null; // Kalp atışı referansı
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
  marketFoods: [],
  drawDeckSize: 0,
  discardPileSize: 0,
  foodDeckSize: 0,
  doubledMarketFoodId: null,
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

    // 1. ZIRH: Sadece websocket ve sınırsız yeniden deneme
    const socket = io(getSocketUrl(), {
      path: "/api/socket.io",
      transports: ["websocket"], 
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000, // Timeout süresini belirginleştir
    });

    socket.on("connect", () => {
      set({ connected: true, errorMessage: null });
      
      // 2. ZIRH: Manuel Kalp Atışı (Render/Browser'ı uyanık tutar)
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (socket.connected) socket.emit("client_ping");
      }, 25000); // 25 saniyede bir vur

      const session = loadSession();
      if (session) {
        const state = get();
        if (state.onlinePhase !== "idle" && state.onlinePhase !== "waiting_room") {
          socket.emit("rejoin_room", { roomCode: session.roomCode, playerName: session.playerName });
        }
      }
    });

    socket.on("disconnect", (reason) => { 
      set({ connected: false }); 
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      
      // Eğer sunucu zorla kapattıysa tekrar bağlanmaya çalış
      if (reason === "io server disconnect") {
        socket.connect();
      }
    });

    socket.on("connect_error", (err) => { 
      // Sadece arayüzde gösterme, konsola da bas
      console.warn("Socket Bağlantı Hatası:", err.message);
      // Geçici hatalarda errorMessage basıp kullanıcıyı darlamamak için burayı sessiz tutabilirsin.
    });

    socket.on("room_joined", ({ roomCode }: { roomCode: string }) => {
      const { playerName } = get();
      saveSession(roomCode, playerName);
      set({ roomCode, onlinePhase: "waiting_room" });
    });

    socket.on("rejoin_ok", () => { set({ errorMessage: null }); });
    socket.on("rejoin_failed", ({ message }: { message: string }) => {
      clearSession();
      set({ errorMessage: message, onlinePhase: "idle" });
    });

    socket.on("game_state", (view: PlayerView) => {
      const state = get();
      const isHost = socket.id === view.hostSocketId;

      let onlinePhase: OnlinePhase = "waiting_room";
      if (view.phase === "playing") onlinePhase = "playing";
      else if (view.phase === "event_pending") onlinePhase = "event_pending";
      else if (view.phase === "game_over") onlinePhase = "game_over";
      else if (view.phase === "lobby") onlinePhase = "waiting_room";

      if (onlinePhase === "game_over") clearSession();

      set({
        myPlayerIndex: view.myPlayerIndex,
        players: view.players,
        myHand: view.myHand,
        currentPlayerIndex: view.currentPlayerIndex,
        marketFoods: view.marketFoods,
        drawDeckSize: view.drawDeckSize,
        discardPileSize: view.discardPileSize,
        foodDeckSize: view.foodDeckSize,
        doubledMarketFoodId: view.doubledMarketFoodId,
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

    socket.on("error_msg", ({ message }: { message: string }) => { set({ errorMessage: message }); });

    set({ socket });

    // 3. ZIRH: Sekme Uyandırma (Mobile/Desktop Tab Sleeping)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentSocket = get().socket;
        if (currentSocket && !currentSocket.connected) {
          console.log("Sekme uyandı, bağlantı koptuğu için yeniden bağlanılıyor...");
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

  createRoom: () => {
    const { socket, playerName } = get();
    if (!socket || !playerName.trim()) return;
    const name = playerName.trim();
    socket.emit("create_room", { playerName: name });
    set({ playerName: name });
  },

  joinRoom: (code) => {
    const { socket, playerName } = get();
    if (!socket || !playerName.trim() || !code.trim()) return;
    const name = playerName.trim();
    const roomCode = code.trim().toUpperCase();
    socket.emit("join_room", { roomCode, playerName: name });
    set({ playerName: name });
  },

  startGame: () => { get().socket?.emit("start_game"); },

  leaveRoom: () => {
    get().socket?.emit("leave_room");
    clearSession();
    set({ onlinePhase: "idle", roomCode: "", isHost: false, players: [], myHand: [], messages: [] });
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

  clearError: () => set({ errorMessage: null }),

  resetOnline: () => {
    const { socket } = get();
    socket?.emit("leave_room");
    socket?.disconnect();
    clearSession();
    set({
      socket: null, connected: false, onlinePhase: "idle", errorMessage: null,
      playerName: "", roomCode: "", isHost: false, myPlayerIndex: -1,
      players: [], myHand: [], currentPlayerIndex: 0,
      marketFoods: [], drawDeckSize: 0, discardPileSize: 0, foodDeckSize: 0,
      doubledMarketFoodId: null, messages: [], winnerIndex: null,
      hasDrawnThisTurn: false, canEndTurn: false, pendingEvent: null,
      cookingAnimation: null, selectedCards: [],
    });
  },
}));

export function persistSession(roomCode: string, playerName: string) {
  saveSession(roomCode, playerName);
}
