import { motion } from "framer-motion";

export const SandstormText = ({ text = "SANDSTORM" }: any) => {
  const letters = Array.from(text);

  return (
    <div className="relative py-16 px-4 w-full h-[250px] flex justify-center items-center overflow-hidden rounded-xl">
      <h2 className="flex flex-wrap justify-center text-5xl md:text-8xl font-black text-amber-500 uppercase">
        {letters.map((char, i) => (
          <motion.span
            key={i}
            className="inline-block origin-left"
            animate={{ 
              x: [0, 0, 300, 0],
              scaleX: [1, 1, 15, 1],
              opacity: [1, 1, 0, 0],
              filter: ["blur(0px)", "blur(0px)", "blur(10px)", "blur(0px)"]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              times: [0, 0.4, 0.8, 1],
              ease: "easeIn",
              delay: i * 0.1 
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </h2>
    </div>
  );
};