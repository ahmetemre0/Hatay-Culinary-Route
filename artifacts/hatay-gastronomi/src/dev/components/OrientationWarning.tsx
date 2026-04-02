import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function OrientationWarning() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      if (!portrait) setDismissed(false);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return (
    <AnimatePresence>
      {isPortrait && !dismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 250, damping: 22 }}
            className="bg-stone-900 border border-amber-500/30 rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl"
          >
            <motion.div
              animate={{ rotate: [0, 90, 90, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
              className="text-6xl mb-4 inline-block"
            >
              📱
            </motion.div>
            <h2 className="text-white font-bold text-xl mb-2">Telefonu Çevir!</h2>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              Bu oyun yalnızca{" "}
              <span className="text-amber-300 font-semibold">yatay (landscape)</span> modda
              oynanabilir. Lütfen cihazını döndür.
            </p>
            <div className="flex justify-center gap-3 text-3xl mb-6">
              <span className="opacity-30">📱</span>
              <span className="text-amber-400">→</span>
              <span style={{ display: "inline-block", transform: "rotate(90deg)" }}>📱</span>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="w-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white/80 text-sm py-2.5 rounded-xl transition-all"
            >
              Yine de devam et
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
