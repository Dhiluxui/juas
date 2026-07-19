import React, { useEffect, useState } from "react";

export default function App({ text = "ACID EROSION" }) {
  const [erosion, setErosion] = useState(0);

  useEffect(() => {
    let animationFrameId;
    let phase = 0;

    const animate = () => {
      // Slower phase increment because requestAnimationFrame fires ~60 times a second
      phase += 0.03; 
      // Oscillate erosion between 0 and 6 using a sine wave to create a breathing/melting effect
      setErosion(Math.abs(Math.sin(phase) * 6));
      animationFrameId = requestAnimationFrame(animate);
    };

    // Start the animation loop
    animate();

    // Cleanup function to prevent memory leaks
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="min-h-screen w-full bg-neutral-950 relative flex justify-center items-center overflow-hidden font-sans select-none">
      
      {/* 
        We use w-0 h-0 and pointer-events-none instead of display: none (or Tailwind's "hidden")
        because some browsers (like Safari) will refuse to render SVG filters if the SVG is explicitly hidden.
      */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="decay-filter">
            <feMorphology operator="erode" radius={erosion} result="erode" />
            <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="2" result="noise" />
            <feDisplacementMap in="erode" in2="noise" scale={erosion * 4} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      
      {}
      <div className="relative py-12 px-4 flex justify-center items-center w-full">
        <h2 
          className="text-5xl md:text-7xl lg:text-9xl font-black text-lime-400 uppercase tracking-widest text-center"
          style={{ filter: "url(#decay-filter)" }}
        >
          {text}
        </h2>
      </div>
      
    </div>
  );
}