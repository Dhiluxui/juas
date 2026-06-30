import { motion } from "framer-motion";

export const RevealDropText = ({ text = "Dropping In!", duration = 0.5, ease = "easeInOut", splitType = "words" }: { text?: string, duration?: number, ease?: string, splitType?: string }) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: duration * 0.2, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: duration, ease: ease } },
    hidden: { opacity: 0, y: -50, scale: 0.5 },
  };

  return (
    <motion.h2
      className={`text-4xl md:text-6xl font-bold text-gray-100 flex flex-wrap py-2 px-1 ${splitType === "words" ? "gap-x-2 gap-y-2" : ""}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {elements.map((el, index) => (
        <motion.span variants={child} key={index} className="inline-block">
          {el === " " && splitType === "chars" ? "\u00A0" : el}
        </motion.span>
      ))}
    </motion.h2>
  );
};