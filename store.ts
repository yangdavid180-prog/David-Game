/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { create } from 'zustand';
import { GameStatus, RUN_SPEED_BASE, Difficulty } from './types';

interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
  maxLives: number;
  speed: number;
  collectedLetters: number[]; 
  level: number;
  laneCount: number;
  gemsCollected: number;
  distance: number;
  
  // Time Tunnel Specifics
  difficulty: Difficulty;
  timeLeft: number;
  maxTime: number;

  // Inventory / Abilities
  hasDoubleJump: boolean;
  hasImmortality: boolean;
  isImmortalityActive: boolean;

  // Actions
  startGame: (diff: Difficulty) => void;
  restartGame: () => void;
  takeDamage: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (index: number) => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  decrementTimer: (delta: number) => void;
  
  // Shop / Abilities
  buyItem: (type: 'DOUBLE_JUMP' | 'MAX_LIFE' | 'HEAL' | 'IMMORTAL', cost: number) => boolean;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;
}

const GEMINI_TARGET = ['G', 'E', 'M', 'I', 'N', 'I'];
const MAX_LEVEL = 3;

// Difficulty Settings
const DIFFICULTY_SETTINGS = {
  [Difficulty.EASY]: { speed: 20, time: 90, lanes: 3 },
  [Difficulty.MEDIUM]: { speed: 30, time: 60, lanes: 3 },
  [Difficulty.HARD]: { speed: 45, time: 45, lanes: 5 }, // Hard starts wider and faster
};

export const useStore = create<GameState>((set, get) => ({
  status: GameStatus.MENU,
  score: 0,
  lives: 3,
  maxLives: 3,
  speed: 0,
  collectedLetters: [],
  level: 1,
  laneCount: 3,
  gemsCollected: 0,
  distance: 0,
  difficulty: Difficulty.EASY,
  timeLeft: 60,
  maxTime: 60,
  
  hasDoubleJump: false,
  hasImmortality: false,
  isImmortalityActive: false,

  startGame: (diff: Difficulty) => {
    const settings = DIFFICULTY_SETTINGS[diff];
    set({ 
        status: GameStatus.PLAYING, 
        score: 0, 
        lives: 3, 
        maxLives: 3,
        speed: settings.speed,
        timeLeft: settings.time,
        maxTime: settings.time,
        collectedLetters: [],
        level: 1,
        laneCount: settings.lanes,
        gemsCollected: 0,
        distance: 0,
        difficulty: diff,
        hasDoubleJump: false,
        hasImmortality: false,
        isImmortalityActive: false
    });
  },

  restartGame: () => {
      // Restart with same difficulty
      const diff = get().difficulty;
      get().startGame(diff);
  },

  decrementTimer: (delta) => {
      const { timeLeft, status } = get();
      if (status !== GameStatus.PLAYING) return;

      const newTime = timeLeft - delta;
      if (newTime <= 0) {
          set({ timeLeft: 0, status: GameStatus.GAME_OVER, speed: 0 });
      } else {
          set({ timeLeft: newTime });
      }
  },

  takeDamage: () => {
    const { lives, isImmortalityActive } = get();
    if (isImmortalityActive) return; 

    if (lives > 1) {
      set({ lives: lives - 1 });
    } else {
      set({ lives: 0, status: GameStatus.GAME_OVER, speed: 0 });
    }
  },

  addScore: (amount) => set((state) => ({ score: state.score + amount })),
  
  collectGem: (value) => set((state) => ({ 
    score: state.score + value, 
    gemsCollected: state.gemsCollected + 1 
  })),

  setDistance: (dist) => set({ distance: dist }),

  collectLetter: (index) => {
    const { collectedLetters, level, speed, timeLeft } = get();
    
    if (!collectedLetters.includes(index)) {
      const newLetters = [...collectedLetters, index];
      
      // Collecting a letter adds time bonus!
      const timeBonus = 5; 
      
      // Speed up slightly
      const speedIncrease = speed * 0.05;
      const nextSpeed = speed + speedIncrease;

      set({ 
        collectedLetters: newLetters,
        speed: nextSpeed,
        timeLeft: timeLeft + timeBonus
      });

      // Check if full word collected
      if (newLetters.length === GEMINI_TARGET.length) {
        if (level < MAX_LEVEL) {
            get().advanceLevel();
        } else {
            set({
                status: GameStatus.VICTORY,
                score: get().score + 5000 + (Math.floor(timeLeft) * 100)
            });
        }
      }
    }
  },

  advanceLevel: () => {
      const { level, laneCount, speed, difficulty } = get();
      const nextLevel = level + 1;
      
      // Increase speed and refill some time
      const speedIncrease = 10;
      const newSpeed = speed + speedIncrease;
      const timeRefill = 30; // 30 seconds added for next level

      set({
          level: nextLevel,
          laneCount: Math.min(laneCount + 2, 9), 
          status: GameStatus.PLAYING, 
          speed: newSpeed,
          timeLeft: get().timeLeft + timeRefill,
          collectedLetters: [] 
      });
  },

  openShop: () => set({ status: GameStatus.SHOP }),
  
  closeShop: () => set({ status: GameStatus.PLAYING }),

  buyItem: (type, cost) => {
      const { score, maxLives, lives, timeLeft } = get();
      
      if (score >= cost) {
          set({ score: score - cost });
          
          switch (type) {
              case 'DOUBLE_JUMP':
                  set({ hasDoubleJump: true });
                  break;
              case 'MAX_LIFE':
                  set({ maxLives: maxLives + 1, lives: lives + 1 });
                  break;
              case 'HEAL':
                  set({ lives: Math.min(lives + 1, maxLives) });
                  break;
              case 'IMMORTAL':
                  set({ hasImmortality: true });
                  break;
          }
          return true;
      }
      return false;
  },

  activateImmortality: () => {
      const { hasImmortality, isImmortalityActive } = get();
      if (hasImmortality && !isImmortalityActive) {
          set({ isImmortalityActive: true });
          setTimeout(() => {
              set({ isImmortalityActive: false });
          }, 5000);
      }
  },

  setStatus: (status) => set({ status }),
  increaseLevel: () => set((state) => ({ level: state.level + 1 })),
}));