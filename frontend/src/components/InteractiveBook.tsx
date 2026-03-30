'use client';

import React, { forwardRef, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BookPageMaterial } from './shaders/BookMaterial';

export const InteractiveBook = forwardRef<THREE.Group, React.ComponentProps<'group'>>((props, ref) => {
  // Memoize geometries and materials for performance (no instantiation in render loop)
  const { coverGeometry, pageGeometry, coverMaterials } = useMemo(() => {
    // Standard box for the closed book cover/body (width: 3, height: 4)
    const coverGeo = new THREE.BoxGeometry(3, 4, 0.4);
    // Page geometry matching the cover size.
    // 64 segments on the X-axis for a high-quality curve during bending
    const pageGeo = new THREE.PlaneGeometry(3, 4, 64, 1);
    
    // Premium dark matte material for the book cover edges
    const darkCoverMat = new THREE.MeshStandardMaterial({
      color: '#0f0f11',
      roughness: 0.9,
      metalness: 0.2,
    });
    
    // Warm white paper for the page edges and inside face
    const pageEdgeMat = new THREE.MeshStandardMaterial({
      color: '#f0ebe1',
      roughness: 0.8,
    });

    const materials = [
      pageEdgeMat,  // Right (pages)
      darkCoverMat, // Left (spine)
      pageEdgeMat,  // Top (pages)
      pageEdgeMat,  // Bottom (pages)
      pageEdgeMat,  // Front (revealed first page)
      darkCoverMat  // Back (back cover)
    ];

    return { coverGeometry: coverGeo, pageGeometry: pageGeo, coverMaterials: materials };
  }, []);

  // Clone specific material instance so GSAP can uniquely animate its uniforms
  const pageMaterial = useMemo(() => BookPageMaterial.clone(), []);
  const pivotRef = useRef<THREE.Group>(null);

  useFrame(() => {
    // Poll the GSAP-animated uBend property from the group ref's userData
    if (ref && typeof ref !== 'function' && 'current' in ref && ref.current) {
      const uBend = ref.current.userData.uBend || 0.0;
      pageMaterial.uniforms.uBend.value = uBend;

      if (pivotRef.current) {
        // Rotate from 0 to -160 degrees on the Y-axis to open toward the camera
        pivotRef.current.rotation.y = uBend * (-160 * Math.PI / 180);
      }
    }
  });

  return (
    <group ref={ref} {...props}>
      {/* The main book body (back cover & pages stack) */}
      <mesh geometry={coverGeometry} material={coverMaterials} castShadow receiveShadow />
      
      {/* The interactive bending front cover/page */}
      {/* Pivot group placed precisely at the left edge (spine) of the book body */}
      <group position={[-1.5, 0, 0.21]} ref={pivotRef}>
        {/* We place the mesh with x=1.5 so its left edge (x=-1.5) sits exactly at the pivot */}
        <mesh 
          geometry={pageGeometry} 
          material={pageMaterial} 
          position={[1.5, 0, 0]} 
          castShadow
        />
      </group>
    </group>
  );
});

InteractiveBook.displayName = 'InteractiveBook';
