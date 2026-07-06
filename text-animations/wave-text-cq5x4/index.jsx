import { motion } from "framer-motion";

export const WaveText = ({ 
  text = "Wave Effect", 
  duration = 1.2, 
  ease = "easeInOut", 
  splitType = "chars" 
}: { 
  text?: string, 
  duration?: number, 
  ease?: string, 
  splitType?: string 
}) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { 
        staggerChildren: 0.1, 
        delayChildren: 0.04 * i 
      },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: [0, -30, 0],
      rotateX: [0, 45, 0],
      scale: [1, 1.3, 1],
      color: ["#ffffff", "#00e5ff", "#ffffff"],
      textShadow: [
        "0px 0px 0px rgba(0,229,255,0)",
        "0px 20px 25px rgba(0,229,255,0.6)",
        "0px 0px 0px rgba(0,229,255,0)"
      ],
      transition: {
        duration: duration,
        ease: ease,
        repeat: Infinity,
        repeatType: "loop" as const,
        times: [0, 0.5, 1]
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  return (
    <motion.h2
      className={`text-5xl md:text-7xl font-black flex flex-wrap py-10 px-2 perspective-1000 ${splitType === "words" ? "gap-[0.3em]" : ""}`}
      style={{ perspective: "800px", transformStyle: "preserve-3d" }}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {elements.map((el, index) => (
        <motion.span 
          variants={child} 
          key={index}
          className="inline-block origin-bottom"
        >
          {el === " " && splitType === "chars" ? "\u00A0" : el}
        </motion.span>
      ))}
    </motion.h2>
  );
};