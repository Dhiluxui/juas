import { motion } from "framer-motion";

export const ShatteredGlassText = ({ text = "SHATTERED", duration = 1.2, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-extrabold text-blue-300 flex flex-wrap py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => (
        <span key={index} className="relative inline-block mx-[1px]">
          {/* Top Half of the Shattered Letter */}
          <motion.span
            className="absolute top-0 left-0 text-blue-100 mix-blend-screen"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 55%)' }}
            initial={{ x: -20, y: -20, opacity: 0, rotate: -15 }}
            animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 100, delay: index * 0.05 }}
          >
            {el === " " && splitType === "chars" ? "\u00A0" : el}
          </motion.span>
          
          {/* Bottom Half of the Shattered Letter */}
          <motion.span
            className="absolute top-0 left-0 text-cyan-400 mix-blend-screen"
            style={{ clipPath: 'polygon(0 55%, 100% 45%, 100% 100%, 0 100%)' }}
            initial={{ x: 20, y: 20, opacity: 0, rotate: 15 }}
            animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 100, delay: index * 0.05 + 0.05 }}
          >
            {el === " " && splitType === "chars" ? "\u00A0" : el}
          </motion.span>
          
          {/* Invisible Spacer to maintain correct layout flow */}
          <span className="opacity-0">{el === " " && splitType === "chars" ? "\u00A0" : el}</span>
        </span>
      ))}
    </h2>
  );
};