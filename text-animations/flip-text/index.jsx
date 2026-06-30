import { motion } from "framer-motion";

export const FlipText = ({ text = "Flip The Script" }: { text?: string }) => {
  const letters = Array.from(text);

  return (
    <h2 className="text-4xl md:text-6xl font-bold flex perspective-1000">
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          className="text-indigo-400 inline-block"
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </h2>
  );
};