import { motion } from "framer-motion";

export const WaveText = ({ text = "Wave Effect", duration = 0.5, ease = "easeInOut", splitType = "chars" }: { text?: string, duration?: number, ease?: string, splitType?: string }) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: duration * 0.1, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: { opacity: 1, y: 0, transition: { duration: duration, ease: ease } },
    hidden: { opacity: 0, y: 20, transition: { duration: duration, ease: ease } },
  };

  return (
    <motion.h2
      className={`text-4xl md:text-6xl font-black text-white flex flex-wrap py-2 px-1 ${splitType === "words" ? "gap-[0.2em]" : ""}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {elements.map((el, index) => (
        <motion.span variants={child} key={index}>
          {el === " " && splitType === "chars" ? "\u00A0" : el}
        </motion.span>
      ))}
    </motion.h2>
  );
};