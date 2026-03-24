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
  cors: { origin: "*" },
  pingTimeout: 60000,    // 60 saniye boyunca cevap gelmezse kopar (Render için yüksek tut)
  pingInterval: 25000,   // 25 saniyede bir sunucu client'ı yoklar
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 dakika içinde gelenleri hafızadan kurtar (Socket.io v4+)
  }
});

setupSocketHandler(io);

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Socket.io path: /api/socket.io`);
});
