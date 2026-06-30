import { motion } from "framer-motion";

export const CinematicPanText = ({ text = "CINEMATIC", duration = 2, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <motion.h2 
      className={`text-4xl md:text-6xl font-serif text-white flex flex-wrap py-2 px-1 uppercase ${splitType === 'words' ? 'gap-2' : ''}`}
      initial={{ opacity: 0, letterSpacing: "0.5em", filter: "blur(10px)" }}
      animate={{ opacity: 1, letterSpacing: "0.05em", filter: "blur(0px)" }}
      transition={{ duration: duration, ease: "easeOut" }}
    >
      {elements.map((el, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: duration * 0.8, delay: index * 0.05 }}
          className="inline-block relative overflow-hidden"
        >
          {/* Cinematic Light Sweep / Flare */}
          <motion.span 
            className="absolute top-0 left-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-50 mix-blend-overlay"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: duration, delay: index * 0.05, repeat: Infinity, repeatDelay: 3 }}
          />
          {el === " " && splitType === "chars" ? "\u00A0" : el}
        </motion.span>
      ))}
    </motion.h2>
  );
};