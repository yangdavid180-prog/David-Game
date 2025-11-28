/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center, Float } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store';
import { GameObject, ObjectType, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus, GEMINI_COLORS } from '../../types';
import { audio } from '../System/Audio';

// --- GEOMETRIES ---

// Gem
const GEM_GEOMETRY = new THREE.OctahedronGeometry(0.3, 0);

// Flower (Man-eating Plant)
const STEM_GEO = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
const FLOWER_HEAD_GEO = new THREE.DodecahedronGeometry(0.5);
const LEAF_GEO = new THREE.PlaneGeometry(0.4, 0.4);

// Monster (Yokai - Ghostly Spirit)
const MONSTER_BODY_GEO = new THREE.SphereGeometry(0.5, 8, 8);
const MONSTER_SPIKE_GEO = new THREE.ConeGeometry(0.1, 0.4, 4);

// Missile/Projectile
const MISSILE_GEO = new THREE.CapsuleGeometry(0.1, 0.6, 4, 8);

// Shop
const SHOP_FRAME_GEO = new THREE.BoxGeometry(1, 7, 1);
const SHOP_BACK_GEO = new THREE.BoxGeometry(1, 5, 1.2); 
const SHOP_OUTLINE_GEO = new THREE.BoxGeometry(1, 7.2, 0.8);
const SHOP_FLOOR_GEO = new THREE.PlaneGeometry(1, 4); 

// Shadows
const SHADOW_SMALL = new THREE.CircleGeometry(0.4, 16);
const SHADOW_LARGE = new THREE.CircleGeometry(0.8, 16);

const PARTICLE_COUNT = 600;
const BASE_LETTER_INTERVAL = 150; 

const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

// --- Particle System ---
const ParticleSystem: React.FC = () => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => new Array(PARTICLE_COUNT).fill(0).map(() => ({
        life: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        color: new THREE.Color()
    })), []);

    useEffect(() => {
        const handleExplosion = (e: CustomEvent) => {
            const { position, color } = e.detail;
            let spawned = 0;
            const burstAmount = 40; 

            for(let i = 0; i < PARTICLE_COUNT; i++) {
                const p = particles[i];
                if (p.life <= 0) {
                    p.life = 1.0 + Math.random() * 0.5; 
                    p.pos.set(position[0], position[1], position[2]);
                    
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const speed = 2 + Math.random() * 10;
                    
                    p.vel.set(
                        Math.sin(phi) * Math.cos(theta),
                        Math.sin(phi) * Math.sin(theta),
                        Math.cos(phi)
                    ).multiplyScalar(speed);
                    
                    p.color.set(color);
                    
                    spawned++;
                    if (spawned >= burstAmount) break;
                }
            }
        };
        
        window.addEventListener('particle-burst', handleExplosion as any);
        return () => window.removeEventListener('particle-burst', handleExplosion as any);
    }, [particles]);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const safeDelta = Math.min(delta, 0.1);

        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= safeDelta * 1.5;
                p.pos.addScaledVector(p.vel, safeDelta);
                p.vel.y -= safeDelta * 5; 
                
                dummy.position.copy(p.pos);
                const scale = Math.max(0, p.life * 0.25);
                dummy.scale.set(scale, scale, scale);
                dummy.updateMatrix();
                
                mesh.current!.setMatrixAt(i, dummy.matrix);
                mesh.current!.setColorAt(i, p.color);
            } else {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        
        mesh.current.instanceMatrix.needsUpdate = true;
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
        </instancedMesh>
    );
};

const getRandomLane = (laneCount: number) => {
    const max = Math.floor(laneCount / 2);
    return Math.floor(Math.random() * (max * 2 + 1)) - max;
};

export const LevelManager: React.FC = () => {
  const { 
    status, 
    speed, 
    collectGem, 
    collectLetter, 
    collectedLetters,
    laneCount,
    setDistance,
    openShop,
    level,
    decrementTimer
  } = useStore();
  
  const objectsRef = useRef<GameObject[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);

  // Handle resets and transitions
  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp = level !== prevLevel.current && status === GameStatus.PLAYING;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || isVictoryReset) {
        objectsRef.current = [];
        setRenderTrigger(t => t + 1);
        distanceTraveled.current = 0;
        nextLetterDistance.current = BASE_LETTER_INTERVAL;

    } else if (isLevelUp && level > 1) {
        // Clear deep objects
        objectsRef.current = objectsRef.current.filter(obj => obj.position[2] > -80);
        
        objectsRef.current.push({
            id: uuidv4(),
            type: ObjectType.SHOP_PORTAL,
            position: [0, 0, -100], 
            active: true,
        });
        
        nextLetterDistance.current = distanceTraveled.current - SPAWN_DISTANCE + BASE_LETTER_INTERVAL;
        setRenderTrigger(t => t + 1);
    }
    
    prevStatus.current = status;
    prevLevel.current = level;
  }, [status, level, setDistance]);

  useFrame((state) => {
      if (!playerObjRef.current) {
          const group = state.scene.getObjectByName('PlayerGroup');
          if (group && group.children.length > 0) {
              playerObjRef.current = group.children[0];
          }
      }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05); 
    
    // Decrement Timer
    decrementTimer(safeDelta);

    const dist = speed * safeDelta;
    distanceTraveled.current += dist;

    let hasChanges = false;
    let playerPos = new THREE.Vector3(0, 0, 0);
    
    if (playerObjRef.current) {
        playerObjRef.current.getWorldPosition(playerPos);
    }

    // 1. Move & Update
    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];
    const newSpawns: GameObject[] = [];

    for (const obj of currentObjects) {
        let moveAmount = dist;
        
        // Missiles move extra fast
        if (obj.type === ObjectType.MISSILE) {
            moveAmount += 30 * safeDelta;
        }

        const prevZ = obj.position[2];
        obj.position[2] += moveAmount;
        
        // Monster AI (Spawns missile if player is close)
        if (obj.type === ObjectType.MONSTER && obj.active && !obj.hasFired) {
             if (obj.position[2] > -80) {
                 obj.hasFired = true;
                 newSpawns.push({
                     id: uuidv4(),
                     type: ObjectType.MISSILE,
                     position: [obj.position[0], 1.5, obj.position[2] + 2], 
                     active: true,
                     color: '#ff00ff'
                 });
                 hasChanges = true;
                 window.dispatchEvent(new CustomEvent('particle-burst', { 
                    detail: { position: obj.position, color: '#aa00ff' } 
                 }));
             }
        }

        let keep = true;
        if (obj.active) {
            const zThreshold = 2.0; 
            const inZZone = (prevZ < playerPos.z + zThreshold) && (obj.position[2] > playerPos.z - zThreshold);
            
            if (obj.type === ObjectType.SHOP_PORTAL) {
                const dz = Math.abs(obj.position[2] - playerPos.z);
                if (dz < 2) { 
                     openShop();
                     obj.active = false;
                     hasChanges = true;
                     keep = false; 
                }
            } else if (inZZone) {
                const dx = Math.abs(obj.position[0] - playerPos.x);
                if (dx < 0.9) { 
                     
                     const isDamageSource = [ObjectType.FLOWER, ObjectType.MONSTER, ObjectType.MISSILE].includes(obj.type);
                     
                     if (isDamageSource) {
                         // Collision Box Logic
                         const playerBottom = playerPos.y;
                         const playerTop = playerPos.y + 1.2; 

                         let objBottom = 0;
                         let objTop = 1.5;

                         if (obj.type === ObjectType.MISSILE) {
                             objBottom = 0.5;
                             objTop = 2.0;
                         }

                         const isHit = (playerBottom < objTop) && (playerTop > objBottom);

                         if (isHit) { 
                             window.dispatchEvent(new Event('player-hit'));
                             obj.active = false; 
                             hasChanges = true;
                             
                             if (obj.type === ObjectType.MISSILE) {
                                window.dispatchEvent(new CustomEvent('particle-burst', { 
                                    detail: { position: obj.position, color: '#ff4400' } 
                                }));
                             }
                         }
                     } else {
                         // Collection
                         const dy = Math.abs(obj.position[1] - playerPos.y);
                         if (dy < 2.5) { 
                            if (obj.type === ObjectType.GEM) {
                                collectGem(obj.points || 50);
                                audio.playGemCollect();
                            }
                            if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) {
                                collectLetter(obj.targetIndex);
                                audio.playLetterCollect();
                            }
                            
                            window.dispatchEvent(new CustomEvent('particle-burst', { 
                                detail: { 
                                    position: obj.position, 
                                    color: obj.color || '#ffffff' 
                                } 
                            }));

                            obj.active = false;
                            hasChanges = true;
                         }
                     }
                }
            }
        }

        if (obj.position[2] > REMOVE_DISTANCE) {
            keep = false;
            hasChanges = true;
        }

        if (keep) {
            keptObjects.push(obj);
        }
    }

    if (newSpawns.length > 0) {
        keptObjects.push(...newSpawns);
    }

    // 2. Spawning Logic
    let furthestZ = -20;
    const staticObjects = keptObjects.filter(o => o.type !== ObjectType.MISSILE);
    
    if (staticObjects.length > 0) {
        furthestZ = Math.min(...staticObjects.map(o => o.position[2]));
    }

    if (furthestZ > -SPAWN_DISTANCE) {
         // Spawning Gap dependent on speed
         const minGap = 12 + (speed * 0.3); 
         const spawnZ = Math.min(furthestZ - minGap, -SPAWN_DISTANCE);
         
         const isLetterDue = distanceTraveled.current >= nextLetterDistance.current;

         if (isLetterDue) {
             // Spawn Letter
             const lane = getRandomLane(laneCount);
             const target = ['G','E','M','I','N','I'];
             const availableIndices = target.map((_, i) => i).filter(i => !collectedLetters.includes(i));

             if (availableIndices.length > 0) {
                 const chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                 const val = target[chosenIndex];
                 const color = GEMINI_COLORS[chosenIndex];

                 keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.LETTER,
                    position: [lane * LANE_WIDTH, 1.0, spawnZ], 
                    active: true,
                    color: color,
                    value: val,
                    targetIndex: chosenIndex
                 });
                 nextLetterDistance.current += BASE_LETTER_INTERVAL;
                 hasChanges = true;
             } else {
                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.GEM,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    color: '#00ffff',
                    points: 50
                });
                hasChanges = true;
             }

         } else if (Math.random() > 0.1) {
            // General Spawn (Enemy or Gem)
            
            // 70% chance of Enemy, 30% Gem
            const isEnemy = Math.random() > 0.3;

            if (isEnemy) {
                // Decide between Flower or Monster (Yokai)
                // Monsters appear more in later levels or high difficulty
                const allowMonster = level > 1 || speed > 30;
                const isMonster = allowMonster && Math.random() < 0.4;

                const availableLanes = [];
                const maxLane = Math.floor(laneCount / 2);
                for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
                availableLanes.sort(() => Math.random() - 0.5);

                const count = Math.random() > 0.7 ? 2 : 1;
                
                for(let k=0; k<Math.min(count, availableLanes.length); k++) {
                    const lane = availableLanes[k];
                    
                    if (isMonster) {
                        keptObjects.push({
                            id: uuidv4(),
                            type: ObjectType.MONSTER,
                            position: [lane * LANE_WIDTH, 2.0, spawnZ], // Float high
                            active: true,
                            color: '#aa00ff',
                            hasFired: false
                        });
                    } else {
                        // Man-eating Flower
                        keptObjects.push({
                            id: uuidv4(),
                            type: ObjectType.FLOWER,
                            position: [lane * LANE_WIDTH, 0, spawnZ],
                            active: true,
                            color: '#ff0000'
                        });
                    }
                }

            } else {
                // Ground Gem
                const lane = getRandomLane(laneCount);
                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.GEM,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    color: '#00ffff',
                    points: 50
                });
            }
            hasChanges = true;
         }
    }

    if (hasChanges) {
        objectsRef.current = keptObjects;
        setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map(obj => {
        if (!obj.active) return null;
        return <GameEntity key={obj.id} data={obj} />;
      })}
    </group>
  );
};

const GameEntity: React.FC<{ data: GameObject }> = React.memo(({ data }) => {
    const groupRef = useRef<THREE.Group>(null);
    const visualRef = useRef<THREE.Group>(null);
    const { laneCount } = useStore();
    
    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.position.set(data.position[0], 0, data.position[2]);
        }

        if (visualRef.current) {
            const baseHeight = data.position[1];
            
            if (data.type === ObjectType.FLOWER) {
                // Biting animation
                const bite = Math.sin(state.clock.elapsedTime * 10);
                visualRef.current.scale.set(1 + bite * 0.1, 1 - bite * 0.1, 1 + bite * 0.1);
            } else if (data.type === ObjectType.MONSTER) {
                // Hover and wobble
                visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 3) * 0.3;
                visualRef.current.rotation.y += delta;
            } else if (data.type === ObjectType.MISSILE) {
                visualRef.current.position.y = baseHeight;
                visualRef.current.rotation.z += delta * 15;
            } else if (data.type === ObjectType.SHOP_PORTAL) {
                 visualRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.02);
            } else {
                // Gems/Letters
                visualRef.current.rotation.y += delta * 3;
                visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 4 + data.position[0]) * 0.1;
            }
        }
    });

    const shadowGeo = useMemo(() => {
        if (data.type === ObjectType.FLOWER) return SHADOW_LARGE;
        if (data.type === ObjectType.MONSTER) return SHADOW_LARGE;
        if (data.type === ObjectType.MISSILE) return SHADOW_SMALL;
        if (data.type === ObjectType.GEM) return SHADOW_SMALL;
        if (data.type === ObjectType.LETTER) return SHADOW_LARGE;
        return null;
    }, [data.type]);

    return (
        <group ref={groupRef} position={[data.position[0], 0, data.position[2]]}>
            {shadowGeo && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} geometry={shadowGeo}>
                    <meshBasicMaterial color="#000000" opacity={0.3} transparent />
                </mesh>
            )}

            <group ref={visualRef} position={[0, data.position[1], 0]}>
                
                {/* --- SHOP --- */}
                {data.type === ObjectType.SHOP_PORTAL && (
                    <group>
                         <mesh position={[0, 3, 0]} geometry={SHOP_FRAME_GEO} scale={[laneCount * LANE_WIDTH + 2, 1, 1]}>
                             <meshStandardMaterial color="#222" metalness={0.8} />
                         </mesh>
                         <mesh position={[0, 2, 0]} geometry={SHOP_BACK_GEO} scale={[laneCount * LANE_WIDTH, 1, 1]}>
                              <meshBasicMaterial color="#000" />
                         </mesh>
                         <mesh position={[0, 3, 0]} geometry={SHOP_OUTLINE_GEO} scale={[laneCount * LANE_WIDTH + 2.2, 1, 1]}>
                             <meshBasicMaterial color="#0ff" wireframe opacity={0.3} transparent />
                         </mesh>
                         <Center position={[0, 5, 0.6]}>
                             <Text3D font={FONT_URL} size={1.2} height={0.2}>
                                 PIT STOP
                                 <meshBasicMaterial color="#ff0" />
                             </Text3D>
                         </Center>
                    </group>
                )}

                {/* --- MAN-EATING FLOWER --- */}
                {data.type === ObjectType.FLOWER && (
                    <group position={[0, 0.6, 0]}>
                        <mesh geometry={STEM_GEO}>
                             <meshStandardMaterial color="#00aa00" roughness={0.5} />
                        </mesh>
                        <mesh position={[0, 0.6, 0]} geometry={FLOWER_HEAD_GEO}>
                             <meshStandardMaterial color="#ff0000" roughness={0.2} emissive="#550000" />
                        </mesh>
                        {/* Leaves */}
                        <mesh position={[0.2, 0, 0]} rotation={[-Math.PI/4, 0, -Math.PI/4]} geometry={LEAF_GEO}>
                             <meshStandardMaterial color="#00aa00" side={THREE.DoubleSide} />
                        </mesh>
                        <mesh position={[-0.2, 0, 0]} rotation={[-Math.PI/4, 0, Math.PI/4]} geometry={LEAF_GEO}>
                             <meshStandardMaterial color="#00aa00" side={THREE.DoubleSide} />
                        </mesh>
                    </group>
                )}

                {/* --- MONSTER (Yokai) --- */}
                {data.type === ObjectType.MONSTER && (
                    <group>
                        <mesh geometry={MONSTER_BODY_GEO}>
                            <meshStandardMaterial color="#440088" metalness={0.8} roughness={0.1} emissive="#220044" />
                        </mesh>
                        {/* Spikes */}
                        <mesh position={[0.4, 0.3, 0]} rotation={[0, 0, -0.5]} geometry={MONSTER_SPIKE_GEO}>
                            <meshBasicMaterial color="#aa00ff" />
                        </mesh>
                        <mesh position={[-0.4, 0.3, 0]} rotation={[0, 0, 0.5]} geometry={MONSTER_SPIKE_GEO}>
                            <meshBasicMaterial color="#aa00ff" />
                        </mesh>
                        <mesh position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]} geometry={MONSTER_SPIKE_GEO}>
                            <meshBasicMaterial color="#aa00ff" />
                        </mesh>
                        {/* Eye */}
                        <mesh position={[0, 0, 0.4]} geometry={new THREE.CircleGeometry(0.15, 16)}>
                             <meshBasicMaterial color="#ffff00" />
                        </mesh>
                    </group>
                )}

                {/* --- MISSILE --- */}
                {data.type === ObjectType.MISSILE && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        <mesh geometry={MISSILE_GEO}>
                            <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={2} />
                        </mesh>
                    </group>
                )}

                {/* --- GEM --- */}
                {data.type === ObjectType.GEM && (
                    <mesh castShadow geometry={GEM_GEOMETRY}>
                        <meshStandardMaterial 
                            color={data.color} 
                            roughness={0} 
                            metalness={1} 
                            emissive={data.color} 
                            emissiveIntensity={2} 
                        />
                    </mesh>
                )}

                {/* --- LETTER --- */}
                {data.type === ObjectType.LETTER && (
                    <group scale={[1.5, 1.5, 1.5]}>
                         <Center>
                             <Text3D 
                                font={FONT_URL} 
                                size={0.8} 
                                height={0.5} 
                                bevelEnabled
                                bevelThickness={0.02}
                             >
                                {data.value}
                                <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={1.5} />
                             </Text3D>
                         </Center>
                    </group>
                )}
            </group>
        </group>
    );
});