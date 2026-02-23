import { useEffect, useRef, useState } from 'react';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  PLAYER_SPEED, 
  PLAYER_SIZE, 
  PLAYER_INITIAL_HEALTH,
  BULLET_SPEED,
  BULLET_SIZE,
  ENEMY_CONFIGS,
  POWERUP_DURATION,
  INVINCIBILITY_DURATION,
  ACHIEVEMENTS_LIST
} from '../constants';
import { 
  GameState, 
  EnemyType, 
  ItemType, 
  GameStats,
  Achievement
} from '../types';

// --- Game Entities ---

const ASSETS = {
  player: '/assets/player.png',
  enemyBasic: '/assets/enemy_basic.png',
  enemyFast: '/assets/enemy_fast.png',
  enemyHeavy: '/assets/enemy_heavy.png',
};

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 3 + 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;

  constructor(x: number, y: number, vx: number, vy: number, color: string = '#00f2ff') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, BULLET_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Enemy {
  x: number;
  y: number;
  type: EnemyType;
  health: number;
  speed: number;
  size: number;
  color: string;

  constructor(x: number, y: number, type: EnemyType, level: number) {
    const config = ENEMY_CONFIGS[type];
    this.x = x;
    this.y = y;
    this.type = type;
    this.health = config.health + Math.floor(level / 3);
    this.speed = config.speed + (level * 0.1);
    this.size = config.size;
    this.color = config.color;
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D, image?: HTMLImageElement | null) {
    ctx.save();
    
    if (image && image.complete && image.naturalWidth !== 0) {
      // Draw image if available
      ctx.drawImage(
        image, 
        this.x - this.size / 2, 
        this.y - this.size / 2, 
        this.size, 
        this.size
      );
    } else {
      // Fallback to vector drawing
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.size);
      ctx.lineTo(this.x - this.size / 2, this.y);
      ctx.lineTo(this.x + this.size / 2, this.y);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(this.x, this.y - 2, this.size / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

class Item {
  x: number;
  y: number;
  type: ItemType;
  size: number = 20;
  speed: number = 2;

  constructor(x: number, y: number, type: ItemType) {
    this.x = x;
    this.y = y;
    this.type = type;
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const color = this.type === ItemType.TRIPLE_SHOT ? '#facc15' : '#22c55e';
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Draw diamond shape
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.size / 2);
    ctx.lineTo(this.x + this.size / 2, this.y);
    ctx.lineTo(this.x, this.y + this.size / 2);
    ctx.lineTo(this.x - this.size / 2, this.y);
    ctx.closePath();
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.type === ItemType.TRIPLE_SHOT ? '3' : 'S', this.x, this.y + 4);
    
    ctx.restore();
  }
}

class Star {
  x: number;
  y: number;
  size: number;
  speed: number;

  constructor() {
    this.x = Math.random() * GAME_WIDTH;
    this.y = Math.random() * GAME_HEIGHT;
    this.size = Math.random() * 2;
    this.speed = Math.random() * 3 + 1;
  }

  update() {
    this.y += this.speed;
    if (this.y > GAME_HEIGHT) {
      this.y = 0;
      this.x = Math.random() * GAME_WIDTH;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Main Component ---

interface GameCanvasProps {
  gameState: GameState;
  onGameOver: (stats: GameStats, achievements: Achievement[]) => void;
  onStatsUpdate: (stats: GameStats) => void;
  onAchievementUnlock: (achievement: Achievement) => void;
  onLevelUp: (level: number) => void;
}

export default function GameCanvas({ 
  gameState, 
  onGameOver, 
  onStatsUpdate,
  onAchievementUnlock,
  onLevelUp
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs (to avoid closure issues in loop)
  const statsRef = useRef<GameStats>({
    score: 0,
    level: 1,
    enemiesKilled: 0,
    itemsCollected: 0,
    timeSurvived: 0,
    damageTaken: 0,
  });
  
  const achievementsRef = useRef<Achievement[]>(ACHIEVEMENTS_LIST.map(a => ({ ...a })));
  const playerPos = useRef({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 100 });
  const playerHealth = useRef(PLAYER_INITIAL_HEALTH);
  const isInvincible = useRef(false);
  const tripleShotUntil = useRef(0);
  const hasShield = useRef(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const isPointerDown = useRef(false);
  const pointerPos = useRef({ x: 0, y: 0 });
  
  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const items = useRef<Item[]>([]);
  const particles = useRef<Particle[]>([]);
  const stars = useRef<Star[]>(Array.from({ length: 100 }, () => new Star()));
  
  const lastShotTime = useRef(0);
  const lastEnemySpawn = useRef(0);
  const lastItemSpawn = useRef(0);
  const lastTimeTick = useRef(0);

  // Asset Loading
  const images = useRef<{ [key: string]: HTMLImageElement }>({});
  useEffect(() => {
    Object.entries(ASSETS).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      images.current[key] = img;
    });
  }, []);

  // Reset game when transitioning to PLAYING
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      statsRef.current = {
        score: 0,
        level: 1,
        enemiesKilled: 0,
        itemsCollected: 0,
        timeSurvived: 0,
        damageTaken: 0,
      };
      playerPos.current = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 100 };
      playerHealth.current = PLAYER_INITIAL_HEALTH;
      isInvincible.current = false;
      tripleShotUntil.current = 0;
      hasShield.current = false;
      bullets.current = [];
      enemies.current = [];
      items.current = [];
      particles.current = [];
      lastShotTime.current = 0;
      lastEnemySpawn.current = 0;
      lastItemSpawn.current = 0;
      lastTimeTick.current = performance.now();
    }
  }, [gameState]);

  // Handle Input
  useEffect(() => {
    const updatePointerPos = (e: PointerEvent | { clientX: number, clientY: number }) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = GAME_WIDTH / rect.width;
      const scaleY = GAME_HEIGHT / rect.height;
      pointerPos.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.code);
      // Also support e.key for broader compatibility
      if (e.key === 'ArrowLeft') keysPressed.current.add('ArrowLeft');
      if (e.key === 'ArrowRight') keysPressed.current.add('ArrowRight');
      if (e.key === 'ArrowUp') keysPressed.current.add('ArrowUp');
      if (e.key === 'ArrowDown') keysPressed.current.add('ArrowDown');
      if (e.key === ' ' || e.key === 'Spacebar') keysPressed.current.add('Space');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
      if (e.key === 'ArrowLeft') keysPressed.current.delete('ArrowLeft');
      if (e.key === 'ArrowRight') keysPressed.current.delete('ArrowRight');
      if (e.key === 'ArrowUp') keysPressed.current.delete('ArrowUp');
      if (e.key === 'ArrowDown') keysPressed.current.delete('ArrowDown');
      if (e.key === ' ' || e.key === 'Spacebar') keysPressed.current.delete('Space');
    };
    
    const handlePointerDown = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        isPointerDown.current = true;
        updatePointerPos(e);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPointerDown.current) {
        updatePointerPos(e);
      }
    };

    const handlePointerUp = () => {
      isPointerDown.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  // Game Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    let animationFrameId: number;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const loop = (time: number) => {
      update(time);
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    const update = (time: number) => {
      // Time tracking
      if (time - lastTimeTick.current >= 1000) {
        statsRef.current.timeSurvived += 1;
        lastTimeTick.current = time;
        checkAchievements();
        onStatsUpdate({ ...statsRef.current });
      }

      // Player Movement
      if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) playerPos.current.x -= PLAYER_SPEED;
      if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) playerPos.current.x += PLAYER_SPEED;
      if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW')) playerPos.current.y -= PLAYER_SPEED;
      if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('KeyS')) playerPos.current.y += PLAYER_SPEED;

      // Pointer Movement
      if (isPointerDown.current) {
        const dx = pointerPos.current.x - playerPos.current.x;
        const dy = pointerPos.current.y - playerPos.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          playerPos.current.x += (dx / dist) * PLAYER_SPEED;
          playerPos.current.y += (dy / dist) * PLAYER_SPEED;
        }
      }

      // Bound Player
      playerPos.current.x = Math.max(PLAYER_SIZE / 2, Math.min(GAME_WIDTH - PLAYER_SIZE / 2, playerPos.current.x));
      playerPos.current.y = Math.max(PLAYER_SIZE / 2, Math.min(GAME_HEIGHT - PLAYER_SIZE / 2, playerPos.current.y));

      // Shooting
      const shouldShoot = keysPressed.current.has('Space') || isPointerDown.current;
      if (shouldShoot && time - lastShotTime.current > 150) {
        const isTriple = time < tripleShotUntil.current;
        if (isTriple) {
          bullets.current.push(new Bullet(playerPos.current.x, playerPos.current.y - 20, 0, -BULLET_SPEED));
          bullets.current.push(new Bullet(playerPos.current.x - 10, playerPos.current.y - 15, -2, -BULLET_SPEED));
          bullets.current.push(new Bullet(playerPos.current.x + 10, playerPos.current.y - 15, 2, -BULLET_SPEED));
        } else {
          bullets.current.push(new Bullet(playerPos.current.x, playerPos.current.y - 20, 0, -BULLET_SPEED));
        }
        lastShotTime.current = time;
      }

      // Spawning Enemies
      const spawnInterval = Math.max(500, 1500 - statsRef.current.level * 100);
      if (time - lastEnemySpawn.current > spawnInterval) {
        const types = [EnemyType.BASIC, EnemyType.BASIC, EnemyType.FAST];
        if (statsRef.current.level >= 3) types.push(EnemyType.HEAVY);
        const type = types[Math.floor(Math.random() * types.length)];
        enemies.current.push(new Enemy(Math.random() * (GAME_WIDTH - 40) + 20, -50, type, statsRef.current.level));
        lastEnemySpawn.current = time;
      }

      // Spawning Items
      if (time - lastItemSpawn.current > 15000) {
        const type = Math.random() > 0.5 ? ItemType.TRIPLE_SHOT : ItemType.SHIELD;
        items.current.push(new Item(Math.random() * (GAME_WIDTH - 40) + 20, -50, type));
        lastItemSpawn.current = time;
      }

      // Update Stars
      stars.current.forEach(s => s.update());

      // Update Bullets
      bullets.current.forEach(b => b.update());
      bullets.current = bullets.current.filter(b => b.y > -20 && b.x > -20 && b.x < GAME_WIDTH + 20);

      // Update Enemies
      enemies.current.forEach(e => e.update());
      enemies.current = enemies.current.filter(e => {
        if (e.y > GAME_HEIGHT) {
          statsRef.current.score = Math.max(0, statsRef.current.score - 50);
          onStatsUpdate({ ...statsRef.current });
          return false;
        }
        return true;
      });

      // Update Items
      items.current.forEach(i => i.update());
      items.current = items.current.filter(i => i.y < GAME_HEIGHT + 20);

      // Update Particles
      particles.current.forEach(p => p.update());
      particles.current = particles.current.filter(p => p.life > 0);

      // Collision Detection: Bullets vs Enemies
      bullets.current.forEach((b, bIdx) => {
        enemies.current.forEach((e, eIdx) => {
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.size / 2 + BULLET_SIZE) {
            e.health -= 1;
            bullets.current.splice(bIdx, 1);
            if (e.health <= 0) {
              createExplosion(e.x, e.y, e.color);
              statsRef.current.score += ENEMY_CONFIGS[e.type].score;
              statsRef.current.enemiesKilled += 1;
              enemies.current.splice(eIdx, 1);
              checkLevelUp();
              checkAchievements();
              onStatsUpdate({ ...statsRef.current });
            }
          }
        });
      });

      // Collision Detection: Player vs Enemies
      if (!isInvincible.current) {
        enemies.current.forEach((e, eIdx) => {
          const dist = Math.hypot(playerPos.current.x - e.x, playerPos.current.y - e.y);
          if (dist < e.size / 2 + PLAYER_SIZE / 2) {
            if (hasShield.current) {
              hasShield.current = false;
              createExplosion(e.x, e.y, e.color);
              enemies.current.splice(eIdx, 1);
            } else {
              takeDamage();
              createExplosion(e.x, e.y, e.color);
              enemies.current.splice(eIdx, 1);
            }
          }
        });
      }

      // Collision Detection: Player vs Items
      items.current.forEach((item, idx) => {
        const dist = Math.hypot(playerPos.current.x - item.x, playerPos.current.y - item.y);
        if (dist < item.size / 2 + PLAYER_SIZE / 2) {
          statsRef.current.itemsCollected += 1;
          if (item.type === ItemType.TRIPLE_SHOT) {
            tripleShotUntil.current = time + POWERUP_DURATION;
          } else if (item.type === ItemType.SHIELD) {
            hasShield.current = true;
          }
          items.current.splice(idx, 1);
          checkAchievements();
          onStatsUpdate({ ...statsRef.current });
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      stars.current.forEach(s => s.draw(ctx));

      // Entities
      bullets.current.forEach(b => b.draw(ctx));
      enemies.current.forEach(e => {
        let imgKey = 'enemyBasic';
        if (e.type === EnemyType.FAST) imgKey = 'enemyFast';
        if (e.type === EnemyType.HEAVY) imgKey = 'enemyHeavy';
        e.draw(ctx, images.current[imgKey]);
      });
      items.current.forEach(i => i.draw(ctx));
      particles.current.forEach(p => p.draw(ctx));

      // Player
      drawPlayer(ctx);
    };

    const drawPlayer = (ctx: CanvasRenderingContext2D) => {
      const { x, y } = playerPos.current;
      
      if (isInvincible.current && Math.floor(Date.now() / 100) % 2 === 0) return;

      ctx.save();
      
      // Shield
      if (hasShield.current) {
        ctx.beginPath();
        ctx.arc(x, y, PLAYER_SIZE * 0.8, 0, Math.PI * 2);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#22c55e';
        ctx.stroke();
      }

      const playerImg = images.current.player;
      if (playerImg && playerImg.complete && playerImg.naturalWidth !== 0) {
        ctx.drawImage(
          playerImg,
          x - PLAYER_SIZE / 2,
          y - PLAYER_SIZE / 2,
          PLAYER_SIZE,
          PLAYER_SIZE
        );
      } else {
        // Body
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00f2ff';
        ctx.fillStyle = '#00f2ff';
        ctx.beginPath();
        ctx.moveTo(x, y - PLAYER_SIZE / 2);
        ctx.lineTo(x - PLAYER_SIZE / 2, y + PLAYER_SIZE / 2);
        ctx.lineTo(x + PLAYER_SIZE / 2, y + PLAYER_SIZE / 2);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y + 5, PLAYER_SIZE / 6, 0, Math.PI * 2);
        ctx.fill();

        // Engine Flame
        const flameHeight = Math.random() * 10 + 10;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x - 5, y + PLAYER_SIZE / 2);
        ctx.lineTo(x + 5, y + PLAYER_SIZE / 2);
        ctx.lineTo(x, y + PLAYER_SIZE / 2 + flameHeight);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    };

    const createExplosion = (x: number, y: number, color: string) => {
      for (let i = 0; i < 20; i++) {
        particles.current.push(new Particle(x, y, color));
      }
    };

    const takeDamage = () => {
      playerHealth.current -= 1;
      statsRef.current.damageTaken += 1;
      onStatsUpdate({ ...statsRef.current });
      
      if (playerHealth.current <= 0) {
        onGameOver({ ...statsRef.current }, achievementsRef.current);
      } else {
        isInvincible.current = true;
        setTimeout(() => {
          isInvincible.current = false;
        }, INVINCIBILITY_DURATION);
      }
    };

    const checkLevelUp = () => {
      const nextLevel = Math.floor(statsRef.current.score / 2000) + 1;
      if (nextLevel > statsRef.current.level) {
        statsRef.current.level = nextLevel;
        onLevelUp(nextLevel);
        // Clear screen
        enemies.current = [];
      }
    };

    const checkAchievements = () => {
      achievementsRef.current.forEach(ach => {
        if (!ach.unlocked && ach.condition(statsRef.current)) {
          ach.unlocked = true;
          onAchievementUnlock({ ...ach });
        }
      });
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      onPointerDown={(e) => {
        isPointerDown.current = true;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const scaleX = GAME_WIDTH / rect.width;
          const scaleY = GAME_HEIGHT / rect.height;
          pointerPos.current = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
          };
        }
      }}
      onPointerMove={(e) => {
        if (isPointerDown.current) {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const scaleX = GAME_WIDTH / rect.width;
            const scaleY = GAME_HEIGHT / rect.height;
            pointerPos.current = {
              x: (e.clientX - rect.left) * scaleX,
              y: (e.clientY - rect.top) * scaleY
            };
          }
        }
      }}
      className="w-full h-full object-contain bg-slate-950 shadow-2xl rounded-lg touch-none cursor-crosshair"
    />
  );
}
