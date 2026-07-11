import { motion } from "framer-motion";

export const FireText = ({ 
  text = "INFERNO", 
}: { 
  text?: string 
}) => {
  const letters = Array.from(text);

  return (
    <div className="relative py-20 px-8 flex justify-center items-center overflow-hidden">
      
      {/* SVG Filters */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="fire-main" x="-20%" y="-60%" width="140%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025 0.06" numOctaves="4" result="noise">
              <animate attributeName="baseFrequency" values="0.025 0.06;0.03 0.08;0.025 0.06" dur="3s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            <feComposite in="SourceGraphic" in2="displaced" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* Ground fire glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 pointer-events-none" 
        style={{ background: "radial-gradient(ellipse at center bottom, rgba(255,80,0,0.5) 0%, transparent 80%)", filter: "blur(15px)" }} 
      />

      {/* Per-letter staggered fire */}
      <h2 className="flex gap-[0.02em] relative z-10" style={{ filter: "url(#fire-main)" }}>
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            className="inline-block text-6xl md:text-8xl font-black"
            style={{
              background: "linear-gradient(to top, #ff2200 0%, #ff6600 30%, #ffcc00 65%, #fff5e0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "none",
              filter: "drop-shadow(0px -4px 8px rgba(255,80,0,0.8))"
            }}
            animate={{
              y: [0, -4 - Math.random() * 6, 0, -2, 0],
              scaleY: [1, 1.05, 0.97, 1.02, 1],
            }}
            transition={{
              duration: 0.6 + Math.random() * 0.4,
              repeat: Infinity,
              delay: i * 0.08,
              ease: "easeInOut"
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </h2>
    </div>
  );
};