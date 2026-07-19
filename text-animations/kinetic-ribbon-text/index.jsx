import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function App({ text = "KINETIC RIBBON " }) {
  // Pad the text with spaces if it's too short to ensure a nice, long ribbon effect
  const paddedText = text.length < 15 ? text.padEnd(15, " ") : text;
  const letters = Array.from(paddedText);
  
  const [time, setTime] = useState(0);

  useEffect(() => {
    let animationFrame;
    
    const loop = () => {
      // Increment time every frame to drive the continuous sine wave
      setTime(t => t + 0.05);
      animationFrame = requestAnimationFrame(loop);
    };
    
    // Start the recursive animation loop
    loop();
    
    // Cleanup the animation frame to prevent memory leaks on unmount
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div 
      className="relative min-h-screen w-full flex justify-center items-center overflow-hidden bg-neutral-950 font-sans select-none" 
      style={{ perspective: "1000px" }}
    >
      <h2 
        className="flex font-black text-5xl md:text-7xl lg:text-9xl uppercase drop-shadow-2xl" 
        style={{ transformStyle: "preserve-3d" }}
      >
        {letters.map((char, i) => {
          // Calculate continuous 3D sine wave phase based on character index and current time
          const phase = i * 0.4 + time;
          
          // Compute XYZ offsets and rotations using trigonometric functions for a flowing ribbon look
          const yOffset = Math.sin(phase) * 60;
          const zOffset = Math.cos(phase) * 60;
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
                // Dynamically darken the color when the letter is pushed backwards in Z-space 
                // This fakes ambient lighting/depth of field!
                color: Math.cos(phase) > 0 ? "#d946ef" : "#86198f" 
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          );
        })}
      </h2>
    </div>
  );
}