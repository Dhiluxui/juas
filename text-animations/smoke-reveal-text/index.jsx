import { motion } from "framer-motion";

export const SmokeRevealText = ({ text = "Ghost Protocol", duration = 1.5 }: { text?: string, duration?: number }) => {
  const letters = Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: { 
      opacity: 1, 
      filter: "blur(0px)",
      scale: 1,
      y: 0,
      transition: { duration: duration, ease: "easeOut" } 
    },
    hidden: { 
      opacity: 0, 
      filter: "blur(20px)",
      scale: 1.5,
      y: -20,
    },
  };

  return (
    <motion.h2
      className="text-4xl md:text-6xl font-bold text-gray-300 flex py-4 px-2 select-none flex-wrap"
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.5 }}
    >
      {letters.map((letter, index) => (
        <motion.span variants={child} key={index} className="inline-block">
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.h2>
  );
};