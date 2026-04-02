import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineStore, getActiveSession } from "../store/onlineStore";
import { useAuthStore } from "../store/authStore";
import { useVersionStore } from "../../store/versionStore";
import { setPendingJoin, takePendingJoin } from "../../store/pendingJoin";
import { DevAuthPage } from "./DevAuthPage";
import { cn } from "@/lib/utils";

type Props = {
  onBack: () => void;
};

function getRoomCodeFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get("room") ?? "";
  } catch { return ""; }
}

export function LobbyPage({ onBack }: Props) {
  const {
    connected,
    onlinePhase,
    errorMessage,
    playerName,
    roomCode,
    isHost,
    players,
    myPlayerIndex,
    messages,
    connect,
    setPlayerName,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
    clearError,
    checkRoomVersion,
    deleteRoom,
    kickPlayer,
    banPlayer,
    rejoinFromSession,
    permanentLeaveFromSession,
    pendingPermanentLeave,
    turnTimerEnabled,
    setTurnTimer,
  } = useOnlineStore();

  const { isAuthenticated, username, displayName, setDisplayName, logout } = useAuthStore();
  const { setVersion } = useVersionStore();

  const urlRoomCode = getRoomCodeFromUrl();
  const [joinCode, setJoinCode] = useState(urlRoomCode);
  const [tab, setTab] = useState<"create" | "join">(urlRoomCode ? "join" : "create");
  const [localDisplayName, setLocalDisplayName] = useState(displayName || username || "");
  const [copied, setCopied] = useState(false);
  const [checkingVersion, setCheckingVersion] = useState(false);
  const [confirmPermanentLeave, setConfirmPermanentLeave] = useState(false);
  const [confirmDeleteRoom, setConfirmDeleteRoom] = useState(false);
  const [activeSession, setActiveSession] = useState(getActiveSession());

  useEffect(() => {
    connect();
  }, []);

  // Refresh active session display when phase changes
  useEffect(() => {
    if (onlinePhase === "idle") {
      setActiveSession(getActiveSession());
    }
  }, [onlinePhase]);

  useEffect(() => {
    if (isAuthenticated && (displayName || username)) {
      setLocalDisplayName(displayName || username);
    }
  }, [isAuthenticated, displayName, username]);

  useEffect(() => {
    const pending = takePendingJoin();
    if (pending && connected && isAuthenticated) {
      const nameToUse = pending.playerName || localDisplayName || username;
      useOnlineStore.setState({ playerName: nameToUse });
      setPlayerName(nameToUse);
      joinRoom(pending.roomCode, username);
    }
  }, [connected, isAuthenticated]);

  if (!isAuthenticated) {
    return <DevAuthPage onBack={onBack} />;
  }

  const effectiveName = localDisplayName.trim() || username;

  const handleSaveDisplayName = () => {
    if (localDisplayName.trim() && localDisplayName.trim() !== displayName) {
      setDisplayName(localDisplayName.trim());
    }
  };

  const handleCreate = () => {
    // Can't create if still in an active session
    if (activeSession && onlinePhase === "idle") return;
    const name = effectiveName;
    useOnlineStore.setState({ playerName: name });
    setPlayerName(name);
    createRoom(username);
  };

  const handleJoin = () => {
    if (!joinCode.trim() || !connected) return;
    // Can't join if still in an active session
    if (activeSession && onlinePhase === "idle") return;
    setCheckingVersion(true);
    checkRoomVersion(joinCode, (version) => {
      setCheckingVersion(false);
      if (version === null) {
        useOnlineStore.setState({ errorMessage: "Oda bulunamadı!" });
        return;
      }
      if (version === "stable") {
        setPendingJoin({ roomCode: joinCode, playerName: effectiveName });
        setVersion("stable");
        return;
      }
      const name = effectiveName;
      useOnlineStore.setState({ playerName: name });
      setPlayerName(name);
      joinRoom(joinCode, username);
    });
  };

  const handleBack = () => {
    leaveRoom();
    onBack();
  };

  const handleRejoin = () => {
    if (!connected) return;
    rejoinFromSession();
  };

  const handlePermanentLeaveFromSession = () => {
    setConfirmPermanentLeave(false);
    setActiveSession(null);
    permanentLeaveFromSession();
  };

  const handleDeleteRoom = () => {
    setConfirmDeleteRoom(false);
    deleteRoom();
    leaveRoom();
  };

  const isWaiting = onlinePhase === "waiting_room";
  const hasActiveSession = !!activeSession && !!activeSession.roomCode && onlinePhase === "idle";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-stone-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-black/40 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-violet-500/20 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            ← Geri
          </button>
          <div className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-400 animate-pulse" : "bg-red-400")} />
            <span className="text-white/50 text-xs">{connected ? "Bağlandı" : "Bağlanıyor..."}</span>
            <button
              onClick={logout}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              çıkış
            </button>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🌐</div>
          <h1 className="text-2xl font-bold text-white">Online Oyun</h1>
          <p className="text-violet-300 text-sm mt-1">
            <span className="text-violet-400 font-semibold">{username}</span> olarak oynuyorsun
          </p>
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

        {/* Active Game Panel */}
        <AnimatePresence>
          {hasActiveSession && !pendingPermanentLeave && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-amber-500/15 border border-amber-400/40 rounded-2xl p-4 mb-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-300 text-sm font-semibold">🎮 Aktif Oyun</span>
                <span className="text-white/40 text-xs">devam eden bir odandasın</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-white/60 text-xs">Oda:</span>
                <span className="text-amber-300 font-bold tracking-widest text-sm">{activeSession.roomCode}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRejoin}
                  disabled={!connected}
                  className="flex-1 bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all disabled:opacity-40"
                >
                  ↩ Geri Dön
                </button>
                <button
                  onClick={() => setConfirmPermanentLeave(true)}
                  disabled={pendingPermanentLeave}
                  className="flex-1 bg-red-500/30 hover:bg-red-500/50 text-red-300 text-xs font-semibold py-2 px-3 rounded-xl transition-all disabled:opacity-40"
                >
                  {pendingPermanentLeave ? "⏳ Ayrılıyor..." : "✕ Tamamen Ayrıl"}
                </button>
              </div>
              <p className="text-white/30 text-xs mt-2 text-center">
                Yeni bir oyuna başlamak için önce bu odadan ayrılmalısın
              </p>
            </motion.div>
          )}

          {pendingPermanentLeave && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 mb-4 text-center text-amber-300 text-sm"
            >
              ⏳ Odadan tamamen ayrılınıyor...
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm permanent leave from session */}
        <AnimatePresence>
          {confirmPermanentLeave && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            >
              <div className="bg-stone-900 border border-red-500/40 rounded-2xl p-6 max-w-xs w-full shadow-2xl">
                <h3 className="text-white font-bold text-lg mb-2">Tamamen Ayrıl?</h3>
                <p className="text-white/60 text-sm mb-4">
                  Elindeki kartlar desteye, tamamladığın yemekler havuza geri dönecek. Bu işlem geri alınamaz.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmPermanentLeave(false)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm transition-all"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handlePermanentLeaveFromSession}
                    className="flex-1 bg-red-500/80 hover:bg-red-500 text-white py-2 rounded-xl text-sm font-semibold transition-all"
                  >
                    Evet, Ayrıl
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm delete room */}
        <AnimatePresence>
          {confirmDeleteRoom && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            >
              <div className="bg-stone-900 border border-red-500/40 rounded-2xl p-6 max-w-xs w-full shadow-2xl">
                <h3 className="text-white font-bold text-lg mb-2">Odayı Sil?</h3>
                <p className="text-white/60 text-sm mb-4">
                  Tüm oyuncular odadan çıkarılacak ve oda tamamen silinecek.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDeleteRoom(false)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm transition-all"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleDeleteRoom}
                    className="flex-1 bg-red-600/80 hover:bg-red-600 text-white py-2 rounded-xl text-sm font-semibold transition-all"
                  >
                    Evet, Sil
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isWaiting ? (
          <div className="space-y-4">
            <div>
              <label className="text-white/70 text-sm font-medium block mb-1.5">
                Görünen İsim
                <span className="text-white/40 text-xs ml-1">(boş bırakırsan kullanıcı adın kullanılır)</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={localDisplayName}
                  onChange={(e) => setLocalDisplayName(e.target.value)}
                  onBlur={handleSaveDisplayName}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-400 transition-all"
                  placeholder={username}
                  maxLength={20}
                />
              </div>
              <p className="text-white/30 text-xs mt-1">Oyunda gözükecek isim: <strong className="text-white/50">{effectiveName}</strong></p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTab("create")}
                className={cn(
                  "flex-1 py-2 rounded-xl font-semibold text-sm transition-all",
                  tab === "create"
                    ? "bg-violet-500 text-white"
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
                    ? "bg-violet-500 text-white"
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
                whileHover={{ scale: hasActiveSession ? 1 : 1.02 }}
                whileTap={{ scale: hasActiveSession ? 1 : 0.98 }}
                disabled={!connected || hasActiveSession}
                onClick={handleCreate}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-400 transition-all text-center text-lg tracking-widest font-bold uppercase"
                  placeholder="ODA KODU"
                  maxLength={8}
                />
                <motion.button
                  whileHover={{ scale: hasActiveSession ? 1 : 1.02 }}
                  whileTap={{ scale: hasActiveSession ? 1 : 0.98 }}
                  disabled={!joinCode.trim() || !connected || checkingVersion || hasActiveSession}
                  onClick={handleJoin}
                  className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {checkingVersion ? "⏳ Kontrol ediliyor..." : "🔑 Odaya Katıl"}
                </motion.button>
              </motion.div>
            )}

            {hasActiveSession && (
              <p className="text-amber-400/70 text-xs text-center">
                ⚠ Aktif bir odandasın. Önce o odadan tamamen ayrılmalısın.
              </p>
            )}

            <div className="bg-violet-500/10 rounded-xl p-3 text-xs text-violet-300/60 space-y-1">
              <p>👥 2-4 oyuncu gerekli</p>
              <p>🔄 Sekme kapanınca odanda bekliyorsun, aktif oyundan geri dönebilirsin</p>
              <p>🎲 Oda sahibi oyunu başlatır</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-violet-500/20 border border-violet-400/50 rounded-2xl p-4 text-center">
              <div className="text-white/60 text-xs uppercase tracking-widest mb-1">Oda Kodu</div>
              <div className="text-4xl font-bold text-violet-300 tracking-widest">{roomCode}</div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="mt-2 text-xs bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-3 py-1 rounded-lg transition-all"
              >
                {copied ? "✓ Link kopyalandı!" : "🔗 Davet linkini kopyala"}
              </button>
            </div>

            <div className="bg-black/20 rounded-xl p-3">
              <div className="text-white/60 text-xs uppercase tracking-wider mb-2">
                Oyuncular ({players.length}/4)
              </div>
              <div className="space-y-2">
                {players.map((p, i) => {
                  const isMe = i === myPlayerIndex;
                  const isPlayerHost = i === 0;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                      <span className="text-white text-sm flex-1">{p.name}{isMe ? " (sen)" : ""}</span>
                      {isPlayerHost && (
                        <span className="text-violet-400 text-xs">👑</span>
                      )}
                      {/* Kick/Ban buttons — only for host, only for others */}
                      {isHost && !isMe && (
                        <div className="flex gap-1 ml-auto">
                          <button
                            onClick={() => kickPlayer(i)}
                            className="text-xs bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 px-2 py-0.5 rounded-lg transition-all"
                            title="Odadan çıkar (geri girebilir)"
                          >
                            Çıkar
                          </button>
                          <button
                            onClick={() => banPlayer(i)}
                            className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 px-2 py-0.5 rounded-lg transition-all"
                            title="Engelle (bir daha giremez)"
                          >
                            Engelle
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {messages.length > 0 && (
              <div className="bg-black/20 rounded-xl p-3 space-y-1 max-h-20 overflow-y-auto">
                {[...messages].reverse().map((m) => (
                  <div key={m.id} className="text-white/60 text-xs">{m.text}</div>
                ))}
              </div>
            )}

            {isHost && (
              <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-2">
                <div className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-1">
                  ⚙ Oda Ayarları
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white/80 text-xs font-medium">Tur Süresi</div>
                    <div className="text-white/40 text-xs">Otomatik sıra geçişi (60 sn)</div>
                  </div>
                  <button
                    onClick={() => setTurnTimer(!turnTimerEnabled)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0",
                      turnTimerEnabled ? "bg-violet-500" : "bg-white/20"
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                      turnTimerEnabled ? "translate-x-6" : "translate-x-1"
                    )} />
                  </button>
                </div>
              </div>
            )}

            {isHost ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={players.length < 2}
                onClick={startGame}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-lg"
              >
                🚀 Oyunu Başlat! ({players.length} Oyuncu)
              </motion.button>
            ) : (
              <div className="text-center text-white/50 text-sm py-3 animate-pulse">
                ⏳ Oda sahibinin oyunu başlatması bekleniyor...
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleBack}
                className="flex-1 text-white/40 hover:text-white/70 text-sm py-2 transition-colors"
              >
                Odadan Ayrıl
              </button>
              {isHost && (
                <button
                  onClick={() => setConfirmDeleteRoom(true)}
                  className="text-red-400/60 hover:text-red-400 text-sm py-2 px-3 transition-colors"
                >
                  🗑 Odayı Sil
                </button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
