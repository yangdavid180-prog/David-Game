/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH, GameStatus } from '../../types';
import { audio } from '../System/Audio';

// Physics Constants
const GRAVITY = 60;
const JUMP_FORCE = 18; 

// --- CAR GEOMETRIES ---
const CAR_BODY_GEO = new THREE.BoxGeometry(0.8, 0.4, 1.8);
const COCKPIT_GEO = new THREE.BoxGeometry(0.6, 0.25, 0.8);
const WHEEL_GEO = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
const SPOILER_GEO = new THREE.BoxGeometry(0.9, 0.1, 0.3);
const SPOILER_MOUNT_GEO = new THREE.BoxGeometry(0.1, 0.3, 0.1);
const EXHAUST_GEO = new THREE.CylinderGeometry(0.1, 0.15, 0.4);
const SHADOW_GEO = new THREE.PlaneGeometry(1.2, 2.2);

export const Player: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const carRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  
  // Wheel references for rotation
  const wheelsRef = useRef<THREE.Group[]>([]);

  const { status, laneCount, takeDamage, hasDoubleJump, activateImmortality, isImmortalityActive, speed } = useStore();
  
  const [lane, setLane] = React.useState(0);
  const targetX = useRef(0);
  
  // Physics State 
  const isJumping = useRef(false);
  const velocityY = useRef(0);
  const jumpsPerformed = useRef(0); 
  const carRotationZ = useRef(0); // Banking

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const isInvincible = useRef(false);
  const lastDamageTime = useRef(0);

  // Memoized Materials
  const { bodyMat, darkMat, wheelMat, glowMat, glassMat, shadowMat } = useMemo(() => {
      const mainColor = isImmortalityActive ? '#ffd700' : '#ff0055'; // Red Car or Gold if Immortal
      const glowColor = isImmortalityActive ? '#ffffff' : '#00ffff';
      
      return {
          bodyMat: new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.2, metalness: 0.7 }),
          darkMat: new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.5, metalness: 0.8 }),
          wheelMat: new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.8 }),
          glowMat: new THREE.MeshBasicMaterial({ color: glowColor }),
          glassMat: new THREE.MeshPhysicalMaterial({ 
            color: '#00aaff', 
            roughness: 0, 
            metalness: 0.9, 
            transmission: 0.2,
            opacity: 0.8,
            transparent: true
          }),
          shadowMat: new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0.4, transparent: true })
      };
  }, [isImmortalityActive]); 

  // --- Reset State on Game Start ---
  useEffect(() => {
      if (status === GameStatus.PLAYING) {
          isJumping.current = false;
          jumpsPerformed.current = 0;
          velocityY.current = 0;
          if (groupRef.current) groupRef.current.position.y = 0;
          if (carRef.current) carRef.current.rotation.set(0,0,0);
      }
  }, [status]);
  
  useEffect(() => {
      const maxLane = Math.floor(laneCount / 2);
      if (Math.abs(lane) > maxLane) {
          setLane(l => Math.max(Math.min(l, maxLane), -maxLane));
      }
  }, [laneCount, lane]);

  // --- Controls ---
  const triggerJump = () => {
    const maxJumps = hasDoubleJump ? 2 : 1;

    if (!isJumping.current) {
        audio.playJump(false);
        isJumping.current = true;
        jumpsPerformed.current = 1;
        velocityY.current = JUMP_FORCE;
    } else if (jumpsPerformed.current < maxJumps) {
        audio.playJump(true);
        jumpsPerformed.current += 1;
        velocityY.current = JUMP_FORCE;
        // Do a barrel roll
        if(carRef.current) carRef.current.rotation.z = Math.PI * 2;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      const maxLane = Math.floor(laneCount / 2);

      if (e.key === 'ArrowLeft') setLane(l => Math.max(l - 1, -maxLane));
      else if (e.key === 'ArrowRight') setLane(l => Math.min(l + 1, maxLane));
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') triggerJump();
      else if (e.key === 'Enter') {
          activateImmortality();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (status !== GameStatus.PLAYING) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        const maxLane = Math.floor(laneCount / 2);

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
             if (deltaX > 0) setLane(l => Math.min(l + 1, maxLane));
             else setLane(l => Math.max(l - 1, -maxLane));
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -30) {
            triggerJump();
        } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            activateImmortality();
        }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  // --- Animation Loop ---
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (status !== GameStatus.PLAYING && status !== GameStatus.SHOP) return;

    // 1. Horizontal Position
    targetX.current = lane * LANE_WIDTH;
    groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x, 
        targetX.current, 
        delta * 12
    );

    // 2. Physics (Jump)
    if (isJumping.current) {
        groupRef.current.position.y += velocityY.current * delta;
        velocityY.current -= GRAVITY * delta;

        if (groupRef.current.position.y <= 0) {
            groupRef.current.position.y = 0;
            isJumping.current = false;
            jumpsPerformed.current = 0;
            velocityY.current = 0;
            if(carRef.current) carRef.current.rotation.z = 0;
            if(carRef.current) carRef.current.rotation.x = 0;
        }

        // Mid-air rotation
        if (carRef.current && jumpsPerformed.current === 2) {
             // Barrel roll decay
             carRef.current.rotation.z = THREE.MathUtils.lerp(carRef.current.rotation.z, 0, delta * 5);
        } else if (carRef.current) {
            // Nose up slightly when jumping
            carRef.current.rotation.x = -0.2;
        }
    } else {
        if(carRef.current) carRef.current.rotation.x = 0;
    }

    // 3. Banking logic (Steering)
    const xDiff = targetX.current - groupRef.current.position.x;
    const targetBank = -xDiff * 0.3; // Bank into turn
    carRotationZ.current = THREE.MathUtils.lerp(carRotationZ.current, targetBank, delta * 10);
    
    if (carRef.current && jumpsPerformed.current !== 2) {
        carRef.current.rotation.z = carRotationZ.current;
    }

    // 4. Wheel Spin
    const spinSpeed = speed * delta * 2;
    wheelsRef.current.forEach(w => {
        if (w) w.rotation.x += spinSpeed;
    });

    // 5. Engine Shake / Hover effect slightly
    if (carRef.current && !isJumping.current) {
        carRef.current.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 20) * 0.01;
    }

    // 6. Dynamic Shadow
    if (shadowRef.current) {
        const height = groupRef.current.position.y;
        const scale = Math.max(0.5, 1 - (height / 3) * 0.5);
        shadowRef.current.scale.set(scale, scale, 1);
        const mat = shadowRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0.1, 0.4 - (height / 3));
    }

    // Invincibility Flicker
    const showFlicker = isInvincible.current || isImmortalityActive;
    if (showFlicker) {
        if (isInvincible.current) {
             if (Date.now() - lastDamageTime.current > 1500) {
                isInvincible.current = false;
                groupRef.current.visible = true;
             } else {
                groupRef.current.visible = Math.floor(Date.now() / 50) % 2 === 0;
             }
        } 
        if (isImmortalityActive) {
            groupRef.current.visible = true; 
        }
    } else {
        groupRef.current.visible = true;
    }
  });

  // Damage Handler
  useEffect(() => {
     const checkHit = (e: any) => {
        if (isInvincible.current || isImmortalityActive) return;
        audio.playDamage();
        takeDamage();
        isInvincible.current = true;
        lastDamageTime.current = Date.now();
     };
     window.addEventListener('player-hit', checkHit);
     return () => window.removeEventListener('player-hit', checkHit);
  }, [takeDamage, isImmortalityActive]);

  // Helper to add wheels to ref array
  const addWheelRef = (el: THREE.Group) => {
      if (el && !wheelsRef.current.includes(el)) {
          wheelsRef.current.push(el);
      }
  };

  return (
    <group ref={groupRef}>
      <group ref={carRef} position={[0, 0.3, 0]}>
         
         {/* Main Chassis */}
         <mesh castShadow geometry={CAR_BODY_GEO} material={bodyMat} position={[0, 0.2, 0]} />
         
         {/* Cockpit */}
         <mesh geometry={COCKPIT_GEO} material={glassMat} position={[0, 0.45, -0.2]} />
         
         {/* Spoiler */}
         <mesh geometry={SPOILER_GEO} material={darkMat} position={[0, 0.6, 0.8]} />
         <mesh geometry={SPOILER_MOUNT_GEO} material={darkMat} position={[-0.3, 0.4, 0.8]} />
         <mesh geometry={SPOILER_MOUNT_GEO} material={darkMat} position={[0.3, 0.4, 0.8]} />

         {/* Rear Engine Glow */}
         <mesh geometry={EXHAUST_GEO} material={glowMat} rotation={[Math.PI/2, 0, 0]} position={[0.2, 0.2, 0.95]} />
         <mesh geometry={EXHAUST_GEO} material={glowMat} rotation={[Math.PI/2, 0, 0]} position={[-0.2, 0.2, 0.95]} />

         {/* Wheels */}
         <group position={[0.45, 0, 0.5]} ref={addWheelRef} rotation={[0, 0, Math.PI/2]}>
             <mesh geometry={WHEEL_GEO} material={wheelMat} />
             <mesh geometry={new THREE.CylinderGeometry(0.15, 0.15, 0.21, 6)} material={glowMat} />
         </group>
         <group position={[-0.45, 0, 0.5]} ref={addWheelRef} rotation={[0, 0, Math.PI/2]}>
             <mesh geometry={WHEEL_GEO} material={wheelMat} />
             <mesh geometry={new THREE.CylinderGeometry(0.15, 0.15, 0.21, 6)} material={glowMat} />
         </group>
         <group position={[0.45, 0, -0.6]} ref={addWheelRef} rotation={[0, 0, Math.PI/2]}>
             <mesh geometry={WHEEL_GEO} material={wheelMat} />
             <mesh geometry={new THREE.CylinderGeometry(0.15, 0.15, 0.21, 6)} material={glowMat} />
         </group>
         <group position={[-0.45, 0, -0.6]} ref={addWheelRef} rotation={[0, 0, Math.PI/2]}>
             <mesh geometry={WHEEL_GEO} material={wheelMat} />
             <mesh geometry={new THREE.CylinderGeometry(0.15, 0.15, 0.21, 6)} material={glowMat} />
         </group>
      </group>
      
      {/* Shadow */}
      <mesh ref={shadowRef} rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]} geometry={SHADOW_GEO} material={shadowMat} />
    </group>
  );
};