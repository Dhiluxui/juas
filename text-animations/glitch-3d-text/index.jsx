import { motion } from "framer-motion";

export const GlitchText3D = ({ text = "SYSTEM ERROR", duration = 0.5, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-white flex flex-wrap py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => (
        <span key={index} className="relative inline-block group cursor-pointer">
          <span className="relative z-10">{el === " " && splitType === "chars" ? "\u00A0" : el}</span>
          {el !== " " && (
            <>
              {/* Cyan Chromatic Layer */}
              <motion.span
                className="absolute top-0 left-0 text-cyan-400 opacity-70 z-0 mix-blend-screen pointer-events-none"
                animate={{ x: [-2, 2, -1, 3, 0], y: [1, -1, 2, -2, 0] }}
                transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror", delay: Math.random() }}
              >
                {el}
              </motion.span>
              {/* Red Chromatic Layer */}
              <motion.span
                className="absolute top-0 left-0 text-red-500 opacity-70 z-0 mix-blend-screen pointer-events-none"
                animate={{ x: [2, -2, 3, -1, 0], y: [-1, 1, -2, 2, 0] }}
                transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror", delay: Math.random() }}
              >
                {el}
              </motion.span>
            </>
          )}
        </span>
      ))}
    </h2>
  );
};