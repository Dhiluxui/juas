import { motion } from "framer-motion";

export const EightBitCurtainText = ({ text = "PIXELATE bit", duration = 1.5, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);
  
  // Creates a 5x5 mathematical grid of blocks to hide the letter
  const blocks = Array.from({ length: 25 });

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-lime-400 flex flex-wrap py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => (
        <span key={index} className="relative inline-block">
          <span className="relative z-0">{el === " " && splitType === "chars" ? "\u00A0" : el}</span>
          
          {/* Overlay pixel grid curtain */}
          {el !== " " && (
            <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 z-10 pointer-events-none">
              {blocks.map((_, i) => (
                <motion.div
                  key={i}
                  className="bg-neutral-950 w-full h-full"
                  initial={{ opacity: 1, scale: 1 }}
                  whileInView={{ opacity: 0, scale: 0 }}
                  viewport={{ once: false }}
                  transition={{
                    duration: 0.1,
                    delay: Math.random() * 0.4 + (index * 0.08),
                    ease: "linear"
                  }}
                />
              ))}
            </div>
          )}
        </span>
      ))}
    </h2>
  );
};