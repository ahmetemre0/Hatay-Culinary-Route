import { Server, Socket } from "socket.io";
import * as stableRM from "./roomManager.js";
import * as devRM from "./dev/roomManager.js";
import { saveRoom, loadRoom, deleteRoom as deleteRoomFromDb, registerDevUser, loginDevUser, saveChatMessage, loadChatMessages, deleteChatMessages } from "./db.js";

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
      deleteRoomFromDb(room.code).catch(err => console.error("[DB] Delete error:", err));
      deleteChatMessages(room.code).catch(err => console.error("[DB] Chat delete error:", err));
    }, 60_000);
  }
}

async function sendChatHistory(socket: Socket, roomCode: string) {
  try {
    const rows = await loadChatMessages(roomCode);
    const messages = rows.map((r) => ({
      id: r.id,
      playerName: r.player_name,
      text: r.text,
      timestamp: Number(r.ts),
    }));
    socket.emit("chat_history", messages);
  } catch (err) {
    console.error("[DB] loadChatMessages error:", err);
    socket.emit("chat_history", []);
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

    socket.on("dev_auth_register", async ({ username, password, displayName }: { username: string; password: string; displayName?: string }) => {
      try {
        const result = await registerDevUser(username, password, displayName);
        if (!result.success) {
          socket.emit("dev_auth_error", { message: result.error ?? "Kayıt başarısız!" });
          return;
        }
        socket.emit("dev_auth_ok", { displayName: displayName?.trim() || username });
      } catch (err) {
        socket.emit("dev_auth_error", { message: "Sunucu hatası!" });
      }
    });

    socket.on("dev_auth_login", async ({ username, password }: { username: string; password: string }) => {
      try {
        const result = await loginDevUser(username, password);
        if (!result.success) {
          socket.emit("dev_auth_error", { message: result.error ?? "Giriş başarısız!" });
          return;
        }
        socket.emit("dev_auth_ok", { displayName: result.displayName ?? username });
      } catch (err) {
        socket.emit("dev_auth_error", { message: "Sunucu hatası!" });
      }
    });

    socket.on("check_room_version", async ({ roomCode }: { roomCode: string }) => {
      try {
        const found = await resolveRoom(roomCode.toUpperCase());
        if (!found) {
          socket.emit("room_version_result", { version: null, error: "Oda bulunamadı!" });
          return;
        }
        socket.emit("room_version_result", { version: found.room.state.version });
      } catch (err) {
        socket.emit("room_version_result", { version: null, error: "Hata oluştu!" });
      }
    });

    socket.on("create_room", ({ playerName, version, username }: { playerName: string; version?: "stable" | "dev"; username?: string }) => {
      try {
        const ver = version ?? "stable";
        let room: Room;
        if (ver === "dev") {
          room = devRM.createRoom(socket.id, playerName, username) as unknown as Room;
        } else {
          room = stableRM.createRoom(socket.id, playerName) as unknown as Room;
        }
        socket.join(room.code);
        socket.emit("room_created", { roomCode: room.code });
        socket.emit("room_joined", { roomCode: room.code, version: room.state.version });
        socket.emit("chat_history", []);
        saveAsync(room);
        const rm = getRMForVersion(ver);
        emitAll(io, room, rm);
      } catch (e) {
        socket.emit("error_msg", { message: String(e) });
      }
    });

    socket.on("join_room", ({ roomCode, playerName, username }: { roomCode: string; playerName: string; username?: string }) => {
      try {
        const found = findByCode(roomCode.toUpperCase());
        if (!found) { socket.emit("error_msg", { message: "Oda bulunamadı!" }); return; }
        const { room: existingRoom, rm } = found;

        let room: Room;
        let error: string | null;

        if (existingRoom.state.version === "dev") {
          const result = devRM.joinRoom(socket.id, existingRoom.code, playerName, username) as { room: Room; error?: string };
          room = result.room;
          error = result.error ?? null;
        } else {
          const result = stableRM.joinRoom(socket.id, existingRoom.code, playerName) as { room: Room; error?: string };
          room = result.room;
          error = result.error ?? null;
        }

        if (error || !room) { socket.emit("error_msg", { message: error ?? "Odaya katılınamadı!" }); return; }
        socket.join(room.code);
        socket.emit("room_joined", { roomCode: room.code, version: room.state.version });
        sendChatHistory(socket, room.code);
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

    socket.on("rejoin_room", async ({ roomCode, playerName, username }: { roomCode: string; playerName: string; username?: string }) => {
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

        let rejoined: Room;
        let error: string | null;

        if (foundRoom.state.version === "dev") {
          const result = devRM.rejoinRoom(socket.id, roomCode, playerName, username) as { room: Room | null; error?: string };
          rejoined = result.room!;
          error = result.error ?? null;
        } else {
          const result = stableRM.rejoinRoom(socket.id, roomCode, playerName) as { room: Room | null; error?: string };
          rejoined = result.room!;
          error = result.error ?? null;
        }

        if (error || !rejoined) {
          socket.emit("rejoin_failed", { message: error ?? "Yeniden bağlanılamadı!" });
          return;
        }

        socket.join(rejoined.code);
        const isNewJoin = rejoined.state.phase === "lobby";
        if (isNewJoin) {
          socket.emit("room_joined", { roomCode: rejoined.code, version: rejoined.state.version });
        } else {
          socket.emit("rejoin_ok");
        }
        sendChatHistory(socket, rejoined.code);
        saveAsync(rejoined);
        emitAll(io, rejoined, rm);
      } catch (e) {
        socket.emit("rejoin_failed", { message: String(e) });
      }
    });

    socket.on("send_chat", async ({ text }: { text: string }) => {
      const found = findBySocket(socket.id);
      if (!found) return;
      const sanitized = String(text ?? "").trim().slice(0, 120);
      if (!sanitized) return;
      const player = found.room.state.players.find((p) => p.socketId === socket.id);
      const playerName = player?.name ?? "?";
      const ts = Date.now();
      try { await saveChatMessage(found.room.code, playerName, sanitized, ts); } catch (err) {
        console.error("[DB] saveChatMessage error:", err);
      }
      io.to(found.room.code).emit("receive_chat", {
        playerName,
        text: sanitized,
        timestamp: ts,
      });
    });

    socket.on("leave_room", () => {
      const found = findBySocket(socket.id);
      if (found) {
        const roomCode = found.room.code;
        const { room } = found.rm.removePlayer(socket.id) as { room: Room | null; wasHost: boolean; playerName: string };
        socket.leave(roomCode);
        if (room) {
          saveAsync(room);
          emitAll(io, room, found.rm);
        }
      }
    });

    socket.on("permanent_leave", () => {
      const found = findBySocket(socket.id);
      if (!found) {
        socket.emit("you_left_permanently");
        return;
      }
      const roomCode = found.room.code;
      const result = devRM.permanentLeavePlayer(socket.id) as { room: devRM.Room | null; wasHost: boolean; playerName: string };
      socket.leave(roomCode);
      socket.emit("you_left_permanently");
      if (result.room) {
        saveAsync(result.room as unknown as Room);
        scheduleDeleteIfGameOver(result.room as unknown as Room);
        emitAll(io, result.room as unknown as Room, devRM as unknown as RM);
      } else {
        deleteRoomFromDb(roomCode).catch(err => console.error("[DB] Delete error:", err));
        deleteChatMessages(roomCode).catch(err => console.error("[DB] Chat delete error:", err));
      }
    });

    socket.on("delete_room", () => {
      const found = findBySocket(socket.id);
      if (!found) return;
      if (found.room.hostSocketId !== socket.id) {
        socket.emit("error_msg", { message: "Sadece oda sahibi odayı silebilir!" });
        return;
      }
      const roomCode = found.room.code;
      const socketIds = devRM.destroyRoom(roomCode);
      socketIds.forEach(sid => {
        io.to(sid).emit("room_deleted", { message: "Oda sahibi odayı sildi." });
        const s = io.sockets.sockets.get(sid);
        s?.leave(roomCode);
      });
      deleteRoomFromDb(roomCode).catch(err => console.error("[DB] Delete error:", err));
      deleteChatMessages(roomCode).catch(err => console.error("[DB] Chat delete error:", err));
    });

    socket.on("kick_player", ({ targetIndex }: { targetIndex: number }) => {
      const found = findBySocket(socket.id);
      if (!found) return;
      const result = devRM.kickPlayer(found.room as unknown as devRM.Room, socket.id, targetIndex);
      if (result.error) { socket.emit("error_msg", { message: result.error }); return; }
      if (result.targetSocketId) {
        io.to(result.targetSocketId).emit("you_were_kicked", { message: "Oda sahibi sizi odadan çıkardı." });
        const s = io.sockets.sockets.get(result.targetSocketId);
        s?.leave(found.room.code);
      }
      saveAsync(found.room);
      emitAll(io, found.room, found.rm);
    });

    socket.on("ban_player", ({ targetIndex }: { targetIndex: number }) => {
      const found = findBySocket(socket.id);
      if (!found) return;
      const result = devRM.banPlayer(found.room as unknown as devRM.Room, socket.id, targetIndex);
      if (result.error) { socket.emit("error_msg", { message: result.error }); return; }
      if (result.targetSocketId) {
        io.to(result.targetSocketId).emit("you_were_banned", { message: "Bu odaya giriş yasağı aldınız." });
        const s = io.sockets.sockets.get(result.targetSocketId);
        s?.leave(found.room.code);
      }
      saveAsync(found.room);
      emitAll(io, found.room, found.rm);
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
