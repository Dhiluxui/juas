import { motion } from "framer-motion";

export const MagneticGooText = ({ text = "GOOEY" }: any) => {
  const letters = Array.from(text);

  return (
    <div className="relative py-12 px-6 flex justify-center w-full">
      <svg className="hidden">
        <filter id="magnetic-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>

      <h2 
        className="text-6xl md:text-8xl font-black text-yellow-400 flex gap-2"
        style={{ filter: "url(#magnetic-goo)" }}
      >
        {letters.map((char, i) => (
          <motion.span
            key={i}
            drag
            dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
            dragElastic={0.4}
            whileHover={{ scale: 1.2 }}
            className="inline-block cursor-grab active:cursor-grabbing origin-center"
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </h2>
    </div>
  );
};