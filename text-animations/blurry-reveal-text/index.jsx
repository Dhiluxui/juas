import { motion } from "framer-motion";

export const BlurryRevealText = ({
  text = "INTO FOCUS",
  duration = 1.4,
}: {
  text?: string;
  duration?: number;
  ease?: string;
  splitType?: string;
}) => {
  const letters = Array.from(text);

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  };

  const child = {
    hidden: {
      opacity: 0,
      filter: "blur(40px)",
      scale: 1.8,
      y: 30,
      color: "rgba(255,255,255,0)",
    },
    visible: (i: number) => ({
      opacity: 1,
      filter: "blur(0px)",
      scale: 1,
      y: 0,
      // Cycle through warm → white as letters focus in
      color: "#ffffff",
      transition: {
        duration: duration,
        ease: [0.16, 1, 0.3, 1],
        delay: i * 0.02,
      },
    }),
  };

  return (
    <div className="relative py-20 px-6 flex justify-center items-center overflow-hidden min-h-[280px]">

      {/* Radial ambient bloom that fades as text sharpens */}
      <motion.div
        className="absolute inset-0 m-auto w-full h-32 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, transparent 70%)" }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: duration * 2, delay: 0.3, ease: "easeOut" }}
      />

      <motion.h2
        className="text-6xl md:text-8xl font-black flex flex-wrap justify-center gap-[0.04em] relative z-10"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
      >
        {letters.map((el, i) => (
          <motion.span
            key={i}
            custom={i}
            variants={child}
            className="inline-block"
            style={{
              textShadow: "0 0 30px rgba(255,255,255,0.6), 0 0 60px rgba(255,255,255,0.2)",
            }}
          >
            {el === " " ? "\u00A0" : el}
          </motion.span>
        ))}
      </motion.h2>
    </div>
  );
};