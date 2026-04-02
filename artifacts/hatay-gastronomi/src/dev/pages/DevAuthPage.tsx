import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import { cn } from "@/lib/utils";

const USERS_KEY = "hatay_dev_users";

type StoredUser = { passwordHash: string; displayName: string };

function loadUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, StoredUser>) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch {}
}

async function hashPassword(password: string): Promise<string> {
  const buf = new TextEncoder().encode(password);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Props = { onBack: () => void };

export function DevAuthPage({ onBack }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();

  const handleLogin = async () => {
    const uname = username.trim().toLowerCase();
    if (!uname || !password) { setError("Kullanıcı adı ve şifre gerekli!"); return; }
    setError(null);
    setLoading(true);
    try {
      const users = loadUsers();
      const user = users[uname];
      if (!user) { setError("Kullanıcı bulunamadı!"); return; }
      const hash = await hashPassword(password);
      if (hash !== user.passwordHash) { setError("Şifre yanlış!"); return; }
      login(uname, user.displayName || uname);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const uname = username.trim().toLowerCase();
    if (!uname || !password) { setError("Kullanıcı adı ve şifre gerekli!"); return; }
    if (uname.length < 3) { setError("Kullanıcı adı en az 3 karakter olmalı!"); return; }
    if (password.length < 4) { setError("Şifre en az 4 karakter olmalı!"); return; }
    if (password !== confirmPassword) { setError("Şifreler eşleşmiyor!"); return; }
    setError(null);
    setLoading(true);
    try {
      const users = loadUsers();
      if (users[uname]) { setError("Bu kullanıcı adı zaten alınmış!"); return; }
      const hash = await hashPassword(password);
      const dn = displayName.trim() || uname;
      users[uname] = { passwordHash: hash, displayName: dn };
      saveUsers(users);
      login(uname, dn);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") tab === "login" ? handleLogin() : handleRegister();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-stone-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-black/40 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full border border-violet-500/20 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-white/50 hover:text-white/80 text-sm transition-colors">
            ← Geri
          </button>
          <span className="text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full">
            🔧 Geliştirme
          </span>
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-white">Geliştirici Girişi</h1>
          <p className="text-violet-300 text-sm mt-1">Geliştirme versiyonu için hesap gerekli</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-500/20 border border-red-400/50 rounded-xl p-3 mb-4 flex items-center justify-between"
            >
              <span className="text-red-300 text-sm">{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100 ml-2 text-lg leading-none">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setTab("login"); setError(null); }}
            className={cn(
              "flex-1 py-2 rounded-xl font-semibold text-sm transition-all",
              tab === "login" ? "bg-violet-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
            )}
          >
            Giriş Yap
          </button>
          <button
            onClick={() => { setTab("register"); setError(null); }}
            className={cn(
              "flex-1 py-2 rounded-xl font-semibold text-sm transition-all",
              tab === "register" ? "bg-violet-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
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
            disabled={loading || !username.trim() || !password.trim()}
            onClick={tab === "login" ? handleLogin : handleRegister}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-2"
          >
            {loading
              ? "⏳ İşleniyor..."
              : tab === "login"
              ? "🔑 Giriş Yap"
              : "✨ Hesap Oluştur"}
          </motion.button>
        </div>

        <div className="mt-5 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-xs text-violet-300/70 space-y-1">
          <p>🔒 Hesabın bu cihaza kaydedilir</p>
          <p>🎮 Görünen ismin odada kullanılır</p>
          <p>♻️ Aynı odaya geri dönmek için aynı kullanıcı adını kullan</p>
        </div>
      </motion.div>
    </div>
  );
}
