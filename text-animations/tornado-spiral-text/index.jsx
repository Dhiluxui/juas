import { motion } from "framer-motion";

export const TornadoSpiralText = ({ text = "TORNADO" }: any) => {
  const letters = Array.from(text);

  return (
    <div className="relative py-16 px-4 w-full min-h-[300px] flex justify-center items-center rounded-xl overflow-hidden" style={{ perspective: "1200px" }}>
      <h2 className="flex flex-wrap justify-center gap-2 text-5xl md:text-8xl font-black text-white uppercase" style={{ transformStyle: "preserve-3d" }}>
        {letters.map((char, i) => (
          <motion.span
            key={i}
            className="inline-block"
            animate={{ 
              rotateY: [360, 0],
              z: [-1000, 0],
              opacity: [0, 1]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              repeatDelay: 2,
              delay: i * 0.1,
              ease: "circOut"
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </h2>
    </div>
  );
};