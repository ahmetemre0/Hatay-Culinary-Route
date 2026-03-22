import { Server, Socket } from "socket.io";
import {
  createRoom, joinRoom, rejoinRoom, getRoomBySocket, removePlayer, startGame,
  handleDrawCard, handleTryComplete, handleUseEventCard, handleResolveEvent,
  handleEndTurn, buildPlayerView, Room,
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

    socket.on("start_game", () => {
      const room = getRoomBySocket(socket.id);
      if (!room) { socket.emit("error_msg", { message: "Oda bulunamadı!" }); return; }
      if (room.hostSocketId !== socket.id) { socket.emit("error_msg", { message: "Sadece oda sahibi başlatabilir!" }); return; }
      const err = startGame(room);
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

    socket.on("disconnect", () => {
      const { room } = removePlayer(socket.id);
      if (room) emitAll(io, room);
    });
  });
}
