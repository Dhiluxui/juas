import React from "react";
import { motion } from "framer-motion";

export default function App({ text = "CYBERNETIC" }) {
  return (
    <div className="min-h-screen w-full bg-neutral-950 relative flex justify-center items-center overflow-hidden font-sans select-none">
      
      <div className="relative py-12 px-4 flex justify-center items-center w-full">
        {}
        <h2 className="text-5xl md:text-7xl lg:text-9xl font-black text-neutral-600 tracking-widest relative z-0">
          {text}
        </h2>
        
        {}
        <motion.h2
          className="text-5xl md:text-7xl lg:text-9xl font-black text-rose-500 absolute inset-0 flex justify-center items-center tracking-widest mix-blend-screen pointer-events-none z-10"
          animate={{ 
            clipPath: [
              "polygon(0 0, 100% 0, 100% 10%, 0 10%)",
              "polygon(0 40%, 100% 40%, 100% 50%, 0 50%)",
              "polygon(0 80%, 100% 80%, 100% 90%, 0 90%)",
              "polygon(0 20%, 100% 20%, 100% 30%, 0 30%)"
            ],
            x: [-4, 4, -6, 2],
            opacity: [0, 1, 0.8, 1]
          }}
          transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
        >
          {text}
        </motion.h2>
        
        {}
        <motion.h2
          className="text-5xl md:text-7xl lg:text-9xl font-black text-cyan-400 absolute inset-0 flex justify-center items-center tracking-widest mix-blend-screen pointer-events-none z-10"
          animate={{ 
            clipPath: [
              "polygon(0 15%, 100% 15%, 100% 25%, 0 25%)",
              "polygon(0 55%, 100% 55%, 100% 65%, 0 65%)",
              "polygon(0 35%, 100% 35%, 100% 45%, 0 45%)",
              "polygon(0 75%, 100% 75%, 100% 85%, 0 85%)"
            ],
            x: [4, -4, 2, -2],
            opacity: [1, 0, 1, 0.5]
          }}
          transition={{ duration: 0.15, repeat: Infinity, repeatType: "mirror" }}
        >
          {text}
        </motion.h2>
      </div>

    </div>
  );
}