import React, { useState, useEffect, useRef } from 'react';

const CustomStyles = () => (
    <style dangerouslySetInnerHTML={{__html: `
        :root {
            --ease-apple: cubic-bezier(0.16, 1, 0.3, 1);
            --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
        }
        
        body {
            background-color: #09090b; /* zinc-950 */
            color: #fafafa;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
    `}} />
);

const CinematicRise = ({ text, isActive, delayOffset = 0 }) => {
    // Split text into words, then characters for granular staggering
    const words = text.split(' ');

    return (
        <div className="flex flex-wrap gap-x-[0.25em] gap-y-2">
            {words.map((word, wIdx) => (
                <div key={wIdx} className="flex overflow-hidden pb-2 -mb-2">
                    {word.split('').map((char, cIdx) => {
                        // Calculate a dynamic delay based on word and character position
                        const baseDelay = delayOffset + (wIdx * 100) + (cIdx * 30);
                        
                        return (
                            <span 
                                key={cIdx}
                                className={`
                                    inline-block transition-all duration-1000 origin-bottom
                                    ${isActive 
                                        ? 'opacity-100 translate-y-0 blur-none scale-100' 
                                        : 'opacity-0 translate-y-full blur-[8px] scale-110'
                                    }
                                `}
                                style={{ 
                                    transitionDelay: `${baseDelay}ms`,
                                    transitionTimingFunction: 'var(--ease-apple)'
                                }}
                            >
                                {char}
                            </span>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default function App() {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const sequence = () => {
            setIsActive(false); // Hide the text
            setTimeout(() => {
                setIsActive(true); // Trigger the reveal animation
            }, 800); // 0.8s pause before revealing again
        };

        // Start immediately on mount
        sequence();
        
        // Loop every 4 seconds to keep the motion active
        const interval = setInterval(sequence, 4000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-8 font-sans bg-zinc-950 text-zinc-50 overflow-hidden selection:bg-white/20">
            <CustomStyles />
            
            <div className="z-10 flex flex-col items-center justify-center w-full max-w-5xl">
                <div className="text-5xl md:text-7xl lg:text-[5.5rem] font-medium tracking-tight text-white leading-tight flex justify-center text-center">
                    <CinematicRise 
                        text="Motion Reveals Pro" 
                        isActive={isActive} 
                        delayOffset={0} 
                    />
                </div>
            </div>
        </div>
    );
}