/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER',
}

export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  HEAVY = 'HEAVY',
}

export enum ItemType {
  TRIPLE_SHOT = 'TRIPLE_SHOT',
  SHIELD = 'SHIELD',
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  condition: (stats: GameStats) => boolean;
}

export interface GameStats {
  score: number;
  level: number;
  enemiesKilled: number;
  itemsCollected: number;
  timeSurvived: number; // in seconds
  damageTaken: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}
