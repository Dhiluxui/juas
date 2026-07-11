import { motion } from "framer-motion";

export const WaterRippleText = ({ text = "DEEP WATER" }: { text?: string }) => {
  const letters = Array.from(text);
  const filterId = "water-rpl";

  return (
    <div className="relative py-20 px-6 flex justify-center items-center overflow-hidden min-h-[320px]">

      {/* Actual SVG water displacement filter */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-60%" width="140%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.08" numOctaves="3" result="noise">
              <animate
                attributeName="baseFrequency"
                values="0.015 0.06;0.025 0.10;0.015 0.06"
                dur="5s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            {/* Slight blue tint to the displaced version */}
            <feColorMatrix in="displaced" type="saturate" values="2" />
          </filter>
        </defs>
      </svg>

      {/* Expanding ripple rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3, 4].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-cyan-400/20"
            initial={{ width: 40, height: 10, opacity: 0.8 }}
            animate={{ width: ring * 220, height: ring * 30, opacity: 0 }}
            transition={{ duration: 4, delay: ring * 0.8, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      </div>

      {/* Per-letter staggered wave */}
      <h2 className="flex gap-[0.04em] relative z-10" style={{ filter: `url(#${filterId})` }}>
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            className="inline-block text-6xl md:text-8xl font-black text-cyan-200 origin-bottom"
            style={{ textShadow: "0 0 20px rgba(103,232,249,0.6), 0 0 40px rgba(103,232,249,0.2)" }}
            animate={{
              y: [0, -20, 0, -8, 0],
              scaleY: [1, 1.15, 0.92, 1.05, 1],
              rotateZ: [0, 1.5, -1.5, 0.5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </h2>
    </div>
  );
};