/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Heart, Zap, Trophy, MapPin, Diamond, Rocket, ArrowUpCircle, Shield, Activity, PlusCircle, Play, Timer, Skull } from 'lucide-react';
import { useStore } from '../../store';
import { GameStatus, GEMINI_COLORS, ShopItem, RUN_SPEED_BASE, Difficulty } from '../../types';
import { audio } from '../System/Audio';

// Available Shop Items
const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'DOUBLE_JUMP',
        name: 'TURBO BOOST',
        description: 'Double Jump capability to clear high threats.',
        cost: 1000,
        icon: ArrowUpCircle,
        oneTime: true
    },
    {
        id: 'MAX_LIFE',
        name: 'HULL REINFORCE',
        description: 'Permanently adds a shield slot and repairs hull.',
        cost: 1500,
        icon: Activity
    },
    {
        id: 'HEAL',
        name: 'REPAIR NANOBOTS',
        description: 'Restores 1 Shield point instantly.',
        cost: 1000,
        icon: PlusCircle
    },
    {
        id: 'IMMORTAL',
        name: 'PHASE SHIFT',
        description: 'Ability: Become intangible for 5s (Press Enter).',
        cost: 3000,
        icon: Shield,
        oneTime: true
    }
];

const ShopScreen: React.FC = () => {
    const { score, buyItem, closeShop, hasDoubleJump, hasImmortality } = useStore();
    const [items, setItems] = useState<ShopItem[]>([]);

    useEffect(() => {
        let pool = SHOP_ITEMS.filter(item => {
            if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
            if (item.id === 'IMMORTAL' && hasImmortality) return false;
            return true;
        });

        pool = pool.sort(() => 0.5 - Math.random());
        setItems(pool.slice(0, 3));
    }, []);

    return (
        <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
             <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                 <h2 className="text-3xl md:text-4xl font-black text-cyan-400 mb-2 font-cyber tracking-widest text-center">PIT STOP</h2>
                 <div className="flex items-center text-yellow-400 mb-6 md:mb-8">
                     <span className="text-base md:text-lg mr-2">AVAILABLE CREDITS:</span>
                     <span className="text-xl md:text-2xl font-bold">{score.toLocaleString()}</span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full mb-8">
                     {items.map(item => {
                         const Icon = item.icon;
                         const canAfford = score >= item.cost;
                         return (
                             <div key={item.id} className="bg-gray-900/80 border border-gray-700 p-4 md:p-6 rounded-xl flex flex-col items-center text-center hover:border-cyan-500 transition-colors">
                                 <div className="bg-gray-800 p-3 md:p-4 rounded-full mb-3 md:mb-4">
                                     <Icon className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
                                 </div>
                                 <h3 className="text-lg md:text-xl font-bold mb-2">{item.name}</h3>
                                 <p className="text-gray-400 text-xs md:text-sm mb-4 h-10 md:h-12 flex items-center justify-center">{item.description}</p>
                                 <button 
                                    onClick={() => buyItem(item.id as any, item.cost)}
                                    disabled={!canAfford}
                                    className={`px-4 md:px-6 py-2 rounded font-bold w-full text-sm md:text-base ${canAfford ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110' : 'bg-gray-700 cursor-not-allowed opacity-50'}`}
                                 >
                                     {item.cost} GEMS
                                 </button>
                             </div>
                         );
                     })}
                 </div>

                 <button 
                    onClick={closeShop}
                    className="flex items-center px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,0,255,0.4)]"
                 >
                     RE-ENTER TIME STREAM <Play className="ml-2 w-5 h-5" fill="white" />
                 </button>
             </div>
        </div>
    );
};

export const HUD: React.FC = () => {
  const { score, lives, maxLives, collectedLetters, status, level, restartGame, startGame, gemsCollected, distance, isImmortalityActive, timeLeft, maxTime } = useStore();
  const target = ['G', 'E', 'M', 'I', 'N', 'I'];

  const containerClass = "absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-50";

  if (status === GameStatus.SHOP) {
      return <ShopScreen />;
  }

  if (status === GameStatus.MENU) {
      return (
          <div className="absolute inset-0 flex items-center justify-center z-[100] bg-black/95 p-4 pointer-events-auto">
              <div className="flex flex-col items-center max-w-md w-full text-center space-y-6">
                <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 font-cyber drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]">
                    TIME TUNNEL RACER
                </h1>
                
                <p className="text-gray-400 text-sm md:text-base font-mono">
                    Select your reality difficulty setting:
                </p>

                <div className="grid gap-4 w-full">
                    <button 
                        onClick={() => { audio.init(); startGame(Difficulty.EASY); }}
                        className="p-4 rounded-xl bg-green-900/40 border border-green-500/50 hover:bg-green-500/20 hover:border-green-400 transition-all group"
                    >
                        <div className="text-xl font-bold text-green-400 group-hover:text-green-300">BEGINNER</div>
                        <div className="text-xs text-gray-400">Slow Speed • 90s Timer • 3 Lanes</div>
                    </button>

                    <button 
                        onClick={() => { audio.init(); startGame(Difficulty.MEDIUM); }}
                        className="p-4 rounded-xl bg-blue-900/40 border border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-400 transition-all group"
                    >
                        <div className="text-xl font-bold text-blue-400 group-hover:text-blue-300">INTERMEDIATE</div>
                        <div className="text-xs text-gray-400">Fast Speed • 60s Timer • 3 Lanes</div>
                    </button>

                    <button 
                        onClick={() => { audio.init(); startGame(Difficulty.HARD); }}
                        className="p-4 rounded-xl bg-red-900/40 border border-red-500/50 hover:bg-red-500/20 hover:border-red-400 transition-all group"
                    >
                        <div className="text-xl font-bold text-red-400 group-hover:text-red-300">ADVANCED</div>
                        <div className="text-xs text-gray-400">Hyper Speed • 45s Timer • 5 Lanes</div>
                    </button>
                </div>
              </div>
          </div>
      );
  }

  if (status === GameStatus.GAME_OVER) {
      return (
          <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-sm overflow-y-auto">
              <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <Skull className="w-20 h-20 text-red-600 mb-4 animate-pulse" />
                <h1 className="text-4xl md:text-6xl font-black text-white mb-2 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] font-cyber text-center">
                    {timeLeft <= 0 ? "TIME EXPIRED" : "CRITICAL FAILURE"}
                </h1>
                
                <div className="grid grid-cols-1 gap-3 md:gap-4 text-center mb-8 w-full max-w-md">
                     <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg flex items-center justify-between mt-2">
                        <div className="flex items-center text-white text-sm md:text-base">TOTAL SCORE</div>
                        <div className="text-2xl md:text-3xl font-bold font-cyber text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">{score.toLocaleString()}</div>
                    </div>
                </div>

                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                >
                    TRY AGAIN
                </button>
              </div>
          </div>
      );
  }

  if (status === GameStatus.VICTORY) {
    return (
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/90 to-black/95 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
            <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <Rocket className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]" />
                <h1 className="text-3xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-pink-500 mb-2 drop-shadow-[0_0_20px_rgba(255,165,0,0.6)] font-cyber text-center leading-tight">
                    TIME TUNNEL CONQUERED
                </h1>
                <p className="text-cyan-300 text-sm md:text-2xl font-mono mb-8 tracking-widest text-center">
                    YOU HAVE REACHED THE END OF TIME
                </p>
                
                <div className="bg-black/60 p-6 rounded-xl border border-yellow-500/30 shadow-[0_0_15px_rgba(255,215,0,0.1)] mb-8">
                    <div className="text-xs md:text-sm text-gray-400 mb-1 tracking-wider text-center">FINAL SCORE</div>
                    <div className="text-3xl md:text-4xl font-bold font-cyber text-yellow-400">{score.toLocaleString()}</div>
                </div>

                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-8 md:px-12 py-4 md:py-5 bg-white text-black font-black text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] tracking-widest"
                >
                    PLAY AGAIN
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className={containerClass}>
        {/* Top Bar */}
        <div className="flex justify-between items-start w-full">
            <div className="flex flex-col">
                <div className="text-3xl md:text-5xl font-bold text-cyan-400 drop-shadow-[0_0_10px_#00ffff] font-cyber">
                    {score.toLocaleString()}
                </div>
            </div>
            
            {/* Lives */}
            <div className="flex space-x-1 md:space-x-2">
                {[...Array(maxLives)].map((_, i) => (
                    <Shield 
                        key={i} 
                        className={`w-6 h-6 md:w-8 md:h-8 ${i < lives ? 'text-green-500 fill-green-500' : 'text-gray-800 fill-gray-800'} drop-shadow-[0_0_5px_#00ff00]`} 
                    />
                ))}
            </div>
        </div>
        
        {/* TIMER DISPLAY - CENTRAL HUD */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
             <div className={`text-4xl md:text-6xl font-black font-mono tracking-wider drop-shadow-lg ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                 {Math.ceil(timeLeft)}
             </div>
             <div className="text-xs text-gray-400 tracking-[0.2em] mt-1">TIME REMAINING</div>
        </div>

        {/* Level Indicator */}
        <div className="absolute top-24 md:top-28 left-1/2 transform -translate-x-1/2 text-sm md:text-lg text-purple-300 font-bold tracking-wider font-mono bg-black/50 px-3 py-1 rounded-full border border-purple-500/30 backdrop-blur-sm z-50">
            SECTOR {level} <span className="text-gray-500 text-xs md:text-sm">/ 3</span>
        </div>

        {/* Active Skill Indicator */}
        {isImmortalityActive && (
             <div className="absolute top-36 left-1/2 transform -translate-x-1/2 text-yellow-400 font-bold text-xl md:text-2xl animate-pulse flex items-center drop-shadow-[0_0_10px_gold]">
                 <Shield className="mr-2 fill-yellow-400" /> PHASE SHIFT
             </div>
        )}

        {/* Gemini Collection Status - Just below Timer */}
        <div className="absolute bottom-24 md:bottom-12 left-1/2 transform -translate-x-1/2 flex space-x-2 md:space-x-3">
            {target.map((char, idx) => {
                const isCollected = collectedLetters.includes(idx);
                const color = GEMINI_COLORS[idx];

                return (
                    <div 
                        key={idx}
                        style={{
                            borderColor: isCollected ? color : 'rgba(55, 65, 81, 1)',
                            color: isCollected ? '#000' : 'rgba(55, 65, 81, 1)',
                            boxShadow: isCollected ? `0 0 20px ${color}` : 'none',
                            backgroundColor: isCollected ? color : 'rgba(0, 0, 0, 0.9)'
                        }}
                        className={`w-8 h-10 md:w-10 md:h-12 flex items-center justify-center border-2 font-black text-lg md:text-xl font-cyber rounded-lg transform transition-all duration-300`}
                    >
                        {char}
                    </div>
                );
            })}
        </div>

        {/* Bottom Overlay */}
        <div className="w-full flex justify-between items-end">
             <div className="flex items-center space-x-2 text-purple-400 opacity-70">
                 <MapPin className="w-4 h-4" />
                 <span className="font-mono text-sm">{Math.floor(distance)} LY</span>
             </div>
             <div className="flex items-center space-x-2 text-cyan-500 opacity-70">
                 <Zap className="w-4 h-4 md:w-6 md:h-6 animate-pulse" />
                 <span className="font-mono text-base md:text-xl">MACH {Math.round((1 + distance/500) * 10) / 10}</span>
             </div>
        </div>
    </div>
  );
};