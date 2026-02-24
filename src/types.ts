/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  UPGRADING = 'UPGRADING',
  GAMEOVER = 'GAMEOVER',
}

export enum UpgradeType {
  FIRE_RATE = 'FIRE_RATE',
  DAMAGE = 'DAMAGE',
  DEFENSE = 'DEFENSE',
  MOVE_SPEED = 'MOVE_SPEED',
}

export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  HEAVY = 'HEAVY',
  SHOOTER = 'SHOOTER',
}

export enum ItemType {
  TRIPLE_SHOT = 'TRIPLE_SHOT',
  SHIELD = 'SHIELD',
  MEDKIT = 'MEDKIT',
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
  currentHealth: number;
  maxHealth: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  dx: number;
  dy: number;
}
