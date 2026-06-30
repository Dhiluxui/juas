import { useEffect, useState } from "react";

export const SquigglyText = ({ text = "CARTOON", duration = 0.5, splitType = "chars" }: any) => {
  const [filterIndex, setFilterIndex] = useState(0);

  useEffect(() => {
    // Map duration prop to interval speed. Hard state loop prevents Framer interpolation bugs.
    const speed = Math.max(50, duration * 200); 
    const interval = setInterval(() => {
      setFilterIndex((prev) => (prev + 1) % 4);
    }, speed);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <>
      {/* Invisible multi-layered turbulence filters to simulate hand-drawn jitter */}
      <svg className="hidden">
        <defs>
          <filter id="squiggly-0">
            <feTurbulence baseFrequency="0.015" numOctaves="3" result="noise" seed="0" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="squiggly-1">
            <feTurbulence baseFrequency="0.015" numOctaves="3" result="noise" seed="1" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="squiggly-2">
            <feTurbulence baseFrequency="0.015" numOctaves="3" result="noise" seed="2" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="squiggly-3">
            <feTurbulence baseFrequency="0.015" numOctaves="3" result="noise" seed="3" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      
      <h2 
        className="text-4xl md:text-6xl font-black text-yellow-300 drop-shadow-[5px_5px_0_rgba(239,68,68,1)] uppercase py-2 px-1"
        style={{ filter: `url(#squiggly-${filterIndex})` }}
      >
        {text}
      </h2>
    </>
  );
};