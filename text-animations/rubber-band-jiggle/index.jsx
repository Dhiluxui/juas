import { motion, useAnimationControls } from "framer-motion";
import { useState } from "react";

export const JiggleText = ({ 
  text = "Rubber Band", 
  duration = 0.8, 
  splitType = "chars" 
}: { 
  text?: string, 
  duration?: number, 
  ease?: string,
  splitType?: string
}) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-extrabold flex flex-wrap py-2 px-1 ${splitType === "words" ? "gap-[0.2em]" : ""}`}>
      {elements.map((el, index) => (
        <RubberBandLetter key={index} letter={el} duration={duration} splitType={splitType} />
      ))}
    </h2>
  );
};

const RubberBandLetter = ({ letter, duration, splitType }: { letter: string, duration: number, splitType: string }) => {
  const controls = useAnimationControls();
  const [isPlaying, setIsPlaying] = useState(false);

  const rubberBand = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    await controls.start({
      transform: [
        "scale3d(1, 1, 1)",
        "scale3d(1.25, 0.75, 1)",
        "scale3d(0.75, 1.25, 1)",
        "scale3d(1.15, 0.85, 1)",
        "scale3d(0.95, 1.05, 1)",
        "scale3d(1.05, 0.95, 1)",
        "scale3d(1, 1, 1)",
      ],
      transition: {
        times: [0, 0.4, 0.6, 0.7, 0.8, 0.9, 1],
        duration: duration || 0.8,
      }
    });
    setIsPlaying(false);
  };

  return (
    <motion.span
      animate={controls}
      onHoverStart={rubberBand}
      className="text-amber-400 cursor-pointer inline-block origin-bottom select-none"
    >
      {letter === " " && splitType === "chars" ? "\u00A0" : letter}
    </motion.span>
  );
};