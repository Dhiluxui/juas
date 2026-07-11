import { motion } from "framer-motion";

export const HolographicScanText = ({ text = "HOLOGRAPHIC" }: any) => {
  return (
    <div className="relative inline-block overflow-hidden py-4 px-2">
      {/* Base Text */}
      <h2 className="text-5xl md:text-7xl font-black text-blue-300/30 font-mono tracking-widest">{text}</h2>
      
      {/* Scanning Layer */}
      <motion.h2
        className="text-5xl md:text-7xl font-black text-transparent font-mono tracking-widest absolute top-4 left-2 z-10 bg-clip-text"
        style={{
          backgroundImage: "linear-gradient(to bottom, transparent 40%, rgba(56, 189, 248, 1) 45%, rgba(255, 255, 255, 1) 50%, rgba(56, 189, 248, 1) 55%, transparent 60%)",
          backgroundSize: "100% 200%",
        }}
        animate={{ backgroundPosition: ["0% -100%", "0% 200%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      >
        {text}
      </motion.h2>
      
      {/* Chromatic Aberration */}
      <motion.h2
        className="text-5xl md:text-7xl font-black text-red-500/50 font-mono tracking-widest absolute top-4 left-[10px] z-0 mix-blend-screen"
        animate={{ opacity: [0.3, 0.6, 0.3], x: [-1, 1, -1] }}
        transition={{ duration: 0.1, repeat: Infinity, repeatType: "mirror" }}
      >
        {text}
      </motion.h2>
      <motion.h2
        className="text-5xl md:text-7xl font-black text-cyan-500/50 font-mono tracking-widest absolute top-4 left-[6px] z-0 mix-blend-screen"
        animate={{ opacity: [0.6, 0.3, 0.6], x: [1, -1, 1] }}
        transition={{ duration: 0.15, repeat: Infinity, repeatType: "mirror" }}
      >
        {text}
      </motion.h2>
    </div>
  );
};