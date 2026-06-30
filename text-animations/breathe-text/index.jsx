import { motion } from "framer-motion";

export const BreatheText = ({ text = "Breathe In, Breathe Out", duration = 4, ease = "easeInOut" }: { text?: string, duration?: number, ease?: string }) => {
  return (
    <motion.h2
      className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 py-2 px-1"
      animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
      transition={{ duration: duration, repeat: Infinity, ease: ease }}
    >
      {text}
    </motion.h2>
  );
};