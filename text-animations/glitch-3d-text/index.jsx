import { motion } from "framer-motion";

export const GlitchText3D = ({
  text = "SYSTEM ERROR",
  splitType = "chars",
}: {
  text?: string;
  duration?: number;
  splitType?: string;
}) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <div className="relative py-24 px-8 flex justify-center items-center overflow-hidden min-h-[300px] bg-neutral-950">
      
      {/* Background static noise simulation */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')",
        }}
      />

      <h2
        className={`text-6xl md:text-8xl font-black text-white flex flex-wrap justify-center relative z-10 ${
          splitType === "words" ? "gap-6" : ""
        }`}
        style={{ perspective: "1000px" }}
      >
        {elements.map((el, index) => (
          <span
            key={index}
            className="relative inline-block group cursor-crosshair hover:scale-110 transition-transform duration-200"
            style={{ transformStyle: "preserve-3d" }}
          >
            <span className="relative z-10 block">
              {el === " " && splitType === "chars" ? "\u00A0" : el}
            </span>
            
            {el !== " " && (
              <>
                {/* Cyan Chromatic Layer */}
                <motion.span
                  className="absolute top-0 left-0 text-cyan-400 opacity-80 z-0 mix-blend-screen pointer-events-none drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                  style={{ transform: "translateZ(-10px)" }}
                  animate={{
                    x: [-3, 3, -2, 4, 0],
                    y: [2, -2, 3, -3, 0],
                    skewX: [0, -10, 10, 0, 0],
                  }}
                  transition={{
                    duration: 0.2,
                    repeat: Infinity,
                    repeatType: "mirror",
                    delay: Math.random() * 0.2,
                  }}
                >
                  {el}
                </motion.span>
                
                {/* Red Chromatic Layer */}
                <motion.span
                  className="absolute top-0 left-0 text-red-500 opacity-80 z-0 mix-blend-screen pointer-events-none drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                  style={{ transform: "translateZ(-20px)" }}
                  animate={{
                    x: [3, -3, 4, -2, 0],
                    y: [-2, 2, -3, 3, 0],
                    skewX: [0, 10, -10, 0, 0],
                  }}
                  transition={{
                    duration: 0.25,
                    repeat: Infinity,
                    repeatType: "mirror",
                    delay: Math.random() * 0.2,
                  }}
                >
                  {el}
                </motion.span>

                {/* Glitch Slices */}
                <motion.span
                  className="absolute top-[30%] left-0 h-[10%] w-full bg-white opacity-50 z-20 pointer-events-none mix-blend-overlay"
                  animate={{
                    x: ["-10%", "10%", "-5%", "15%", "0%"],
                    opacity: [0, 1, 0, 0.5, 0]
                  }}
                  transition={{ duration: 0.15, repeat: Infinity, repeatDelay: Math.random() * 2 }}
                />
              </>
            )}
          </span>
        ))}
      </h2>
    </div>
  );
};