import React, { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(Observer);

interface VelocitySlicerProps {
  text?: string;
  duration?: number;
  ease?: string;
  splitType?: string;
}

export const VelocitySlicer: React.FC<VelocitySlicerProps> = ({
  text = "VELOCITY",
  duration = 1.5,
  ease = "power3.out",
  splitType = "chars",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // We use 9 slices for a highly detailed glitch effect
  const SLICES = 9;

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    let ctx = gsap.context(() => {
      const layers = gsap.utils.toArray('.slice-layer');
      
      // Physics tracker decouples raw input from rendering loop (Pure Science)
      const physics = { velocity: 0 };
      
      // The master animation loop running in requestAnimationFrame (via GSAP ticker)
      const render = () => {
        // Friction / Damping factor to spring back to 0
        physics.velocity *= 0.90;
        
        layers.forEach((layer: any, i) => {
          // Alternate direction based on even/odd slice
          const direction = i % 2 === 0 ? 1 : -1;
          
          // Outer slices move more than inner slices for a parallax tearing effect
          const distanceMultiplier = Math.abs((SLICES / 2) - i) * 0.2 + 0.5;
          
          gsap.set(layer, {
            x: physics.velocity * direction * distanceMultiplier,
            // Slight skewing based on velocity for extreme stress effect
            skewX: physics.velocity * direction * 0.05,
          });
        });
      };

      gsap.ticker.add(render);

      // High-performance hardware observer
      Observer.create({
        target: containerRef.current,
        type: "pointer,touch,wheel",
        onChange: (self) => {
          // Combine directional deltas for maximum sensitivity
          const delta = self.deltaY + self.deltaX;
          // Inject kinetic energy into the physics system, clamped to prevent absolute chaos
          physics.velocity += gsap.utils.clamp(-150, 150, delta * 2.5);
        }
      });

      // Cleanup ticker on unmount
      return () => {
        gsap.ticker.remove(render);
      };
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] flex items-center justify-center bg-zinc-950 overflow-hidden cursor-crosshair selection:bg-none group"
    >
      <div className="relative font-black uppercase text-7xl sm:text-8xl md:text-[10vw] lg:text-[120px] tracking-tighter leading-none text-white mix-blend-difference select-none">
        
        {/* Invisible footprint to maintain strict flexbox auto-layout bounds */}
        <span className="opacity-0">{text}</span>
        
        {/* Render isolated polygonal clip slices */}
        {Array.from({ length: SLICES }).map((_, i) => {
          const sliceHeight = 100 / SLICES;
          const top = i * sliceHeight;
          const bottom = (i + 1) * sliceHeight;
          
          return (
            <span 
              key={i}
              className="slice-layer absolute top-0 left-0 text-white will-change-transform drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-colors duration-500 group-hover:text-indigo-400"
              style={{
                clipPath: `polygon(0% ${top}%, 100% ${top}%, 100% ${bottom}%, 0% ${bottom}%)`
              }}
            >
              {text}
            </span>
          )
        })}
      </div>
      
      {/* Brutalist System HUD */}
      <div className="absolute bottom-6 left-6 text-[10px] text-zinc-500 tracking-[0.2em] uppercase font-bold flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
        Drag / Scroll to Fracture
      </div>
    </div>
  );
};
