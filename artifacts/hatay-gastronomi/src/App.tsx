import { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "./store/gameStore";
import { useOnlineStore } from "./store/onlineStore";
import { SetupPage } from "./pages/SetupPage";
import { GamePage } from "./pages/GamePage";
import { GameOverPage } from "./pages/GameOverPage";
import { LobbyPage } from "./pages/LobbyPage";
import { OnlineGamePage } from "./pages/OnlineGamePage";
import { OnlineGameOverPage } from "./pages/OnlineGameOverPage";

type GameMode = "select" | "local" | "online";

function ModeSelectPage({ onSelectLocal, onSelectOnline }: { onSelectLocal: () => void; onSelectOnline: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-stone-900 flex items-center justify-center p-4">
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
          <p className="text-amber-300 text-sm">Oyun modunu seç</p>
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

function App() {
  const [mode, setMode] = useState<GameMode>(getInitialMode);
  const localPhase = useGameStore((s) => s.phase);
  const onlinePhase = useOnlineStore((s) => s.onlinePhase);
  const resetGame = useGameStore((s) => s.resetGame);
  const resetOnline = useOnlineStore((s) => s.resetOnline);

  const goToSelect = () => setMode("select");

  if (mode === "select") {
    return (
      <ModeSelectPage
        onSelectLocal={() => setMode("local")}
        onSelectOnline={() => setMode("online")}
      />
    );
  }

  if (mode === "local") {
    if (localPhase === "setup") {
      return <SetupPage onBack={() => { resetGame(); goToSelect(); }} />;
    }
    if (localPhase === "game_over") {
      return <GameOverPage onBack={goToSelect} />;
    }
    return <GamePage />;
  }

  if (mode === "online") {
    if (onlinePhase === "idle" || onlinePhase === "waiting_room") {
      return <LobbyPage onBack={() => { resetOnline(); goToSelect(); }} />;
    }
    if (onlinePhase === "game_over") {
      return <OnlineGameOverPage onBack={() => { resetOnline(); goToSelect(); }} />;
    }
    return <OnlineGamePage />;
  }

  return null;
}

export default App;
