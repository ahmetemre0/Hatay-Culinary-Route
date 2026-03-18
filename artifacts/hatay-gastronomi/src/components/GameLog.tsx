import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { cn } from "@/lib/utils";

const typeStyles = {
  info: "text-white/60",
  success: "text-green-400",
  warning: "text-yellow-400",
  event: "text-purple-400",
};

export function GameLog() {
  const { logs } = useGameStore();

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
      <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
        📜 Oyun Günlüğü
      </h3>
      <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn("text-xs leading-relaxed", typeStyles[log.type])}
            >
              {log.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
