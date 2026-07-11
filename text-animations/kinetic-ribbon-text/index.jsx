import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const KineticRibbonText = ({ text = "KINETIC RIBBON " }: any) => {
  const paddedText = text.length < 15 ? text.padEnd(15, " ") : text;
  const letters = Array.from(paddedText);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    const loop = () => {
      setTime(t => t + 0.05);
      animationFrame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="relative w-full h-[300px] flex justify-center items-center overflow-hidden bg-neutral-900 rounded-xl" style={{ perspective: "800px" }}>
      <h2 className="flex font-black text-4xl md:text-6xl text-fuchsia-500 uppercase" style={{ transformStyle: "preserve-3d" }}>
        {letters.map((char, i) => {
          // Calculate continuous 3D sine wave for ribbon effect
          const phase = i * 0.4 + time;
          const yOffset = Math.sin(phase) * 50;
          const zOffset = Math.cos(phase) * 50;
          const rotateX = Math.sin(phase) * -30;
          const rotateY = Math.cos(phase) * 20;

          return (
            <motion.span
              key={i}
              className="inline-block"
              style={{
                y: yOffset,
                z: zOffset,
                rotateX: rotateX,
                rotateY: rotateY,
                color: Math.cos(phase) > 0 ? "#d946ef" : "#a21caf" // Dynamically darken when pushed backwards in Z-space
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          );
        })}
      </h2>
    </div>
  );
};