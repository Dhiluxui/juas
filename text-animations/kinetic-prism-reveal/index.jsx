import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const NUM_COLS = 12;
const COL_WIDTH = 100 / NUM_COLS;

// The 4 faces of our 3D Prism columns, each with a striking editorial color theme
const THEMES = [
  { bg: '#09090b', text: '#ffffff', word: 'KINETIC' },       // 0deg: Zinc-950 / White
  { bg: '#ffffff', text: '#09090b', word: 'TYPOGRAPHY' },    // 90deg: White / Black
  { bg: '#ff3300', text: '#09090b', word: 'ARCHITECT' },     // 180deg: Neon Red / Black
  { bg: '#ccff00', text: '#09090b', word: 'EXPERIENCE' }     // 270deg: Neon Yellow / Black
];

/**
 * 3D Prism Column
 * Represents one vertical slice of the screen.
 * Contains 4 faces making up a massive 3D cuboid.
 */
const PrismColumn = ({ index }: { index: number }) => {
  return (
    <div 
      className="absolute top-0 h-full z-10"
      style={{ 
        width: `${COL_WIDTH}cqw`, 
        left: `${index * COL_WIDTH}cqw`, 
        perspective: '2500px' 
      }}
    >
      {/* Z-Offset Wrapper: Pushes the rotational axis deep into the screen so it rotates around the center */}
      <div 
        className="w-full h-full" 
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: 'translateZ(-50cqh)' 
        }}
      >
        {/* The target for GSAP rotation */}
        <div 
          className="prism-rotator w-full h-full will-change-transform" 
          style={{ transformStyle: 'preserve-3d' }}
        >
          {THEMES.map((theme, faceIdx) => (
            <div 
              key={faceIdx} 
              className="absolute inset-0 overflow-hidden border-r border-black/10"
              style={{
                backgroundColor: theme.bg,
                backfaceVisibility: 'hidden',
                // Position the 4 faces to form a full-height rectangular prism
                transform: `rotateX(${faceIdx * 90}deg) translateZ(50cqh)`,
              }}
            >
              {/* The Typography Container:
                We make this 100cqw wide and shift it left by this column's exact offset.
                This guarantees the text perfectly aligns across all disconnected 3D columns!
              */}
              <div 
                className="absolute top-0 flex items-center justify-center h-full w-[100cqw]"
                style={{ left: `-${index * COL_WIDTH}cqw` }}
              >
                <h2 
                  className="text-[13cqw] font-black uppercase tracking-tighter leading-none select-none"
                  style={{ color: theme.text }}
                >
                  {theme.word}
                </h2>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Main 3D Scroll Reveal Scene
 */
export const KineticPrismReveal = () => {
  const containerRef = useRef(null);
  const scrollerRef = useRef(null);

  useLayoutEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;

    let ctx = gsap.context(() => {
      const rotators = gsap.utils.toArray('.prism-rotator');
      
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          scroller: scrollerRef.current, // Bind to our internal scroll container
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.2, // Smooth interpolation for the scroll
        },
      });

      // 1st Transition: Black to White (Stagger from left to right)
      tl.to(rotators, { 
        rotationX: -90, 
        stagger: { amount: 0.6, from: "start" }, 
        ease: 'power2.inOut' 
      });
      tl.to({}, { duration: 0.2 }); // Hold frame

      // 2nd Transition: White to Red (Stagger from right to left)
      tl.to(rotators, { 
        rotationX: -180, 
        stagger: { amount: 0.6, from: "end" }, 
        ease: 'power2.inOut' 
      });
      tl.to({}, { duration: 0.2 }); // Hold frame

      // 3rd Transition: Red to Yellow (Stagger outward from the center)
      tl.to(rotators, { 
        rotationX: -270, 
        stagger: { amount: 0.6, from: "center" }, 
        ease: 'power2.inOut' 
      });
      tl.to({}, { duration: 0.2 }); // Hold frame

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={scrollerRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden bg-zinc-950"
      style={{ containerType: 'size' }} // Enable cqw and cqh relative to this container
    >
      <div 
        ref={containerRef} 
        className="relative w-full" 
        style={{ height: '400vh' }} // 400vh gives plenty of scroll room for 3 transitions
      >
        {/* Sticky container locks to screen while we scroll through the height */}
        <div className="sticky top-0 left-0 w-full h-[100cqh] overflow-hidden bg-zinc-950">
          
          {/* Render our 12 vertical columns */}
          {Array.from({ length: NUM_COLS }).map((_, i) => (
            <PrismColumn key={i} index={i} />
          ))}


        </div>
      </div>
    </div>
  );
};

export default KineticPrismReveal;