'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface BookClusterProps {
  leftRef: React.RefObject<THREE.Mesh | null>;
  rightRef: React.RefObject<THREE.Mesh | null>;
}

export function BookCluster({ leftRef, rightRef }: BookClusterProps) {
  // Use useMemo for geometries to prevent recreating them inside render cycles
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BoxGeometry(3, 4, 0.4);
    const mat = new THREE.MeshStandardMaterial({
      color: '#1a1a1c',
      roughness: 0.8,
      metalness: 0.1,
    });
    return { geometry: geo, material: mat };
  }, []);

  return (
    <>
      <mesh 
        ref={leftRef as React.RefObject<THREE.Mesh>} 
        geometry={geometry} 
        material={material} 
        position={[-5, -1, -8]} 
        rotation={[0.2, 0.6, -0.1]} 
        receiveShadow
        castShadow
      />
      <mesh 
        ref={rightRef as React.RefObject<THREE.Mesh>} 
        geometry={geometry} 
        material={material} 
        position={[5, 1, -10]} 
        rotation={[-0.1, -0.5, 0.2]} 
        receiveShadow
        castShadow
      />
    </>
  );
}
