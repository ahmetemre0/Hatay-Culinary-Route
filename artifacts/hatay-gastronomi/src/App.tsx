import { useVersionStore } from "./store/versionStore";

import { useGameStore } from "./store/gameStore";
import { useOnlineStore } from "./store/onlineStore";
import { SetupPage } from "./pages/SetupPage";
import { GamePage } from "./pages/GamePage";
import { GameOverPage } from "./pages/GameOverPage";
import { LobbyPage } from "./pages/LobbyPage";
import { OnlineGamePage } from "./pages/OnlineGamePage";
import { OnlineGameOverPage } from "./pages/OnlineGameOverPage";

import { useGameStore as useDevGameStore } from "./dev/store/gameStore";
import { useOnlineStore as useDevOnlineStore } from "./dev/store/onlineStore";
import { SetupPage as DevSetupPage } from "./dev/pages/SetupPage";
import { GamePage as DevGamePage } from "./dev/pages/GamePage";
import { GameOverPage as DevGameOverPage } from "./dev/pages/GameOverPage";
import { LobbyPage as DevLobbyPage } from "./dev/pages/LobbyPage";
import { OnlineGamePage as DevOnlineGamePage } from "./dev/pages/OnlineGamePage";
import { OnlineGameOverPage as DevOnlineGameOverPage } from "./dev/pages/OnlineGameOverPage";

import { useState } from "react";
import { motion } from "framer-motion";

type GameMode = "select" | "local" | "online";
type Version = "stable" | "dev";

function VersionSwitcher({ version, onChange }: { version: Version; onChange: (v: Version) => void }) {
  return (
    <div className="absolute top-4 left-4 z-50">
      <div className="bg-black/50 backdrop-blur-md rounded-xl border border-white/10 p-1 flex gap-1">
        <button
          onClick={() => onChange("stable")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            version === "stable"
              ? "bg-amber-500 text-black shadow-md"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Güncel
        </button>
        <button
          onClick={() => onChange("dev")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            version === "dev"
              ? "bg-violet-500 text-white shadow-md"
              : "text-white/50 hover:text-white/80"
          }`}
        >
          Geliştirme
        </button>
      </div>
    </div>
  );
}

function ModeSelectPage({
  onSelectLocal,
  onSelectOnline,
}: {
  onSelectLocal: () => void;
  onSelectOnline: () => void;
}) {
  const { version, setVersion } = useVersionStore();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-stone-900 flex items-center justify-center p-4">
      <VersionSwitcher version={version} onChange={setVersion} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-black/40 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full border border-white/10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="text-6xl mb-4"
          >
            🗺️
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-1">Hatay Gastronomi Rotası</h1>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                version === "dev"
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              {version === "dev" ? "🔧 Geliştirme" : "✅ Güncel"}
            </span>
          </div>
          <p className="text-amber-300/70 text-sm mt-2">Oyun modunu seç</p>
        </div>

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelectLocal}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-amber-500/30 transition-all"
          >
            <div className="text-2xl mb-1">🏠</div>
            <div>Yerel Oyun</div>
            <div className="text-xs font-normal text-white/70 mt-0.5">Aynı cihazda 2-4 oyuncu</div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelectOnline}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-4 rounded-2xl text-lg shadow-lg shadow-teal-500/30 transition-all"
          >
            <div className="text-2xl mb-1">🌐</div>
            <div>Online Oyun</div>
            <div className="text-xs font-normal text-white/70 mt-0.5">Oda koduyla farklı cihazlardan oyna</div>
          </motion.button>
        </div>

        <div className="mt-6 text-center text-white/30 text-xs">
          Hatay'ın lezzetlerini keşfeden kart oyunu
        </div>
      </motion.div>
    </div>
  );
}

function getInitialMode(): GameMode {
  try {
    const urlRoom = new URLSearchParams(window.location.search).get("room");
    if (urlRoom) return "online";
  } catch {}
  return "select";
}

function StableGame({ mode, onBack }: { mode: Exclude<GameMode, "select">; onBack: () => void }) {
  const localPhase = useGameStore((s) => s.phase);
  const onlinePhase = useOnlineStore((s) => s.onlinePhase);
  const resetGame = useGameStore((s) => s.resetGame);
  const resetOnline = useOnlineStore((s) => s.resetOnline);

  if (mode === "local") {
    if (localPhase === "setup") return <SetupPage onBack={() => { resetGame(); onBack(); }} />;
    if (localPhase === "game_over") return <GameOverPage onBack={onBack} />;
    return <GamePage />;
  }

  if (mode === "online") {
    if (onlinePhase === "idle" || onlinePhase === "waiting_room") {
      return <LobbyPage onBack={() => { resetOnline(); onBack(); }} />;
    }
    if (onlinePhase === "game_over") {
      return <OnlineGameOverPage onBack={() => { resetOnline(); onBack(); }} />;
    }
    return <OnlineGamePage />;
  }

  return null;
}

function DevGame({ mode, onBack }: { mode: Exclude<GameMode, "select">; onBack: () => void }) {
  const localPhase = useDevGameStore((s) => s.phase);
  const onlinePhase = useDevOnlineStore((s) => s.onlinePhase);
  const resetGame = useDevGameStore((s) => s.resetGame);
  const resetOnline = useDevOnlineStore((s) => s.resetOnline);

  if (mode === "local") {
    if (localPhase === "setup") return <DevSetupPage onBack={() => { resetGame(); onBack(); }} />;
    if (localPhase === "game_over") return <DevGameOverPage onBack={onBack} />;
    return <DevGamePage />;
  }

  if (mode === "online") {
    if (onlinePhase === "idle" || onlinePhase === "waiting_room") {
      return <DevLobbyPage onBack={() => { resetOnline(); onBack(); }} />;
    }
    if (onlinePhase === "game_over") {
      return <DevOnlineGameOverPage onBack={() => { resetOnline(); onBack(); }} />;
    }
    return <DevOnlineGamePage />;
  }

  return null;
}

function App() {
  const { version } = useVersionStore();
  const [mode, setMode] = useState<GameMode>(getInitialMode);

  const goToSelect = () => setMode("select");

  if (mode === "select") {
    return (
      <ModeSelectPage
        onSelectLocal={() => setMode("local")}
        onSelectOnline={() => setMode("online")}
      />
    );
  }

  const gameMode = mode as Exclude<GameMode, "select">;

  if (version === "dev") {
    return <DevGame mode={gameMode} onBack={goToSelect} />;
  }

  return <StableGame mode={gameMode} onBack={goToSelect} />;
}

export default App;
