import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { calculateMagneticForce } from "../../utils/math/physics";

export const LiquidMagneticText = ({ text = "Magnetic Pull", duration = 0.5 }: { text?: string, duration?: number }) => {
  const letters = Array.from(text);

  return (
    <h2 className="text-4xl md:text-6xl font-black text-white flex gap-[0.1em] py-4 px-2">
      {letters.map((letter, index) => (
        <MagneticLetter key={index} letter={letter} />
      ))}
    </h2>
  );
};

const MagneticLetter = ({ letter }: { letter: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrame: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Offload heavy physics calculation to pure function
      const force = calculateMagneticForce(e.clientX, e.clientY, centerX, centerY, 150, 0.6);
      
      // Throttle updates via requestAnimationFrame
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => setPosition(force));
    };

    const handleMouseLeave = () => {
      cancelAnimationFrame(animationFrame);
      setPosition({ x: 0, y: 0 });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseLeave);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseLeave);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <motion.span
      ref={ref}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className="inline-block cursor-default select-none text-cyan-400"
    >
      {letter === " " ? "\u00A0" : letter}
    </motion.span>
  );
};