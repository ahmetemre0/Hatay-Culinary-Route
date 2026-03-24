import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { setupSocketHandler } from "./game/socketHandler.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/api/socket.io", // EKLENDİ: Client'ın bağlandığı path ile aynı olmalı
  cors: { 
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true 
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  }
});

setupSocketHandler(io);

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Socket.io path: /api/socket.io`);
});
