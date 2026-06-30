import { motion } from "framer-motion";

export const GlitchEffectText = ({ 
  text = "NEUROMANCER", 
  duration = 1.5 
}: { 
  text?: string, 
  duration?: number, 
  ease?: string,
  splitType?: string
}) => {
  const redGlitch = {
    animate: {
      x: [0, -4, 4, -2, 2, 0, -3, 3, 0],
      y: [0, 2, -2, 1, -1, 0, 2, -2, 0],
      skewX: [0, -10, 10, 0, 5, -5, 0],
      clipPath: [
        "inset(10% 0 80% 0)",
        "inset(40% 0 10% 0)",
        "inset(80% 0 5% 0)",
        "inset(20% 0 50% 0)",
        "inset(0% 0 0% 0)"
      ],
      transition: { duration: duration, repeat: Infinity, repeatType: "mirror" as const }
    }
  };

  const cyanGlitch = {
    animate: {
      x: [0, 4, -4, 2, -2, 0, 3, -3, 0],
      y: [0, -2, 2, -1, 1, 0, -2, 2, 0],
      skewX: [0, 10, -10, 0, -5, 5, 0],
      clipPath: [
        "inset(80% 0 5% 0)",
        "inset(10% 0 80% 0)",
        "inset(20% 0 50% 0)",
        "inset(40% 0 10% 0)",
        "inset(0% 0 0% 0)"
      ],
      transition: { duration: duration, repeat: Infinity, repeatType: "mirror" as const, delay: 0.1 }
    }
  };

  return (
    <div className="relative group cursor-pointer inline-block py-2 px-1 select-none">
      <div className="absolute inset-0 bg-red-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <motion.h2
        className="text-4xl md:text-6xl font-mono font-black text-red-500 absolute top-2 left-0 mix-blend-screen opacity-0 group-hover:opacity-90"
        variants={redGlitch}
        animate="animate"
      >
        {text}
      </motion.h2>
      <motion.h2
        className="text-4xl md:text-6xl font-mono font-black text-cyan-400 absolute top-2 left-2 mix-blend-screen opacity-0 group-hover:opacity-90"
        variants={cyanGlitch}
        animate="animate"
      >
        {text}
      </motion.h2>
      <motion.h2 
        className="text-4xl md:text-6xl font-mono font-black text-white relative z-10 transition-colors group-hover:text-white/80 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        whileHover={{
           skewX: [0, -4, 4, 0],
           x: [0, -1, 1, 0],
           transition: { duration: 0.2, repeat: Infinity }
        }}
      >
        {text}
      </motion.h2>
    </div>
  );
};