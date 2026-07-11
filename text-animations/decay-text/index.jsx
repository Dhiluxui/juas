import { useEffect, useState } from "react";

export const DecayText = ({ text = "ACID EROSION" }: any) => {
  const [erosion, setErosion] = useState(0);

  useEffect(() => {
    let phase = 0;
    const interval = setInterval(() => {
      phase += 0.1;
      // Oscillate erosion between 0 and 6 using a sine wave
      setErosion(Math.abs(Math.sin(phase) * 6));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative py-12 px-4 flex flex-wrap justify-center items-center w-full bg-zinc-950 rounded-xl overflow-hidden min-h-[250px]">
      <svg className="hidden">
        <filter id="decay-filter">
          <feMorphology operator="erode" radius={erosion} result="erode" />
          <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="2" result="noise" />
          <feDisplacementMap in="erode" in2="noise" scale={erosion * 4} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      
      <h2 
        className="text-5xl md:text-8xl font-black text-lime-400 uppercase tracking-widest text-center"
        style={{ filter: "url(#decay-filter)" }}
      >
        {text}
      </h2>
    </div>
  );
};