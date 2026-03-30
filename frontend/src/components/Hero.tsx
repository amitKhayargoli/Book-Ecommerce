'use client';

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { DepthOfField, EffectComposer } from '@react-three/postprocessing';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

import { InteractiveBook } from './InteractiveBook';
import { BookCluster } from './BookCluster';
import { DOMOverlay } from './DOMOverlay';

gsap.registerPlugin(ScrollTrigger);

// Fallback for prefers-reduced-motion (Accessibility Constraint)
const FallbackHero = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#111] text-[#fdf8ef] p-8">
    <div className="max-w-xl">
      <h1 className="text-6xl font-serif mb-6 text-white drop-shadow-lg">Chapter 1: A Ghost in the Port</h1>
      <p className="text-xl text-gray-400 leading-relaxed font-sans">
        The docks were silent, save for the rhythmic slosh of the dark tide against the pylons.
        Every shipment had its secrets, but this crate felt different.
      </p>
    </div>
  </div>
);

export default function HeroScene() {
    const prefersReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    
    const containerRef = useRef<HTMLDivElement>(null);
    const centerBookRef = useRef<THREE.Group>(null);
    const leftBookRef = useRef<THREE.Mesh>(null);
    const rightBookRef = useRef<THREE.Mesh>(null);
    const domOverlayRef = useRef<HTMLDivElement>(null);

    // GSAP ScrollTrigger timeline moved to SceneContent so refs are perfectly synchronized


    if (prefersReducedMotion) {
        return <FallbackHero />;
    }

    // High performance pixel ratio constraint (max 2) to prevent mobile overheating
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;

    return (
        // The container height determines the total scroll duration (e.g., 300vh = 3 screens of scrolling)
        <div ref={containerRef} className="relative w-full bg-[#050505]" style={{ height: '300vh' }}>
            {/* The wrapper that gets pinned via GSAP ScrollTrigger */}
            <div className="sticky-wrapper sticky top-0 w-full h-screen overflow-hidden">
                <Canvas 
                    dpr={dpr}
                    camera={{ position: [0, 0, 8], fov: 45 }}
                    gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
                >
                    <color attach="background" args={['#050505']} />
                    <SceneContent 
                        containerRef={containerRef}
                        domOverlayRef={domOverlayRef}
                        leftRef={leftBookRef} 
                        rightRef={rightBookRef} 
                        centerRef={centerBookRef} 
                        prefersReducedMotion={prefersReducedMotion}
                    />
                </Canvas>
                <DOMOverlay ref={domOverlayRef} />
            </div>
        </div>
    );
}

// Scene Content separated so we can use R3F hooks like useFrame
interface SceneContentProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  domOverlayRef: React.RefObject<HTMLDivElement | null>;
  leftRef: React.RefObject<THREE.Mesh | null>;
  rightRef: React.RefObject<THREE.Mesh | null>;
  centerRef: React.RefObject<THREE.Group | null>;
  prefersReducedMotion: boolean;
}

function SceneContent({ containerRef, domOverlayRef, leftRef, rightRef, centerRef, prefersReducedMotion }: SceneContentProps) {
    // GSAP ScrollTrigger logic resides here to guarantee R3F meshes are fully mounted before timeline creation
    useEffect(() => {
        if (prefersReducedMotion) return;
        if (!containerRef.current || !centerRef.current || !leftRef.current || !rightRef.current) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 1, // 1 second smoothing for 60fps scrub
                    // Unnecessary to pin via GSAP since the container is `sticky top-0`
                }
            });

            centerRef.current!.userData.uBend = 0.0;

            // Phase 1: Parallax
            tl.to(leftRef.current!.position, { x: -8, z: -15, duration: 0.3 }, 0);
            tl.to(rightRef.current!.position, { x: 8, z: -15, duration: 0.3 }, 0);
            tl.fromTo(centerRef.current!.position, 
              { z: -5, y: -1 }, 
              { z: 0, y: 0, duration: 0.3 }, 
              0
            );

            // Phase 2: Rotation
            tl.to(centerRef.current!.rotation, {
                y: Math.PI / 2, 
                x: -Math.PI / 12, 
                z: 0,
                duration: 0.4,
                ease: "power2.inOut"
            }, 0.3);

            // Phase 3: Bending the custom shader page cover
            tl.to(centerRef.current!.userData, {
                uBend: 1.0, 
                duration: 0.3,
                ease: "power2.inOut"
            }, 0.7);

            if (domOverlayRef.current) {
                tl.to(domOverlayRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.2,
                    ease: "power1.out"
                }, 0.85);
            }

        }, containerRef);

        return () => ctx.revert();
    }, [prefersReducedMotion, containerRef, domOverlayRef, leftRef, rightRef, centerRef]);
    // Dynamic point light attached to mouse
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        // Smoothly interpolate light position towards mouse with damping for an organic feel
        if (lightRef.current) {
            // state.pointer is normalized -1 to 1. Scale up for world coordinates
            const targetX = state.pointer.x * 10;
            const targetY = state.pointer.y * 8;
            
            // Lerp for smooth trailing effect (specular highlight follows mouse lazily)
            lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, targetX, 0.05);
            lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, targetY, 0.05);
        }
    });

    return (
        <>
            <ambientLight intensity={0.15} color="#ffffff" />
            
            {/* The dynamic mouse light for specular highlights on the books */}
            <pointLight 
                ref={lightRef} 
                position={[0, 0, 5]} 
                intensity={60} 
                distance={25} 
                decay={2} 
                color="#fdfdfd" 
            />
            
            {/* Base directional light for standard shadows */}
            <directionalLight position={[5, 10, 5]} intensity={0.6} color="#fff" castShadow />

            {/* Background "BOOK" 3D Text fallback (using large matte plane geometries) */}
            {/* Placed far back on the Z-axis (Z: -20) */}
            <group position={[0, -2, -20]}>
                 <mesh>
                    <boxGeometry args={[40, 15, 2]} />
                    <meshStandardMaterial color="#020202" roughness={0.9} />
                 </mesh>
            </group>

            <BookCluster leftRef={leftRef} rightRef={rightRef} />
            <InteractiveBook ref={centerRef} />

            {/* Post-processing: Depth of Field blurring the far-away items */}
            <EffectComposer>
                <DepthOfField focusDistance={0.5} focalLength={0.05} bokehScale={8} height={480} />
            </EffectComposer>
            
            {/* Environmental reflections for premium metalness/roughness interaction */}
            <Environment preset="city" environmentIntensity={0.2} />
        </>
    );
}
