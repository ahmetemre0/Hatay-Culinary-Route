import { Server, Socket } from "socket.io";
import {
  createRoom, joinRoom, rejoinRoom, restoreRoomFromDb, getRoomBySocket, getRoom,
  removePlayer, startGame,
  handleDrawCard, handleTryComplete, handleUseEventCard, handleResolveEvent,
  handleEndTurn, buildPlayerView, Room,
} from "./roomManager.js";
import { saveRoom, loadRoom, deleteRoom } from "./db.js";

function emitAll(io: Server, room: Room) {
  room.state.players.forEach((p, i) => {
    const view = buildPlayerView(room, i);
    io.to(p.socketId).emit("game_state", view);
  });
}

function saveAsync(room: Room) {
  saveRoom(room.code, room.hostSocketId, room.state).catch(err => {
    console.error("[DB] Save error:", err);
  });
}

function scheduleDeleteIfGameOver(room: Room) {
  if (room.state.phase === "game_over") {
    setTimeout(() => {
      deleteRoom(room.code).catch(err => console.error("[DB] Delete error:", err));
    }, 60_000);
  }
}

async function resolveRoom(code: string): Promise<Room | null> {
  const inMemory = getRoom(code);
  if (inMemory) return inMemory;

  try {
    const dbData = await loadRoom(code.toUpperCase());
    if (!dbData) return null;
    console.log(`[DB] Restored room ${code} from database`);
    return restoreRoomFromDb(code, dbData.host_socket_id, dbData.state);
  } catch (err) {
    console.error("[DB] Load error:", err);
    return null;
  }
}

export function setupSocketHandler(io: Server) {
  io.on("connection", (socket: Socket) => {

    socket.on("client_ping", () => {
      socket.emit("server_pong");
    });

    socket.on("create_room", ({ playerName }: { playerName: string }) => {
      try {
        const room = createRoom(socket.id, playerName);
        socket.join(room.code);
        socket.emit("room_created", { roomCode: room.code });
        socket.emit("room_joined", { roomCode: room.code });
        saveAsync(room);
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
        saveAsync(room);
        emitAll(io, room);
      } catch (e) {
        socket.emit("error_msg", { message: String(e) });
      }
    });

    socket.on("start_game", () => {
      const room = getRoomBySocket(socket.id);
      if (!room) { socket.emit("error_msg", { message: "Oda bulunamadı!" }); return; }
      if (room.hostSocketId !== socket.id) { socket.emit("error_msg", { message: "Sadece oda sahibi başlatabilir!" }); return; }
      const err = startGame(room);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      emitAll(io, room);
    });

    socket.on("draw_card", () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const err = handleDrawCard(room, socket.id);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      scheduleDeleteIfGameOver(room);
      emitAll(io, room);
    });

    socket.on("try_complete", ({ regionId, selectedCards }: { regionId: string; selectedCards?: string[] }) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const err = handleTryComplete(room, socket.id, regionId, selectedCards);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      scheduleDeleteIfGameOver(room);
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
      saveAsync(room);
      scheduleDeleteIfGameOver(room);
      emitAll(io, room);
    });

    socket.on("resolve_event", ({ targetPlayerId, cardIds }: { targetPlayerId?: number; cardIds?: string[] }) => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const err = handleResolveEvent(room, socket.id, targetPlayerId, cardIds);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      scheduleDeleteIfGameOver(room);
      emitAll(io, room);
    });

    socket.on("cancel_event", () => {
      const room = getRoomBySocket(socket.id);
      if (!room || !room.state.pendingEvent) return;
      room.state.phase = "playing";
      room.state.pendingEvent = null;
      saveAsync(room);
      emitAll(io, room);
    });

    socket.on("end_turn", () => {
      const room = getRoomBySocket(socket.id);
      if (!room) return;
      const err = handleEndTurn(room, socket.id);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      emitAll(io, room);
    });

    socket.on("rejoin_room", async ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
      try {
        const room = await resolveRoom(roomCode);
        if (!room) {
          socket.emit("rejoin_failed", { message: "Oda bulunamadı ya da oyun sona erdi." });
          return;
        }

        if (room.state.phase === "game_over") {
          socket.emit("rejoin_failed", { message: "Bu oyun zaten sona erdi." });
          return;
        }

        const { room: rejoined, error } = rejoinRoom(socket.id, roomCode, playerName);
        if (error || !rejoined) {
          socket.emit("rejoin_failed", { message: error ?? "Yeniden bağlanılamadı!" });
          return;
        }

        socket.join(rejoined.code);
        const isNewJoin = rejoined.state.phase === "lobby";
        if (isNewJoin) {
          socket.emit("room_joined", { roomCode: rejoined.code });
        } else {
          socket.emit("rejoin_ok");
        }
        saveAsync(rejoined);
        emitAll(io, rejoined);
      } catch (e) {
        socket.emit("rejoin_failed", { message: String(e) });
      }
    });

    socket.on("leave_room", () => {
      const { room, playerName } = removePlayer(socket.id);
      socket.leave(room?.code ?? "");
      if (room) {
        saveAsync(room);
        emitAll(io, room);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnect [${socket.id}], reason: ${reason}`);
      const { room } = removePlayer(socket.id);
      if (room) {
        saveAsync(room);
        emitAll(io, room);
      }
    });
  });
}
