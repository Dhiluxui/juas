import React, { useState, useEffect } from 'react';

export interface KineticMotionFocusProps {
  /** @title Main Title */
  title?: string;
  /** @title Subtitle Text */
  subtext?: string;
  /** @title Loop Interval (ms) */
  loopInterval?: number;
  /** @title Text Color */
  textColor?: string;
}

const CinematicStyles = () => (
    <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap');
        
        .kinetic-text {
            font-family: 'Inter', sans-serif;
            letter-spacing: -0.06em;
            line-height: 1;
        }

        @keyframes focusIn {
            0% { 
                opacity: 0; 
                transform: translateY(30px) skewX(20deg); 
                filter: blur(12px); 
            }
            100% { 
                opacity: 1; 
                transform: translateY(0) skewX(0deg); 
                filter: blur(0px); 
            }
        }

        .animate-focus {
            animation: focusIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
    `}} />
);

export function KineticMotionFocus({
  title = "Kinetic Motion",
  subtext = "Design for the future of interaction",
  loopInterval = 3500,
  textColor = "#ffffff"
}: KineticMotionFocusProps) {
    const [key, setKey] = useState(0);

    useEffect(() => {
        if (!loopInterval || loopInterval <= 0) return;
        const interval = setInterval(() => {
            setKey(prev => prev + 1);
        }, loopInterval);
        return () => clearInterval(interval);
    }, [loopInterval]);

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center p-6 overflow-hidden">
            <CinematicStyles />
            
            <div className="text-center">
                <h1 className="kinetic-text text-6xl md:text-8xl mb-6" style={{ color: textColor }}>
                    {title.split('').map((char, i) => (
                        <span 
                            key={`${key}-${i}`} 
                            className="inline-block animate-focus"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            {char === ' ' ? '\u00A0' : char}
                        </span>
                    ))}
                </h1>

                <div className="relative">
                    <p className="text-zinc-500 text-lg md:text-xl font-medium tracking-wide">
                        {subtext.split('').map((char, i) => (
                            <span 
                                key={`${key}-sub-${i}`} 
                                className="inline-block animate-focus"
                                style={{ animationDelay: `${0.5 + (i * 0.02)}s` }}
                            >
                                {char === ' ' ? '\u00A0' : char}
                            </span>
                        ))}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default KineticMotionFocus;
