import { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";

type Props = {
  onBack?: () => void;
};

export function SetupPage({ onBack }: Props) {
  const [numPlayers, setNumPlayers] = useState(2);
  const [names, setNames] = useState(["Oyuncu 1", "Oyuncu 2", "Oyuncu 3", "Oyuncu 4"]);
  const [targetPoints, setTargetPoints] = useState(50);
  const startGame = useGameStore((s) => s.startGame);

  const handleStart = () => {
    startGame(numPlayers, names.slice(0, numPlayers), targetPoints);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-stone-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-black/40 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl"
      >
        {onBack && (
          <button
            onClick={onBack}
            className="text-white/50 hover:text-white/80 text-sm transition-colors mb-4 block"
          >
            ← Mod Seçimine Dön
          </button>
        )}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="text-6xl mb-4"
          >
            🗺️
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-1">
            Hatay Gastronomi Rotası
          </h1>
          <p className="text-amber-300 text-sm">
            Hatay'ın lezzetlerini keşfeden kart oyunu
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-white/70 text-sm font-medium block mb-3">
              Oyuncu Sayısı
            </label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <motion.button
                  key={n}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNumPlayers(n)}
                  className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                    numPlayers === n
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {n}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-white/70 text-sm font-medium block">
              Oyuncu İsimleri
            </label>
            {Array.from({ length: numPlayers }).map((_, i) => (
              <motion.input
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                value={names[i]}
                onChange={(e) => {
                  const newNames = [...names];
                  newNames[i] = e.target.value;
                  setNames(newNames);
                }}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-all"
                placeholder={`Oyuncu ${i + 1}`}
              />
            ))}
          </div>

          <div>
            <label className="text-white/70 text-sm font-medium block mb-2">
              🎯 Hedef Puan
            </label>
            <div className="flex gap-2">
              {[30, 50, 75, 100].map((pts) => (
                <motion.button
                  key={pts}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTargetPoints(pts)}
                  className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
                    targetPoints === pts
                      ? "bg-amber-500 text-black shadow-lg"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {pts}
                </motion.button>
              ))}
              <input
                type="number"
                value={targetPoints}
                onChange={(e) => setTargetPoints(Math.max(10, parseInt(e.target.value) || 50))}
                className="w-20 bg-white/10 border border-white/20 rounded-xl px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-amber-400"
                min={10}
                max={500}
              />
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 text-sm text-white/60 space-y-1.5">
            <p>🃏 Her oyuncuya 5 malzeme kartı dağıtılır</p>
            <p>🗺️ Masada 3 açık Bölge Kartı durur</p>
            <p>⭐ İlk {targetPoints} puana ulaşan kazanır!</p>
            <p>⚡ Olay Kartları oyunu renklendiriyor!</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="w-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
          >
            🚀 Oyunu Başlat!
          </motion.button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {["🌶️", "🫘", "🐟"].map((e, i) => (
            <div key={i} className="text-2xl opacity-30 hover:opacity-60 transition-opacity">
              {e}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
