import { motion } from "framer-motion";

export const BlobRevealText = ({ text = "BLOBBING" }: { text?: string }) => {
  const letters = Array.from(text);
  const filterId = "blob-rev-filter";

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  return (
    <div className="relative py-20 px-6 flex justify-center items-center overflow-hidden min-h-[300px]">
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12"
              result="blob"
            />
            <feComposite in="SourceGraphic" in2="blob" operator="over" />
          </filter>
        </defs>
      </svg>

      <motion.h2
        className="flex flex-wrap justify-center gap-0 relative z-10"
        style={{ filter: `url(#${filterId})` }}
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            className="inline-block text-6xl md:text-8xl font-black text-white tracking-tighter"
            style={{
              textShadow: "0 0 30px rgba(255,255,255,0.3)",
            }}
            initial={{ scale: 3, opacity: 0, filter: "blur(20px)" }}
            whileInView={{
              scale: 1,
              opacity: 1,
              filter: "blur(0px)",
            }}
            viewport={{ once: true }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 14,
              delay: i * 0.07,
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </motion.h2>
    </div>
  );
};