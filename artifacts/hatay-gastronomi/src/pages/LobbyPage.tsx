import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineStore } from "../store/onlineStore";
import { cn } from "@/lib/utils";

type Props = {
  onBack: () => void;
};

export function LobbyPage({ onBack }: Props) {
  const {
    connected,
    onlinePhase,
    errorMessage,
    playerName,
    roomCode,
    isHost,
    players,
    messages,
    connect,
    setPlayerName,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
    clearError,
  } = useOnlineStore();

  const [joinCode, setJoinCode] = useState("");
  const [tab, setTab] = useState<"create" | "join">("create");
  const [localName, setLocalName] = useState(playerName || "");

  useEffect(() => {
    connect();
  }, []);

  const handleCreate = () => {
    setPlayerName(localName);
    useOnlineStore.setState({ playerName: localName });
    createRoom();
  };

  const handleJoin = () => {
    useOnlineStore.setState({ playerName: localName });
    setPlayerName(localName);
    joinRoom(joinCode);
  };

  const handleBack = () => {
    leaveRoom();
    onBack();
  };

  const isWaiting = onlinePhase === "waiting_room";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-stone-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-black/40 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            ← Geri
          </button>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-400 animate-pulse" : "bg-red-400")} />
            <span className="text-white/50 text-xs">{connected ? "Bağlandı" : "Bağlanıyor..."}</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🌐</div>
          <h1 className="text-2xl font-bold text-white">Online Oyun</h1>
          <p className="text-amber-300 text-sm mt-1">Oda kodu ile arkadaşlarınla oyna</p>
        </div>

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-500/20 border border-red-400/50 rounded-xl p-3 mb-4 flex items-center justify-between"
            >
              <span className="text-red-300 text-sm">{errorMessage}</span>
              <button onClick={clearError} className="text-red-300 hover:text-red-100 ml-2 text-lg leading-none">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {!isWaiting ? (
          <div className="space-y-4">
            <div>
              <label className="text-white/70 text-sm font-medium block mb-1.5">İsmin</label>
              <input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-all"
                placeholder="Oyuncu adını gir..."
                maxLength={20}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTab("create")}
                className={cn(
                  "flex-1 py-2 rounded-xl font-semibold text-sm transition-all",
                  tab === "create"
                    ? "bg-amber-500 text-black"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                )}
              >
                Oda Oluştur
              </button>
              <button
                onClick={() => setTab("join")}
                className={cn(
                  "flex-1 py-2 rounded-xl font-semibold text-sm transition-all",
                  tab === "join"
                    ? "bg-amber-500 text-black"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                )}
              >
                Odaya Katıl
              </button>
            </div>

            {tab === "create" ? (
              <motion.button
                key="create"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!localName.trim() || !connected}
                onClick={handleCreate}
                className="w-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                🏠 Oda Oluştur
              </motion.button>
            ) : (
              <motion.div
                key="join"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-all text-center text-lg tracking-widest font-bold uppercase"
                  placeholder="ODA KODU"
                  maxLength={8}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!localName.trim() || !joinCode.trim() || !connected}
                  onClick={handleJoin}
                  className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  🔑 Odaya Katıl
                </motion.button>
              </motion.div>
            )}

            <div className="bg-white/5 rounded-xl p-3 text-xs text-white/50 space-y-1">
              <p>👥 2-4 oyuncu gerekli</p>
              <p>🎲 Oda sahibi oyunu başlatır</p>
              <p>🎴 Herkes kendi kartlarını görür</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-amber-500/20 border border-amber-400/50 rounded-2xl p-4 text-center">
              <div className="text-white/60 text-xs uppercase tracking-widest mb-1">Oda Kodu</div>
              <div className="text-4xl font-bold text-amber-300 tracking-widest">{roomCode}</div>
              <div className="text-white/40 text-xs mt-1">Arkadaşlarınla paylaş!</div>
            </div>

            <div className="bg-black/20 rounded-xl p-3">
              <div className="text-white/60 text-xs uppercase tracking-wider mb-2">
                Oyuncular ({players.length}/4)
              </div>
              <div className="space-y-2">
                {players.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-white text-sm">{p.name}</span>
                    {i === 0 && (
                      <span className="text-amber-400 text-xs ml-auto">👑 Oda Sahibi</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {messages.length > 0 && (
              <div className="bg-black/20 rounded-xl p-3 space-y-1 max-h-20 overflow-y-auto">
                {[...messages].reverse().map((m) => (
                  <div key={m.id} className="text-white/60 text-xs">{m.text}</div>
                ))}
              </div>
            )}

            {isHost ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={players.length < 2}
                onClick={startGame}
                className="w-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-lg"
              >
                🚀 Oyunu Başlat! ({players.length} Oyuncu)
              </motion.button>
            ) : (
              <div className="text-center text-white/50 text-sm py-3 animate-pulse">
                ⏳ Oda sahibinin oyunu başlatması bekleniyor...
              </div>
            )}

            <button
              onClick={handleBack}
              className="w-full text-white/40 hover:text-white/70 text-sm py-2 transition-colors"
            >
              Odadan Ayrıl
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
