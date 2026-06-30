import { motion } from "framer-motion";

export const SlideUpText = ({ text = "Slide Up Reveal" }: { text?: string }) => {
  return (
    <div className="overflow-hidden py-2">
      <motion.h2
        className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-green-400 to-cyan-500 py-2 px-1"
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {text}
      </motion.h2>
    </div>
  );
};