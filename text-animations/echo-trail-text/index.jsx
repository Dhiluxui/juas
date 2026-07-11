import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";

export const EchoTrailText = ({ text = "ECHOES" }: any) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left - rect.width / 2,
          y: e.clientY - rect.top - rect.height / 2
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={ref} className="relative w-full h-[250px] flex justify-center items-center overflow-hidden">
      <h2 className="text-5xl md:text-8xl font-black text-neutral-800 z-10 pointer-events-none">{text}</h2>
      
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.h2
          key={i}
          className="text-5xl md:text-8xl font-black text-transparent absolute pointer-events-none mix-blend-screen"
          style={{ WebkitTextStroke: `2px rgba(99, 102, 241, ${1 - i * 0.15})` }}
          animate={{ x: mousePos.x * (i * 0.1), y: mousePos.y * (i * 0.1) }}
          transition={{ type: "spring", stiffness: 150 - i * 15, damping: 10 + i * 2 }}
        >
          {text}
        </motion.h2>
      ))}
    </div>
  );
};