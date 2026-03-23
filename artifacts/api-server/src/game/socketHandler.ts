import { Server, Socket } from "socket.io";
import {
  createRoom, joinRoom, rejoinRoom, getRoomBySocket, removePlayer, startGame,
  handleDrawCard, handleTryComplete, handleUseEventCard, handleResolveEvent,
  handleEndTurn, buildPlayerView, handleRematch, Room,
} from "./roomManager.js";

function emitAll(io: Server, room: Room) {
  room.state.players.forEach((p, i) => {
    const view = buildPlayerView(room, i);
    io.to(p.socketId).emit("game_state", view);
  });
}

export function setupSocketHandler(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("create_room", ({ playerName }: { playerName: string }) => {
      try {
        const room = createRoom(socket.id, playerName);
        socket.join(room.code);
        socket.emit("room_joined", { roomCode: room.code });
        emitAll(io, room);
      } catch (e) {
        socket.emit("error_msg", { message: String(e) });
      }
    });

    socket.on("join_room", ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
      try {
        const { room, error } = joinRoom(socket.id, roomCode, playerName);
        if (error) { socket.emit("error_msg", { message: error }); return; }
        socket.join(room.code);
        socket.emit("room_joined", { roomCode: room.code });
        emitAll(io, room);
      } catch (e) {
        socket.emit("error_msg", { message: String(e) });
      }
    });

    socket.on("start_game", ({ targetPoints }: { targetPoints?: number } = {}) => {
      const room = getRoomBySocket(socket.id);
      if (!room) { socket.emit("error_msg", { message: "Oda bulunamadı!" }); return; }
      if (room.hostSocketId !== socket.id) { socket.emit("error_msg", { message: "Sadece oda sahibi başlatabilir!" }); return; }
      const err = startGame(room, targetPoints);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      emitAll(io, room);
    });

    socket.on("rematch", ({ targetPoints }: { targetPoints?: number } = {}) => {
      const room = getRoomBySocket(socket.id);
      if (!room) { socket.emit("error_msg", { message: "Oda bulunamadı!" }); return; }
      const err = handleRematch(room, socket.id, targetPoints);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      emitAll(io, room);
    });

    socket.on("draw_card", () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const err = handleDrawCard(room, socket.id);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      emitAll(io, room);
    });

    socket.on("try_complete", ({ regionId, selectedCards }: { regionId: string; selectedCards?: string[] }) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const err = handleTryComplete(room, socket.id, regionId, selectedCards);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      // send animation to all
      emitAll(io, room);
      setTimeout(() => {
        if (room.state.cookingAnimation) {
          room.state.cookingAnimation = null;
          emitAll(io, room);
        }
      }, 1500);
    });

    socket.on("use_event_card", ({ cardId }: { cardId: string }) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const result = handleUseEventCard(room, socket.id, cardId);
      if (result.error) { socket.emit("error_msg", { message: result.error }); return; }
      emitAll(io, room);
    });

    socket.on("resolve_event", ({ targetPlayerId, cardIds }: { targetPlayerId?: number; cardIds?: string[] }) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const err = handleResolveEvent(room, socket.id, targetPlayerId, cardIds);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      emitAll(io, room);
    });

    socket.on("cancel_event", () => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.state.pendingEvent) return;
      room.state.phase = "playing";
      room.state.pendingEvent = null;
      emitAll(io, room);
    });

    socket.on("end_turn", () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const err = handleEndTurn(room, socket.id);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      emitAll(io, room);
    });

    socket.on("rejoin_room", ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
      try {
        const { room, error } = rejoinRoom(socket.id, roomCode, playerName);
        if (error || !room) { socket.emit("rejoin_failed", { message: error ?? "Yeniden bağlanılamadı!" }); return; }
        socket.join(room.code);
        socket.emit("rejoin_ok");
        emitAll(io, room);
      } catch (e) {
        socket.emit("rejoin_failed", { message: String(e) });
      }
    });

    socket.on("leave_room", () => {
      const { room } = removePlayer(socket.id);
      socket.leave(room?.code ?? "");
      if (room) emitAll(io, room);
    });

    // Keep-alive: client'den gelen ping'i işle
    socket.on("keep_alive", () => {
      // Socket hala aktif, hiçbir şey yapma
    });

    socket.on("disconnect", () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;

      const pIdx = room.state.players.findIndex(p => p.socketId === socket.id);
      if (pIdx === -1) return;

      const playerName = room.state.players[pIdx].name;
      const oldSocketId = socket.id;

      socketToRoom.delete(socket.id);
      addMessage(room.state, `${playerName} bağlantısı kesildi`, "warning");
      emitAll(io, room);

      // Grace period: 180 saniye içinde rejoin olmadığında oyuncuyu sil
      const timeout = setTimeout(() => {
        // Room hala exists mi kontrol et
        const currentRoom = rooms.get(room.code);
        if (!currentRoom) return;

        const stillConnected = currentRoom.state.players.find(p => p.socketId === oldSocketId);
        if (stillConnected) {
          currentRoom.state.players = currentRoom.state.players.filter(p => p.socketId !== oldSocketId);
          
          // Oyuncu sildikten sonra room boş olmuşsa ve oyun devam etmiyorsa sil
          if (currentRoom.state.players.length === 0 && currentRoom.state.phase !== "playing" && currentRoom.state.phase !== "event_pending") {
            rooms.delete(room.code);
          } else if (currentRoom.state.players.length > 0) {
            addMessage(currentRoom.state, `${playerName} oynayamadığı için çıkarıldı`, "warning");
            if (currentRoom.hostSocketId === oldSocketId && currentRoom.state.players.length > 0) {
              currentRoom.hostSocketId = currentRoom.state.players[0].socketId;
            }
            emitAll(io, currentRoom);
          }
        }
      }, 180000);

      room.disconnectTimeouts.set(oldSocketId, timeout);
    });
  });
}
