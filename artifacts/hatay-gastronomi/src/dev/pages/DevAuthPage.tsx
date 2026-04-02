import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnlineStore } from "../store/onlineStore";
import { useAuthStore } from "../store/authStore";
import { cn } from "@/lib/utils";

type Props = {
  onBack: () => void;
};

export function DevAuthPage({ onBack }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { login, setAuthError, authError, authLoading, setAuthLoading } = useAuthStore();
  const { socket, connected, connect } = useOnlineStore();

  useEffect(() => {
    connect();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onOk = ({ displayName: dn }: { displayName?: string }) => {
      setAuthLoading(false);
      const finalUsername = username.trim().toLowerCase();
      login(finalUsername, (dn ?? displayName.trim()) || finalUsername);
    };
    const onErr = ({ message }: { message: string }) => {
      setAuthLoading(false);
      setAuthError(message);
    };
    socket.on("dev_auth_ok", onOk);
    socket.on("dev_auth_error", onErr);
    return () => {
      socket.off("dev_auth_ok", onOk);
      socket.off("dev_auth_error", onErr);
    };
  }, [socket, username, displayName]);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setAuthError("Kullanıcı adı ve şifre gerekli!");
      return;
    }
    if (!connected || !socket) {
      setAuthError("Sunucuya bağlanılamadı, lütfen bekleyin...");
      return;
    }
    setAuthError(null);
    setAuthLoading(true);
    socket.emit("dev_auth_login", { username: username.trim().toLowerCase(), password });
  };

  const handleRegister = () => {
    if (!username.trim() || !password.trim()) {
      setAuthError("Kullanıcı adı ve şifre gerekli!");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Şifreler eşleşmiyor!");
      return;
    }
    if (username.trim().length < 3) {
      setAuthError("Kullanıcı adı en az 3 karakter olmalı!");
      return;
    }
    if (password.length < 4) {
      setAuthError("Şifre en az 4 karakter olmalı!");
      return;
    }
    if (!connected || !socket) {
      setAuthError("Sunucuya bağlanılamadı, lütfen bekleyin...");
      return;
    }
    setAuthError(null);
    setAuthLoading(true);
    socket.emit("dev_auth_register", {
      username: username.trim().toLowerCase(),
      password,
      displayName: displayName.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (tab === "login") handleLogin();
      else handleRegister();
    }
  };

  const isReady = connected && !!socket;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-stone-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-black/40 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full border border-violet-500/20 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            ← Geri
          </button>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-green-400 animate-pulse" : "bg-yellow-400 animate-pulse")} />
            <span className="text-white/40 text-xs">{connected ? "Bağlandı" : "Bağlanıyor..."}</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-white">Geliştirici Girişi</h1>
          <p className="text-violet-300 text-sm mt-1">Geliştirme versiyonu için hesap gerekli</p>
        </div>

        <AnimatePresence>
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-500/20 border border-red-400/50 rounded-xl p-3 mb-4 flex items-center justify-between"
            >
              <span className="text-red-300 text-sm">{authError}</span>
              <button onClick={() => setAuthError(null)} className="text-red-300 hover:text-red-100 ml-2 text-lg leading-none">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setTab("login"); setAuthError(null); }}
            className={cn(
              "flex-1 py-2 rounded-xl font-semibold text-sm transition-all",
              tab === "login"
                ? "bg-violet-500 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            )}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => { setTab("register"); setAuthError(null); }}
            className={cn(
              "flex-1 py-2 rounded-xl font-semibold text-sm transition-all",
              tab === "register"
                ? "bg-violet-500 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            )}
          >
            Kayıt Ol
          </button>
        </div>

        <div className="space-y-3" onKeyDown={handleKeyDown}>
          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Kullanıcı Adı</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-400 transition-all text-sm"
              placeholder="kullaniciadi"
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-400 transition-all text-sm"
              placeholder="••••••••"
              maxLength={64}
            />
          </div>

          <AnimatePresence>
            {tab === "register" && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div>
                  <label className="text-white/70 text-xs font-medium block mb-1">Şifre Tekrar</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-400 transition-all text-sm"
                    placeholder="••••••••"
                    maxLength={64}
                  />
                </div>
                <div>
                  <label className="text-white/70 text-xs font-medium block mb-1">
                    Görünen İsim <span className="text-white/40">(isteğe bağlı)</span>
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-violet-400 transition-all text-sm"
                    placeholder="Oyunda gözükecek ismin..."
                    maxLength={20}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={authLoading || !username.trim() || !password.trim() || !isReady}
            onClick={tab === "login" ? handleLogin : handleRegister}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-2"
          >
            {!isReady
              ? "⏳ Bağlanılıyor..."
              : authLoading
              ? "⏳ Lütfen bekleyin..."
              : tab === "login"
              ? "🔑 Giriş Yap"
              : "✨ Hesap Oluştur"}
          </motion.button>
        </div>

        <div className="mt-5 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-xs text-violet-300/70 space-y-1">
          <p>🔒 Hesabınla farklı cihazdan aynı odaya geri dönebilirsin</p>
          <p>🎮 Görünen ismin odada kullanılır</p>
        </div>
      </motion.div>
    </div>
  );
}
