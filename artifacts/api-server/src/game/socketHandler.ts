import { Server, Socket } from "socket.io";
import * as stableRM from "./roomManager.js";
import * as devRM from "./dev/roomManager.js";
import { saveRoom, loadRoom, deleteRoom } from "./db.js";

type RM = typeof stableRM;
type Room = stableRM.Room;

function getRMForVersion(version: "stable" | "dev"): RM {
  return version === "dev" ? (devRM as unknown as RM) : stableRM;
}

function findBySocket(socketId: string): { room: Room; rm: RM } | null {
  const s = stableRM.getRoomBySocket(socketId);
  if (s) return { room: s, rm: stableRM };
  const d = devRM.getRoomBySocket(socketId);
  if (d) return { room: d as unknown as Room, rm: devRM as unknown as RM };
  return null;
}

function findByCode(code: string): { room: Room; rm: RM } | null {
  const s = stableRM.getRoom(code);
  if (s) return { room: s, rm: stableRM };
  const d = devRM.getRoom(code);
  if (d) return { room: d as unknown as Room, rm: devRM as unknown as RM };
  return null;
}

function emitAll(io: Server, room: Room, rm: RM) {
  room.state.players.forEach((p, i) => {
    const view = rm.buildPlayerView(room, i);
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

async function resolveRoom(code: string): Promise<{ room: Room; rm: RM } | null> {
  const inMemory = findByCode(code);
  if (inMemory) return inMemory;

  try {
    const dbData = await loadRoom(code.toUpperCase());
    if (!dbData) return null;
    const version: "stable" | "dev" = (dbData.state as stableRM.ServerGameState).version ?? "stable";
    const rm = getRMForVersion(version);
    console.log(`[DB] Restored room ${code} (${version}) from database`);
    const room = rm.restoreRoomFromDb(code, dbData.host_socket_id, dbData.state as stableRM.ServerGameState) as unknown as Room;
    return { room, rm };
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

    socket.on("create_room", ({ playerName, version }: { playerName: string; version?: "stable" | "dev" }) => {
      try {
        const rm = getRMForVersion(version ?? "stable");
        const room = rm.createRoom(socket.id, playerName) as unknown as Room;
        socket.join(room.code);
        socket.emit("room_created", { roomCode: room.code });
        socket.emit("room_joined", { roomCode: room.code });
        saveAsync(room);
        emitAll(io, room, rm);
      } catch (e) {
        socket.emit("error_msg", { message: String(e) });
      }
    });

    socket.on("join_room", ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
      try {
        const found = findByCode(roomCode.toUpperCase());
        if (!found) { socket.emit("error_msg", { message: "Oda bulunamadı!" }); return; }
        const { room: existingRoom, rm } = found;
        const { room, error } = rm.joinRoom(socket.id, existingRoom.code, playerName) as { room: Room; error: string | null };
        if (error) { socket.emit("error_msg", { message: error }); return; }
        socket.join(room.code);
        socket.emit("room_joined", { roomCode: room.code });
        saveAsync(room);
        emitAll(io, room, rm);
      } catch (e) {
        socket.emit("error_msg", { message: String(e) });
      }
    });

    socket.on("start_game", () => {
      const found = findBySocket(socket.id);
      if (!found) { socket.emit("error_msg", { message: "Oda bulunamadı!" }); return; }
      const { room, rm } = found;
      if (room.hostSocketId !== socket.id) { socket.emit("error_msg", { message: "Sadece oda sahibi başlatabilir!" }); return; }
      const err = rm.startGame(room);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      emitAll(io, room, rm);
    });

    socket.on("draw_card", () => {
      const found = findBySocket(socket.id);
      if (!found) return;
      const { room, rm } = found;
      const err = rm.handleDrawCard(room, socket.id);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      scheduleDeleteIfGameOver(room);
      emitAll(io, room, rm);
    });

    socket.on("try_complete", ({ regionId, selectedCards }: { regionId: string; selectedCards?: string[] }) => {
      const found = findBySocket(socket.id);
      if (!found) return;
      const { room, rm } = found;
      const err = rm.handleTryComplete(room, socket.id, regionId, selectedCards);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      scheduleDeleteIfGameOver(room);
      emitAll(io, room, rm);
      setTimeout(() => {
        if (room.state.cookingAnimation) {
          room.state.cookingAnimation = null;
          emitAll(io, room, rm);
        }
      }, 1500);
    });

    socket.on("use_event_card", ({ cardId }: { cardId: string }) => {
      const found = findBySocket(socket.id);
      if (!found) return;
      const { room, rm } = found;
      const result = rm.handleUseEventCard(room, socket.id, cardId);
      if (result.error) { socket.emit("error_msg", { message: result.error }); return; }
      saveAsync(room);
      scheduleDeleteIfGameOver(room);
      emitAll(io, room, rm);
    });

    socket.on("resolve_event", ({ targetPlayerId, cardIds }: { targetPlayerId?: number; cardIds?: string[] }) => {
      const found = findBySocket(socket.id);
      if (!found) return;
      const { room, rm } = found;
      const err = rm.handleResolveEvent(room, socket.id, targetPlayerId, cardIds);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      scheduleDeleteIfGameOver(room);
      emitAll(io, room, rm);
    });

    socket.on("cancel_event", () => {
      const found = findBySocket(socket.id);
      if (!found) return;
      const { room, rm } = found;
      if (!room.state.pendingEvent) return;
      room.state.phase = "playing";
      room.state.pendingEvent = null;
      saveAsync(room);
      emitAll(io, room, rm);
    });

    socket.on("end_turn", () => {
      const found = findBySocket(socket.id);
      if (!found) return;
      const { room, rm } = found;
      const err = rm.handleEndTurn(room, socket.id);
      if (err) { socket.emit("error_msg", { message: err }); return; }
      saveAsync(room);
      emitAll(io, room, rm);
    });

    socket.on("rejoin_room", async ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
      try {
        const resolved = await resolveRoom(roomCode);
        if (!resolved) {
          socket.emit("rejoin_failed", { message: "Oda bulunamadı ya da oyun sona erdi." });
          return;
        }

        const { room: foundRoom, rm } = resolved;
        if (foundRoom.state.phase === "game_over") {
          socket.emit("rejoin_failed", { message: "Bu oyun zaten sona erdi." });
          return;
        }

        const { room: rejoined, error } = rm.rejoinRoom(socket.id, roomCode, playerName) as { room: Room; error: string | null };
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
        emitAll(io, rejoined, rm);
      } catch (e) {
        socket.emit("rejoin_failed", { message: String(e) });
      }
    });

    socket.on("leave_room", () => {
      const found = findBySocket(socket.id);
      if (found) {
        const { room } = found.rm.removePlayer(socket.id) as { room: Room | null; wasHost: boolean; playerName: string };
        socket.leave(found.room.code);
        if (room) {
          saveAsync(room);
          emitAll(io, room, found.rm);
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnect [${socket.id}], reason: ${reason}`);
      const found = findBySocket(socket.id);
      if (found) {
        const { room } = found.rm.removePlayer(socket.id) as { room: Room | null; wasHost: boolean; playerName: string };
        if (room) {
          saveAsync(room);
          emitAll(io, room, found.rm);
        }
      }
    });
  });
}
