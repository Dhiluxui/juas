import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

export const ChromaticAberrationText = ({ text = "CHROMATIC", className = "" }: { text?: string, className?: string }) => {
  const controls = useAnimation();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) {
      controls.start({
        x: [0, -2, 2, -1, 1, 0],
        y: [0, 1, -1, 2, -2, 0],
        transition: { duration: 0.2, repeat: Infinity, repeatType: 'mirror', repeatDelay: 3 }
      });
    }
  }, [isHovered, controls]);

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => {
        setIsHovered(true);
        controls.start({ x: [-4, 4, -4], y: [-2, 2, -2], transition: { duration: 0.1, repeat: Infinity }});
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {/* Cyan layer */}
      <motion.span
        animate={controls}
        className="absolute top-0 left-0 text-cyan-400 mix-blend-screen opacity-70 blur-[0.5px]"
        style={{ translateX: isHovered ? '-4px' : '-1px', translateY: isHovered ? '2px' : '0.5px' }}
      >
        {text}
      </motion.span>
      {/* Red layer */}
      <motion.span
        animate={controls}
        className="absolute top-0 left-0 text-red-500 mix-blend-screen opacity-70 blur-[0.5px]"
        style={{ translateX: isHovered ? '4px' : '1px', translateY: isHovered ? '-2px' : '-0.5px' }}
      >
        {text}
      </motion.span>
      {/* Green layer */}
      <motion.span
        animate={controls}
        className="absolute top-0 left-0 text-green-400 mix-blend-screen opacity-50 blur-[0.5px]"
        style={{ translateX: isHovered ? '0px' : '0px', translateY: isHovered ? '4px' : '1px' }}
      >
        {text}
      </motion.span>
      {/* Base layer */}
      <span className="relative text-white mix-blend-overlay z-10">{text}</span>
    </div>
  );
};
