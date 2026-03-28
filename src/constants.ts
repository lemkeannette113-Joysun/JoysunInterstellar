export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 900;

export const PLAYER_SPEED = 7;
export const PLAYER_SIZE = 40;
export const PLAYER_INITIAL_HEALTH = 5;

export const BULLET_SPEED = 10;
export const BULLET_SIZE = 4;

export const ENEMY_CONFIGS = {
  BASIC: {
    speed: 2,
    health: 1,
    score: 100,
    size: 30,
    color: '#3b82f6', // blue-500
  },
  FAST: {
    speed: 4,
    health: 2,
    score: 150,
    size: 25,
    color: '#f59e0b', // amber-500
  },
  HEAVY: {
    speed: 1.5,
    health: 10,
    score: 300,
    size: 45,
    color: '#ef4444', // red-500
  },
  SHOOTER: {
    speed: 1.2, // Slow speed
    health: 2,
    score: 500,
    size: 40,
    color: '#f87171', // red-400
  },
  BOSS: {
    speed: 1,
    health: 100,
    score: 5000,
    size: 120,
    color: '#a855f7', // purple-500
  },
  WAVER: {
    speed: 1.5,
    health: 3,
    score: 250,
    size: 35,
    color: '#10b981', // emerald-500
  },
  DIVER: {
    speed: 2,
    health: 2,
    score: 400,
    size: 30,
    color: '#f97316', // orange-500
  },
};

export const POWERUP_DURATION = 10000; // 10 seconds
export const INVINCIBILITY_DURATION = 2000; // 2 seconds

export const ACHIEVEMENTS_LIST = [
  {
    id: 'first_blood',
    title: '第一滴血',
    description: '击毁第一架敌机',
    unlocked: false,
    condition: (stats: any) => stats.enemiesKilled >= 1,
  },
  {
    id: 'survivor',
    title: '生存者',
    description: '在单场游戏中存活超过 60 秒',
    unlocked: false,
    condition: (stats: any) => stats.timeSurvived >= 60,
  },
  {
    id: 'ace_pilot',
    title: '王牌飞行员',
    description: '达到第 5 关',
    unlocked: false,
    condition: (stats: any) => stats.level >= 5,
  },
  {
    id: 'collector',
    title: '收集达人',
    description: '在一场游戏中收集 5 个道具',
    unlocked: false,
    condition: (stats: any) => stats.itemsCollected >= 5,
  },
  {
    id: 'sharpshooter',
    title: '神枪手',
    description: '得分超过 10,000 分',
    unlocked: false,
    condition: (stats: any) => stats.score >= 10000,
  },
];
