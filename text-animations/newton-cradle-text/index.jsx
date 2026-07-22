import React from 'react';
import { motion } from 'framer-motion';

export const FooterNewtonCradle = ({ 
  text = "STUDIO", 
  duration = 1.5, 
  swingCount = 1,
  splitType = "chars" 
}) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);
  const safeSwingCount = Math.min(swingCount, Math.floor(elements.length / 2));

  return (
    <div className="flex justify-center items-start pt-2 w-full h-full overflow-hidden">
      <div className="flex gap-[2px] sm:gap-1">
        {elements.map((el, index) => {
          const isLeftSwinger = index < safeSwingCount;
          const isRightSwinger = index >= elements.length - safeSwingCount;
          const isMiddle = !isLeftSwinger && !isRightSwinger;

          let times = [0, 0.25, 0.5, 0.75, 1];
          let rotate = [0, 0, 0, 0, 0];
          let ease = ["linear", "linear", "linear", "linear"];
          let textShadow = [
            "0px 0px 0px rgba(255,255,255,0)",
            "0px 0px 0px rgba(255,255,255,0)",
            "0px 0px 0px rgba(255,255,255,0)",
            "0px 0px 0px rgba(255,255,255,0)",
            "0px 0px 0px rgba(255,255,255,0)"
          ];

          if (isLeftSwinger) {
            rotate = [35, 0, 0, 0, 35]; // Positive rotation swings the bottom OUT to the LEFT
            ease = ["circIn", "linear", "linear", "circOut"];
          } else if (isRightSwinger) {
            rotate = [0, 0, -35, 0, 0]; // Negative rotation swings the bottom OUT to the RIGHT
            ease = ["linear", "circOut", "circIn", "linear"];
          } else if (isMiddle) {
            rotate = [0, 0, -1, 0, 0, 1, 0, 0]; // Micro-jolts slightly left and right on impact
            times = [0, 0.24, 0.25, 0.35, 0.74, 0.75, 0.85, 1];
            ease = ["linear", "linear", "linear", "linear", "linear", "linear", "linear"];
            textShadow = [
              "0px 0px 0px rgba(255,255,255,0)",     
              "0px 0px 0px rgba(255,255,255,0)",     
              "0px 0px 15px rgba(255,255,255,0.6)",  // Left impact glow
              "0px 0px 0px rgba(255,255,255,0)",     
              "0px 0px 0px rgba(255,255,255,0)",     
              "0px 0px 15px rgba(255,255,255,0.6)",  // Right impact glow
              "0px 0px 0px rgba(255,255,255,0)",     
              "0px 0px 0px rgba(255,255,255,0)",     
            ];
          }

          return (
            <motion.div
              key={index}
              className="relative flex flex-col items-center origin-top"
              initial={{ rotate: isLeftSwinger ? 35 : 0 }} // Starts correctly pulled back to the left
              animate={{ rotate }}
              transition={{
                duration: duration,
                repeat: Infinity,
                times,
                ease,
              }}
            >
              {/* Minimalist physical pivot point */}
              <div className="w-1 h-1 rounded-full bg-neutral-600/80 mb-[1px]" />
              
              {/* Delicate string/wire suitable for footer scale */}
              <div className="w-[1px] h-8 sm:h-12 bg-gradient-to-b from-neutral-600/60 to-neutral-400/30" />
              
              {/* Sleek footer typography */}
              <motion.div 
                className="mt-1 flex items-center justify-center px-1 sm:px-1.5"
                animate={isMiddle ? { textShadow } : {}}
                transition={isMiddle ? {
                  duration: duration,
                  repeat: Infinity,
                  times: [0, 0.24, 0.25, 0.35, 0.74, 0.75, 0.85, 1],
                  ease: "linear"
                } : {}}
              >
                <span className="text-xl sm:text-3xl font-bold text-neutral-300 hover:text-white transition-colors tracking-widest uppercase">
                  {el === " " && splitType === "chars" ? "\u00A0" : el}
                </span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="w-full min-h-screen bg-neutral-950 flex items-center justify-center">
      <FooterNewtonCradle text="AGENCY" duration={1.6} swingCount={1} />
    </div>
  );
}