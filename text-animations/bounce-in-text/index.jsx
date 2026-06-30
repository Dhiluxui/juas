import { motion } from "framer-motion";

export const BounceInText = ({ text = "Bouncing In!" }: { text?: string }) => {
  return (
    <motion.h2
      className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-t from-orange-400 to-rose-500 py-2 px-1"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 10 }}
    >
      {text}
    </motion.h2>
  );
};