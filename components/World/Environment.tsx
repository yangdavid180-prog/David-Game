/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH } from '../../types';

const WarpTunnel: React.FC = () => {
    const speed = useStore(state => state.speed);
    const count = 40;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Initial positions for rings
    const zPositions = useRef(new Float32Array(count));

    useMemo(() => {
        for(let i=0; i<count; i++) {
            zPositions.current[i] = -i * 10;
        }
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const activeSpeed = speed > 0 ? speed : 10;
        
        for(let i=0; i<count; i++) {
            zPositions.current[i] += activeSpeed * delta;
            
            // Loop back
            if(zPositions.current[i] > 10) {
                zPositions.current[i] -= 400;
            }

            dummy.position.set(0, 0, zPositions.current[i]);
            dummy.rotation.z += delta * 0.2; // Slowly rotate rings
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <torusGeometry args={[20, 0.2, 8, 32]} />
            <meshBasicMaterial color="#4400ff" transparent opacity={0.6} wireframe />
        </instancedMesh>
    );
};

const StarStream: React.FC = () => {
    const speed = useStore(state => state.speed);
    const count = 1000; 
    const meshRef = useRef<THREE.Points>(null);
    
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            // Tunnel shape distribution
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 20; 
            pos[i*3] = Math.cos(angle) * radius;
            pos[i*3+1] = Math.sin(angle) * radius;
            pos[i*3+2] = -Math.random() * 400;
        }
        return pos;
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const pos = meshRef.current.geometry.attributes.position.array as Float32Array;
        const activeSpeed = (speed > 0 ? speed : 20) * 1.5;

        for(let i=0; i<count; i++) {
            pos[i*3+2] += activeSpeed * delta;
            if(pos[i*3+2] > 20) {
                pos[i*3+2] = -400;
            }
        }
        meshRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.3} color="#00ffff" transparent opacity={0.8} />
        </points>
    );
};

const LaneGuides: React.FC = () => {
    const { laneCount } = useStore();
    
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        for (let i = 0; i <= laneCount; i++) {
            lines.push(startX + (i * LANE_WIDTH));
        }
        return lines;
    }, [laneCount]);

    return (
        <group position={[0, 0.02, 0]}>
            {/* Dark Road */}
            <mesh position={[0, -0.05, -50]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[laneCount * LANE_WIDTH, 400]} />
                <meshBasicMaterial color="#000" transparent opacity={0.8} />
            </mesh>
            
            {/* Neon Lines */}
            {separators.map((x, i) => (
                <mesh key={`sep-${i}`} position={[x, 0, -50]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.05, 400]} /> 
                    <meshBasicMaterial color="#ff00cc" transparent opacity={0.6} />
                </mesh>
            ))}
        </group>
    );
};

const EndOfTimeSun: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if(meshRef.current) {
            meshRef.current.rotation.z += 0.005;
            const s = 1 + Math.sin(state.clock.elapsedTime) * 0.05;
            meshRef.current.scale.set(s,s,s);
        }
    });

    return (
        <mesh ref={meshRef} position={[0, 10, -250]}>
            <ringGeometry args={[40, 42, 64]} />
            <meshBasicMaterial color="#fff" side={THREE.DoubleSide} />
            <pointLight distance={100} decay={2} color="#fff" intensity={1} />
        </mesh>
    );
}

export const Environment: React.FC = () => {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 30, 120]} />
      
      <ambientLight intensity={0.5} color="#400080" />
      <directionalLight position={[0, 20, -10]} intensity={1.5} color="#00ffff" />
      
      <WarpTunnel />
      <StarStream />
      <LaneGuides />
      <EndOfTimeSun />
    </>
  );
};