'use client';

import React, { forwardRef } from 'react';

export const DOMOverlay = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  return (
    <div className="absolute top-0 left-0 w-full h-screen pointer-events-none flex items-center justify-center z-10" style={{ perspective: '1000px' }}>
      {/* 
        This div is invisible initially (opacity 0, transformed). 
        GSAP will animate it to match precisely over the fully opened 3D book page.
      */}
      <div 
        ref={ref} 
        className="opacity-0 translate-y-8 select-auto text-[#0f0f0f] p-12 max-w-lg will-change-transform shadow-2xl"
        style={{ 
            width: '450px', 
            height: '600px',
            background: 'transparent', // We rely on the 3D book mesh for the paper background
            pointerEvents: 'auto'
        }}
        {...props}
      >
        <h2 className="text-4xl font-serif mb-6 tracking-tight drop-shadow-sm text-black">
          Chapter 1<br/>
          <span className="text-2xl italic text-gray-800 mt-2 block">A Ghost in the Port</span>
        </h2>
        <div className="space-y-4 text-base leading-relaxed text-gray-900 font-sans font-medium">
          <p>
            The docks were silent, save for the rhythmic slosh of the dark tide against the pylons. 
            Every shipment had its secrets, but this crate felt different.
          </p>
          <p>
            There were no markings, no manifest, and a thick layer of frost clung to its wooden slats despite 
            the heavy summer humidity. The harbormaster had refused to go near it.
          </p>
          <button className="mt-8 px-6 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors duration-300 font-bold tracking-wider text-sm">
            READ MORE 
          </button>
        </div>
      </div>
    </div>
  );
});

DOMOverlay.displayName = 'DOMOverlay';
