import { motion } from "framer-motion";
import { useOnlineStore } from "../store/onlineStore";

type Props = {
  onBack: () => void;
};

export function OnlineGameOverPage({ onBack }: Props) {
  const { players, winnerIndex, roomCode } = useOnlineStore();
  const winner = winnerIndex !== null ? players[winnerIndex] : null;
  const sorted = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-red-900 to-stone-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-black/50 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-7xl mb-4"
        >
          🏆
        </motion.div>

        <h1 className="text-3xl font-bold text-white mb-1">Oyun Bitti!</h1>
        {winner && (
          <p className="text-amber-300 text-lg mb-2">
            <span className="font-bold">{winner.name}</span> kazandı!
          </p>
        )}
        <p className="text-white/30 text-xs mb-6">Oda: #{roomCode}</p>

        <div className="space-y-3 mb-8">
          {sorted.map((player, rank) => (
            <motion.div
              key={rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rank * 0.1 }}
              className={`flex items-center justify-between rounded-xl p-3 ${
                rank === 0
                  ? "bg-yellow-500/20 border border-yellow-400"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "👤"}
                </span>
                <div className="text-left">
                  <div className="text-white font-medium">{player.name}</div>
                  <div className="text-white/50 text-xs">
                    {player.scoredFoods.length} sipariş tamamlandı
                  </div>
                </div>
              </div>
              <span className={`font-bold text-lg ${rank === 0 ? "text-yellow-300" : "text-white/80"}`}>
                ⭐ {player.points}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="w-full bg-gradient-to-r from-amber-500 to-red-500 text-white font-bold py-4 rounded-xl text-lg"
        >
          🏠 Ana Menüye Dön
        </motion.button>
      </motion.div>
    </div>
  );
}
