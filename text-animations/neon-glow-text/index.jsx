import { motion } from "framer-motion";

export const NeonGlowText = ({ text = "Cyberpunk Vibes" }: { text?: string }) => {
  return (
    <motion.h2
      className="text-4xl md:text-6xl font-bold text-fuchsia-500"
      animate={{
        textShadow: [
          "0px 0px 5px rgba(217, 70, 239, 0.5)",
          "0px 0px 20px rgba(217, 70, 239, 0.9)",
          "0px 0px 5px rgba(217, 70, 239, 0.5)",
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {text}
    </motion.h2>
  );
};