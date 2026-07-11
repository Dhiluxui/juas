import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

export const AwardWinningStickerPeel = ({
  imageSrc = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=500&auto=format&fit=crop",
  width = 340,
}) => {
  const dragTargetRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragTargetRef.current) return;

    const draggie = Draggable.create(dragTargetRef.current, {
      type: "x,y",
      inertia: true,
      onDrag() {
        const rotX = gsap.utils.clamp(-45, 45, this.deltaY * 0.9);
        const rotY = gsap.utils.clamp(-45, 45, this.deltaX * 0.9);

        gsap.to(dragTargetRef.current, {
          rotationX: -rotX,
          rotationY: rotY,
          scale: 1.15,
          '--rgb-split': '8px',
          duration: 0.1
        });
      },
      onDragEnd() {
        gsap.to(dragTargetRef.current, {
          rotationX: 0,
          rotationY: 0,
          scale: 1,
          '--rgb-split': '0px',
          duration: 1.2,
          ease: "elastic.out(1, 0.3)"
        });
      }
    });

    return () => draggie[0].kill();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = x / rect.width;
    const normY = y / rect.height;

    const dx = rect.width - x;
    const dy = rect.height - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Magnetic peeling physics: The closer to the bottom-right, the deeper the peel.
    let peel = dist < 300 ? 300 - dist : 0;
    if (peel < 40) peel = 40; // Minimum curl on hover

    gsap.to(containerRef.current, {
      '--mouse-x': normX,
      '--mouse-y': normY,
      '--peel': `${peel}px`,
      rotationX: (normY - 0.5) * -20,
      rotationY: (normX - 0.5) * 20,
      duration: 0.3,
      ease: "power2.out"
    });
  };

  const handleMouseLeave = () => {
    gsap.to(containerRef.current, {
      '--peel': '0px',
      '--mouse-x': '0.5',
      '--mouse-y': '0.5',
      rotationX: 0,
      rotationY: 0,
      duration: 0.9,
      ease: "elastic.out(1, 0.4)"
    });
  };

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center overflow-hidden bg-[#050505] rounded-xl border border-white/10">

      {/* --- SVG FILTERS FOR GLUE & ORGANIC TEARING --- */}
      <svg className="hidden">
        <defs>
          {/* Jagged ripped edge for the foil flap */}
          <filter id="torn-edge">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* Sticky glue fibers effect */}
          <filter id="glue-fibers">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.8" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 4 -1.5" in="noise" result="alpha" />
            <feComposite in="SourceGraphic" in2="alpha" operator="in" />
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
        </defs>
      </svg>

      {/* --- INTERACTIVE 3D WRAPPER --- */}
      <div
        ref={dragTargetRef}
        className="relative cursor-grab active:cursor-grabbing z-10"
        style={{
          width,
          height: width,
          perspective: '1500px',
          transformStyle: 'preserve-3d',
          // Custom CSS variable for Chromatic Aberration during drag
          '--rgb-split': '0px',
          filter: 'drop-shadow(calc(var(--rgb-split) * -1) 0 0 rgba(255,0,0,0.5)) drop-shadow(calc(var(--rgb-split)) 0 0 rgba(0,255,255,0.5))'
        } as React.CSSProperties}
      >
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseMove}
          className="w-full h-full relative"
          style={{
            '--peel': '0px',
            '--mouse-x': '0.5',
            '--mouse-y': '0.5',
            transformStyle: 'preserve-3d',
            filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.6))'
          } as React.CSSProperties}
        >

          {/* --- BASE STICKER IMAGE --- */}
          <div
            className="absolute inset-0 bg-cover bg-center rounded-2xl"
            style={{
              backgroundImage: `url(${imageSrc})`,
              // Dynamically mask out the peeling corner
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - var(--peel)), calc(100% - var(--peel)) 100%, 0 100%)',
            }}
          >
            {/* Holographic Gloss Overlay tracking mouse */}
            <div
              className="absolute inset-0 mix-blend-color-dodge opacity-60 pointer-events-none rounded-2xl"
              style={{
                background: 'radial-gradient(circle at calc(var(--mouse-x) * 100%) calc(var(--mouse-y) * 100%), rgba(255,255,255,1) 0%, rgba(255,0,128,0.3) 20%, rgba(0,255,255,0) 60%)'
              }}
            />
            {/* Inner Border */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 inset-ring pointer-events-none" />
          </div>

          {/* --- STICKY GLUE FIBERS --- */}
          <div
            className="absolute pointer-events-none origin-center"
            style={{
              width: 'calc(var(--peel) * 1.414)', // Pythagorean theorem for diagonal
              height: '12px',
              backgroundColor: '#fff',
              bottom: 'calc(var(--peel) / 2)',
              right: 'calc(var(--peel) / 2)',
              transform: 'translate(50%, 50%) rotate(-45deg)',
              filter: 'url(#glue-fibers)',
              opacity: 'calc(var(--peel) / 100)' // Fade in as it peels
            }}
          />

          {/* --- THE PEELED FLAP (FOIL BACKING) --- */}
          <div
            className="absolute bottom-0 right-0 pointer-events-none"
            style={{
              width: 'var(--peel)',
              height: 'var(--peel)',
              // The shadow cast by the flap onto the sticker body
              filter: 'drop-shadow(-10px -10px 15px rgba(0,0,0,0.5))'
            }}
          >
            <div
              className="w-full h-full relative overflow-hidden"
              style={{
                clipPath: 'polygon(100% 0, 0 100%, 0 0)',
                filter: 'url(#torn-edge)', // Organic rippled tear effect
              }}
            >
              {/* Iridescent Holographic Foil Gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(
                    135deg, 
                    #ff007f 0%, 
                    #ff7f00 20%, 
                    #ffff00 40%, 
                    #00ff00 60%, 
                    #00ffff 80%, 
                    #0000ff 100%
                  )`,
                  backgroundSize: '200% 200%',
                  backgroundPosition: 'calc(var(--mouse-x) * 100%) calc(var(--mouse-y) * 100%)',
                }}
              />
              {/* Silver Metallic Sheen Overlay */}
              <div
                className="absolute inset-0 mix-blend-overlay"
                style={{
                  background: 'radial-gradient(circle at top left, #ffffff 0%, #888888 50%, #222222 100%)',
                  opacity: 0.8
                }}
              />
              {/* Noise Grain for physical foil texture */}
              <div className="absolute inset-0 opacity-50 mix-blend-color-burn" style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%221.5%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E")'
              }} />
            </div>
          </div>

        </div>
      </div>

      {/* Background hint */}
      <div className="absolute bottom-6 text-neutral-500 font-mono text-xs tracking-[0.2em] uppercase pointer-events-none">
        Magnetic Hover • Tear Physics • RGB Inertia
      </div>
    </div>
  );
};
