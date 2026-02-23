/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Play, 
  Pause, 
  RotateCcw, 
  Heart, 
  Shield, 
  Zap, 
  Info,
  ChevronRight,
  Gamepad2,
  Skull
} from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import { GameState, GameStats, Achievement } from './types';
import { PLAYER_INITIAL_HEALTH } from './constants';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    level: 1,
    enemiesKilled: 0,
    itemsCollected: 0,
    timeSurvived: 0,
    damageTaken: 0,
  });
  const [finalAchievements, setFinalAchievements] = useState<Achievement[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  const addNotification = useCallback((msg: string) => {
    setNotifications(prev => [...prev, msg]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  }, []);

  const handleStart = () => {
    setGameState(GameState.PLAYING);
    setStats({
      score: 0,
      level: 1,
      enemiesKilled: 0,
      itemsCollected: 0,
      timeSurvived: 0,
      damageTaken: 0,
    });
  };

  const handleGameOver = useCallback((finalStats: GameStats, achievements: Achievement[]) => {
    setStats(finalStats);
    setFinalAchievements(achievements.filter(a => a.unlocked));
    setGameState(GameState.GAMEOVER);
  }, []);

  const handleLevelUp = useCallback((level: number) => {
    addNotification(`关卡升级: LEVEL ${level}`);
  }, [addNotification]);

  const handleAchievementUnlock = useCallback((ach: Achievement) => {
    addNotification(`成就解锁: ${ach.title}`);
  }, [addNotification]);

  const handlePause = () => {
    if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
  };

  // Global Key Listeners for Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') handlePause();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col md:flex-row">
      
      {/* Sidebar - Instructions (Desktop Only) */}
      <aside className="hidden lg:flex flex-col w-80 border-r border-white/10 bg-white/5 backdrop-blur-xl p-8 gap-8">
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">操作指南</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-mono border border-white/20">W</div>
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-mono border border-white/20">A</div>
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-mono border border-white/20">S</div>
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-mono border border-white/20">D</div>
              <span>移动战机</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="px-4 h-8 rounded bg-white/10 flex items-center justify-center font-mono border border-white/20">Space</div>
              <span>发射子弹</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center font-mono border border-white/20">P</div>
              <span>暂停游戏</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400">道具说明</h2>
          <div className="space-y-4">
            <div className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">三向子弹</p>
                <p className="text-xs text-slate-400">增强火力，持续10秒</p>
              </div>
            </div>
            <div className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">能量护盾</p>
                <p className="text-xs text-slate-400">抵挡一次敌机撞击</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Info size={16} />
            <span className="text-xs font-bold uppercase">提示</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            敌机逃脱会扣除 50 分。随着关卡提升，敌机速度和生命值会增加。
          </p>
        </div>
      </aside>

      {/* Main Game Area */}
      <main className="flex-1 relative flex items-center justify-center p-4 md:p-8">
        
        {/* Game Container */}
        <div className="relative aspect-[8/9] w-full max-w-[600px] bg-slate-900 rounded-2xl shadow-2xl shadow-cyan-500/10 border border-white/10 overflow-hidden">
          
          {/* Canvas Component */}
          <GameCanvas 
            gameState={gameState} 
            onGameOver={handleGameOver}
            onStatsUpdate={setStats}
            onAchievementUnlock={handleAchievementUnlock}
            onLevelUp={handleLevelUp}
          />

          {/* HUD Overlay */}
          {gameState !== GameState.START && (
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <Trophy size={14} className="text-yellow-400" />
                    <span className="text-sm font-mono font-bold">{stats.score.toLocaleString()}</span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center gap-2">
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-tighter">LV</span>
                    <span className="text-sm font-mono font-bold">{stats.level}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: PLAYER_INITIAL_HEALTH }).map((_, i) => (
                    <Heart 
                      key={i} 
                      size={16} 
                      className={i < (PLAYER_INITIAL_HEALTH - stats.damageTaken) ? "text-red-500 fill-red-500" : "text-slate-700"} 
                    />
                  ))}
                </div>
              </div>

              <button 
                onClick={handlePause}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white pointer-events-auto hover:bg-white/10 transition-colors"
              >
                {gameState === GameState.PAUSED ? <Play size={20} /> : <Pause size={20} />}
              </button>
            </div>
          )}

          {/* Start Screen */}
          <AnimatePresence>
            {gameState === GameState.START && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="max-w-sm space-y-8">
                  <div className="space-y-2">
                    <motion.h1 
                      initial={{ y: 20 }}
                      animate={{ y: 0 }}
                      className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400"
                    >
                      JOY
                    </motion.h1>
                    <p className="text-xl font-bold tracking-[0.2em] text-cyan-500/80">星际先锋</p>
                  </div>
                  
                  <p className="text-slate-400 text-sm leading-relaxed">
                    在浩瀚的宇宙中，你是最后的防线。击退敌机，收集能量，成为真正的星际传奇。
                  </p>

                  <button 
                    onClick={handleStart}
                    className="group relative px-8 py-4 bg-cyan-500 text-slate-950 font-bold rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                    <span className="relative flex items-center gap-2">
                      开始航行 <ChevronRight size={20} />
                    </span>
                  </button>

                  <div className="lg:hidden grid grid-cols-2 gap-4 pt-8">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-left">
                      <Gamepad2 size={16} className="text-cyan-400 mb-2" />
                      <p className="text-[10px] font-bold uppercase text-slate-500">操作</p>
                      <p className="text-xs">拖动或点击屏幕移动并射击</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-left">
                      <Zap size={16} className="text-yellow-400 mb-2" />
                      <p className="text-[10px] font-bold uppercase text-slate-500">道具</p>
                      <p className="text-xs">收集黄色和绿色方块</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pause Screen */}
          <AnimatePresence>
            {gameState === GameState.PAUSED && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center"
              >
                <div className="text-center space-y-6">
                  <h2 className="text-4xl font-black tracking-tighter italic">游戏暂停</h2>
                  <div className="flex gap-4">
                    <button 
                      onClick={handlePause}
                      className="px-6 py-3 bg-white text-slate-950 font-bold rounded-full flex items-center gap-2 hover:bg-cyan-400 transition-colors"
                    >
                      <Play size={18} /> 继续
                    </button>
                    <button 
                      onClick={() => setGameState(GameState.START)}
                      className="px-6 py-3 bg-white/10 border border-white/20 font-bold rounded-full flex items-center gap-2 hover:bg-white/20 transition-colors"
                    >
                      退出
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Game Over Screen */}
          <AnimatePresence>
            {gameState === GameState.GAMEOVER && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-8"
              >
                <div className="w-full max-w-md space-y-8 text-center">
                  <div className="space-y-2">
                    <div className="inline-flex p-4 rounded-full bg-red-500/20 text-red-500 mb-4">
                      <Skull size={48} />
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter italic text-red-500">任务失败</h2>
                    <p className="text-slate-400">你的战机在星际尘埃中陨落...</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">最终得分</p>
                      <p className="text-2xl font-mono font-bold text-cyan-400">{stats.score.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">最高关卡</p>
                      <p className="text-2xl font-mono font-bold text-cyan-400">{stats.level}</p>
                    </div>
                  </div>

                  {finalAchievements.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-yellow-500">解锁成就</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {finalAchievements.map(ach => (
                          <div key={ach.id} className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-500">
                            {ach.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleStart}
                      className="w-full py-4 bg-white text-slate-950 font-bold rounded-full flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors"
                    >
                      <RotateCcw size={20} /> 再次挑战
                    </button>
                    <button 
                      onClick={() => setGameState(GameState.START)}
                      className="w-full py-4 bg-white/5 border border-white/10 font-bold rounded-full hover:bg-white/10 transition-colors"
                    >
                      返回主菜单
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notifications */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
              {notifications.map((note, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 self-start"
                >
                  {note}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* Footer - Mobile Stats (Mobile Only) */}
      <footer className="lg:hidden p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl flex justify-around">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-slate-500">击杀</p>
          <p className="text-sm font-mono font-bold">{stats.enemiesKilled}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-slate-500">存活</p>
          <p className="text-sm font-mono font-bold">{stats.timeSurvived}s</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase text-slate-500">道具</p>
          <p className="text-sm font-mono font-bold">{stats.itemsCollected}</p>
        </div>
      </footer>
    </div>
  );
}
