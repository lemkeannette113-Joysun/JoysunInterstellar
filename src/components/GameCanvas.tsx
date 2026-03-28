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
  Achievement,
  UpgradeType
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
    const speed = Math.random() * 8 + 2; // Increased speed for more exaggeration
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.color = color;
    this.size = Math.random() * 5 + 1; // Slightly larger particles
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96; // Add some friction
    this.vy *= 0.96;
    this.life -= 0.025; // Fade a bit faster
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
  damage: number;
  isEnemy: boolean;

  constructor(x: number, y: number, vx: number, vy: number, color: string = '#00f2ff', damage: number = 1, isEnemy: boolean = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.damage = damage;
    this.isEnemy = isEnemy;
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
  maxHealth: number;
  speed: number;
  size: number;
  color: string;
  lastShotTime: number = 0;

  constructor(x: number, y: number, type: EnemyType, level: number) {
    const config = ENEMY_CONFIGS[type];
    this.x = x;
    this.y = y;
    this.type = type;
    // Health scales with level: base + (level - 1)
    this.maxHealth = config.health + (level - 1);
    this.health = this.maxHealth;
    this.speed = config.speed + (level * 0.1);
    this.size = config.size;
    this.color = config.color;
  }

  update(time: number) {
    if (this.type === EnemyType.BOSS) {
      if (this.y < 150) {
        this.y += this.speed;
      } else {
        this.x += Math.sin(time / 500) * 3;
      }
    } else if (this.type === EnemyType.WAVER) {
      this.y += this.speed;
      this.x += Math.sin(time / 300) * 4;
    } else if (this.type === EnemyType.DIVER) {
      if (this.y < 200) {
        this.y += this.speed;
      } else {
        this.y += this.speed * 3; // Dive speed
      }
    } else {
      this.y += this.speed;
    }
  }

  shoot(time: number, bullets: Bullet[], playerX: number, playerY: number) {
    if (this.type === EnemyType.SHOOTER && time - this.lastShotTime > 1000) {
      bullets.push(new Bullet(this.x, this.y + this.size / 2, 0, 15, '#ef4444', 1, true));
      this.lastShotTime = time;
    } else if (this.type === EnemyType.BOSS && time - this.lastShotTime > 1200) {
      const pattern = Math.floor(time / 4000) % 3;
      if (pattern === 0) {
        // Circular burst
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          bullets.push(new Bullet(this.x, this.y, Math.cos(angle) * 6, Math.sin(angle) * 6, '#a855f7', 1, true));
        }
      } else if (pattern === 1) {
        // Targeted spread
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const angle = Math.atan2(dy, dx);
        for (let i = -2; i <= 2; i++) {
          const a = angle + (i * 0.2);
          bullets.push(new Bullet(this.x, this.y, Math.cos(a) * 8, Math.sin(a) * 8, '#a855f7', 1, true));
        }
      } else {
        // Rapid fire
        bullets.push(new Bullet(this.x - 20, this.y + 30, 0, 10, '#a855f7', 1, true));
        bullets.push(new Bullet(this.x + 20, this.y + 30, 0, 10, '#a855f7', 1, true));
      }
      this.lastShotTime = time;
    }
  }

  draw(ctx: CanvasRenderingContext2D, image?: HTMLImageElement | null) {
    ctx.save();
    
    // Draw health bar for enemies with more than 1 HP (except Boss, which has a global bar)
    if (this.maxHealth > 1 && this.type !== EnemyType.BOSS) {
      const barWidth = this.size;
      const barHeight = 4;
      const healthPercent = this.health / this.maxHealth;
      
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.x - barWidth / 2, this.y - this.size / 2 - 10, barWidth, barHeight);
      
      // Color based on health percentage
      if (healthPercent > 0.6) ctx.fillStyle = '#22c55e'; // green
      else if (healthPercent > 0.3) ctx.fillStyle = '#f59e0b'; // amber
      else ctx.fillStyle = '#ef4444'; // red
      
      ctx.fillRect(this.x - barWidth / 2, this.y - this.size / 2 - 10, barWidth * healthPercent, barHeight);
    }
    
    if (this.type === EnemyType.BOSS) {
      // Boss specific drawing
      ctx.shadowBlur = 30;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      
      // Main body
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.size / 2, this.size / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Wings/Engines
      ctx.fillStyle = '#7c3aed'; // darker purple
      ctx.fillRect(this.x - this.size / 2 - 20, this.y - 10, 30, 40);
      ctx.fillRect(this.x + this.size / 2 - 10, this.y - 10, 30, 40);
      
      // Glowing core
      const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === EnemyType.WAVER) {
      // Wavy ship design
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.size / 2);
      ctx.bezierCurveTo(this.x + this.size, this.y, this.x - this.size, this.y, this.x, this.y + this.size / 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = this.color;
      ctx.stroke();
      
      // Core
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === EnemyType.DIVER) {
      // Sharp diver design
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.size / 2);
      ctx.lineTo(this.x - this.size / 3, this.y - this.size / 2);
      ctx.lineTo(this.x + this.size / 3, this.y - this.size / 2);
      ctx.closePath();
      ctx.fill();
      
      // Thruster
      const thrust = Math.random() * 10;
      ctx.fillStyle = '#ffedd5';
      ctx.beginPath();
      ctx.moveTo(this.x - 5, this.y - this.size / 2);
      ctx.lineTo(this.x, this.y - this.size / 2 - thrust);
      ctx.lineTo(this.x + 5, this.y - this.size / 2);
      ctx.fill();
    } else if (image && image.complete && image.naturalWidth !== 0) {
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
    let color = '#facc15'; // Default yellow
    if (this.type === ItemType.TRIPLE_SHOT) color = '#facc15';
    if (this.type === ItemType.SHIELD) color = '#22c55e';
    if (this.type === ItemType.MEDKIT) color = '#ef4444';
    if (this.type === ItemType.WINGMAN) color = '#818cf8';

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
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    let text = 'P';
    if (this.type === ItemType.TRIPLE_SHOT) text = '3';
    if (this.type === ItemType.SHIELD) text = 'S';
    if (this.type === ItemType.MEDKIT) text = 'H';
    if (this.type === ItemType.WINGMAN) text = 'W';
    ctx.fillText(text, this.x, this.y + 4);
    
    ctx.restore();
  }
}

class Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  twinkle: number;

  constructor() {
    this.x = Math.random() * GAME_WIDTH;
    this.y = Math.random() * GAME_HEIGHT;
    this.size = Math.random() * 2 + 0.5;
    this.speed = Math.random() * 2 + 0.5;
    
    const colors = ['#ffffff', '#fff7ed', '#fefce8', '#ecfeff', '#f5f3ff'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.twinkle = Math.random() * Math.PI * 2;
  }

  update() {
    this.y += this.speed;
    this.twinkle += 0.05;
    if (this.y > GAME_HEIGHT) {
      this.y = 0;
      this.x = Math.random() * GAME_WIDTH;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const opacity = 0.3 + Math.sin(this.twinkle) * 0.3;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Main Component ---

interface GameCanvasProps {
  gameState: GameState;
  onGameOver: (stats: GameStats, achievements: Achievement[]) => void;
  onStatsUpdate: (stats: GameStats) => void;
  onAchievementUnlock: (achievement: Achievement) => void;
  onLevelUp: (level: number) => void;
  appliedUpgrade?: UpgradeType;
}

export default function GameCanvas({ 
  gameState, 
  onGameOver, 
  onStatsUpdate,
  onAchievementUnlock,
  onLevelUp,
  appliedUpgrade
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
    currentHealth: PLAYER_INITIAL_HEALTH,
    maxHealth: PLAYER_INITIAL_HEALTH,
  });
  
  const achievementsRef = useRef<Achievement[]>(ACHIEVEMENTS_LIST.map(a => ({ ...a })));
  const playerPos = useRef({ x: GAME_WIDTH / 2, y: GAME_HEIGHT - 100 });
  const wingmenCount = useRef(0);
  const playerHealth = useRef(PLAYER_INITIAL_HEALTH);
  const maxHealth = useRef(PLAYER_INITIAL_HEALTH);
  const isInvincible = useRef(false);
  const tripleShotUntil = useRef(0);
  const hasShield = useRef(false);
  const keysPressed = useRef<Set<string>>(new Set());
  const isPointerDown = useRef(false);
  const pointerPos = useRef({ x: 0, y: 0 });
  
  const upgradeStats = useRef({
    fireRateBonus: 0,
    damageBonus: 0,
    defenseBonus: 0,
    moveSpeedBonus: 0,
  });
  
  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const items = useRef<Item[]>([]);
  const particles = useRef<Particle[]>([]);
  const stars = useRef<Star[]>(Array.from({ length: 100 }, () => new Star()));
  
  const lastShotTime = useRef(0);
  const lastEnemySpawn = useRef(0);
  const lastItemSpawn = useRef(0);
  const lastTimeTick = useRef(0);
  const isBossActive = useRef(false);

  useEffect(() => {
    if (appliedUpgrade) {
      if (appliedUpgrade === UpgradeType.FIRE_RATE) {
        upgradeStats.current.fireRateBonus += 25; // 25ms reduction
      } else if (appliedUpgrade === UpgradeType.DAMAGE) {
        upgradeStats.current.damageBonus += 1;
      } else if (appliedUpgrade === UpgradeType.DEFENSE) {
        maxHealth.current += 1;
        playerHealth.current = Math.min(playerHealth.current + 1, maxHealth.current);
      } else if (appliedUpgrade === UpgradeType.MOVE_SPEED) {
        upgradeStats.current.moveSpeedBonus += 1.5;
      }
      statsRef.current.maxHealth = maxHealth.current;
      statsRef.current.currentHealth = playerHealth.current;
      onStatsUpdate({ ...statsRef.current });
    }
  }, [appliedUpgrade]);

  // Asset Loading
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const images = useRef<{ [key: string]: HTMLImageElement }>({});

  useEffect(() => {
    let loadedCount = 0;
    const totalAssets = Object.keys(ASSETS).length;

    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === totalAssets) {
        setAssetsLoaded(true);
      }
    };

    Object.entries(ASSETS).forEach(([key, src]) => {
      if (src.endsWith('.png')) {
        const img = new Image();
        img.onload = checkLoaded;
        img.onerror = () => {
          console.warn(`Failed to load image: ${src}`);
          checkLoaded();
        };
        img.src = src;
        images.current[key] = img;
      }
    });
  }, []);

  // Reset game when transitioning to PLAYING from START
  const prevGameState = useRef<GameState>(gameState);
  useEffect(() => {
    if (gameState === GameState.PLAYING && (prevGameState.current === GameState.START || prevGameState.current === GameState.GAMEOVER)) {
      statsRef.current = {
        score: 0,
        level: 1,
        enemiesKilled: 0,
        itemsCollected: 0,
        timeSurvived: 0,
        damageTaken: 0,
        currentHealth: PLAYER_INITIAL_HEALTH,
        maxHealth: PLAYER_INITIAL_HEALTH,
      };
      playerPos.current = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 100 };
      playerHealth.current = PLAYER_INITIAL_HEALTH;
      maxHealth.current = PLAYER_INITIAL_HEALTH;
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
      upgradeStats.current = {
        fireRateBonus: 0,
        damageBonus: 0,
        defenseBonus: 0,
        moveSpeedBonus: 0,
      };
    }
    prevGameState.current = gameState;
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
      const currentSpeed = PLAYER_SPEED + upgradeStats.current.moveSpeedBonus;
      if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('KeyA')) playerPos.current.x -= currentSpeed;
      if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('KeyD')) playerPos.current.x += currentSpeed;
      if (keysPressed.current.has('ArrowUp') || keysPressed.current.has('KeyW')) playerPos.current.y -= currentSpeed;
      if (keysPressed.current.has('ArrowDown') || keysPressed.current.has('KeyS')) playerPos.current.y += currentSpeed;

      // Pointer Movement
      if (isPointerDown.current) {
        playerPos.current.x = pointerPos.current.x;
        playerPos.current.y = pointerPos.current.y;
      }

      // Bound Player
      playerPos.current.x = Math.max(PLAYER_SIZE / 2, Math.min(GAME_WIDTH - PLAYER_SIZE / 2, playerPos.current.x));
      playerPos.current.y = Math.max(PLAYER_SIZE / 2, Math.min(GAME_HEIGHT - PLAYER_SIZE / 2, playerPos.current.y));

      // Shooting
      const shouldShoot = keysPressed.current.has('Space') || isPointerDown.current;
      const shotInterval = Math.max(80, 150 - upgradeStats.current.fireRateBonus);
      if (shouldShoot && time - lastShotTime.current > shotInterval) {
        const isTriple = time < tripleShotUntil.current;
        const damage = 1 + upgradeStats.current.damageBonus;
        
        // Main ship shooting
        if (isTriple) {
          bullets.current.push(new Bullet(playerPos.current.x, playerPos.current.y - 20, 0, -BULLET_SPEED, '#00f2ff', damage));
          bullets.current.push(new Bullet(playerPos.current.x - 10, playerPos.current.y - 15, -2, -BULLET_SPEED, '#00f2ff', damage));
          bullets.current.push(new Bullet(playerPos.current.x + 10, playerPos.current.y - 15, 2, -BULLET_SPEED, '#00f2ff', damage));
        } else {
          bullets.current.push(new Bullet(playerPos.current.x, playerPos.current.y - 20, 0, -BULLET_SPEED, '#00f2ff', damage));
        }

        // Wingmen shooting
        if (wingmenCount.current >= 1) {
          bullets.current.push(new Bullet(playerPos.current.x - 40, playerPos.current.y + 10, 0, -BULLET_SPEED, '#00f2ff', damage * 0.5));
        }
        if (wingmenCount.current >= 2) {
          bullets.current.push(new Bullet(playerPos.current.x + 40, playerPos.current.y + 10, 0, -BULLET_SPEED, '#00f2ff', damage * 0.5));
        }

        lastShotTime.current = time;
      }

      // Spawning Enemies
      const isBossLevel = statsRef.current.level % 5 === 0;
      const spawnInterval = Math.max(500, 1500 - statsRef.current.level * 100);
      
      if (!isBossActive.current && time - lastEnemySpawn.current > spawnInterval) {
        if (isBossLevel) {
          // Spawn Boss
          enemies.current.push(new Enemy(GAME_WIDTH / 2, -100, EnemyType.BOSS, statsRef.current.level));
          isBossActive.current = true;
        } else {
          const types = [EnemyType.BASIC, EnemyType.BASIC, EnemyType.FAST];
          if (statsRef.current.level >= 2) types.push(EnemyType.WAVER);
          if (statsRef.current.level >= 3) types.push(EnemyType.HEAVY);
          if (statsRef.current.level >= 4) types.push(EnemyType.DIVER);
          if (statsRef.current.level >= 5) types.push(EnemyType.SHOOTER);
          
          const type = types[Math.floor(Math.random() * types.length)];
          enemies.current.push(new Enemy(Math.random() * (GAME_WIDTH - 40) + 20, -50, type, statsRef.current.level));
        }
        lastEnemySpawn.current = time;
      }

      // Spawning Items
      const itemSpawnInterval = isBossActive.current ? 8000 : 15000;
      if (time - lastItemSpawn.current > itemSpawnInterval) {
        const rand = Math.random();
        let type = ItemType.TRIPLE_SHOT;
        if (rand > 0.75) type = ItemType.SHIELD;
        else if (rand > 0.5) type = ItemType.MEDKIT;
        else if (rand > 0.25) type = ItemType.WINGMAN;
        
        items.current.push(new Item(Math.random() * (GAME_WIDTH - 40) + 20, -50, type));
        lastItemSpawn.current = time;
      }

      // Update Stars
      stars.current.forEach(s => s.update());

      // Update Bullets
      bullets.current.forEach(b => b.update());
      bullets.current = bullets.current.filter(b => b.y > -20 && b.x > -20 && b.x < GAME_WIDTH + 20 && b.y < GAME_HEIGHT + 20);

      // Update Enemies
      enemies.current.forEach(e => {
        e.update(time);
        e.shoot(time, bullets.current, playerPos.current.x, playerPos.current.y);
      });
      enemies.current = enemies.current.filter(e => {
        if (e.y > GAME_HEIGHT && e.type !== EnemyType.BOSS) {
          statsRef.current.score = Math.max(0, statsRef.current.score - 20); // Reduced penalty
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
        if (b.isEnemy) return; // Player bullets only
        enemies.current.forEach((e, eIdx) => {
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.size / 2 + BULLET_SIZE) {
            e.health -= b.damage;
            bullets.current.splice(bIdx, 1);
            if (e.health <= 0) {
              createExplosion(e.x, e.y, e.color);
              statsRef.current.score += ENEMY_CONFIGS[e.type].score;
              statsRef.current.enemiesKilled += 1;
              if (e.type === EnemyType.BOSS) {
                isBossActive.current = false;
              }
              enemies.current.splice(eIdx, 1);
              checkLevelUp();
              checkAchievements();
              onStatsUpdate({ ...statsRef.current });
            }
          }
        });
      });

      // Collision Detection: Player vs Enemy Bullets
      if (!isInvincible.current) {
        bullets.current.forEach((b, bIdx) => {
          if (!b.isEnemy) return;
          const dist = Math.hypot(playerPos.current.x - b.x, playerPos.current.y - b.y);
          if (dist < PLAYER_SIZE / 2 + BULLET_SIZE) {
            if (hasShield.current) {
              hasShield.current = false;
            } else {
              takeDamage();
            }
            bullets.current.splice(bIdx, 1);
          }
        });
      }

      // Collision Detection: Player vs Enemies
      if (!isInvincible.current) {
        enemies.current.forEach((e, eIdx) => {
          const dist = Math.hypot(playerPos.current.x - e.x, playerPos.current.y - e.y);
          if (dist < e.size / 2 + PLAYER_SIZE / 2) {
            if (hasShield.current) {
              hasShield.current = false;
              createExplosion(e.x, e.y, e.color);
              if (e.type === EnemyType.BOSS) {
                isBossActive.current = false;
              }
              enemies.current.splice(eIdx, 1);
            } else {
              takeDamage();
              createExplosion(e.x, e.y, e.color);
              if (e.type === EnemyType.BOSS) {
                isBossActive.current = false;
              }
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
          } else if (item.type === ItemType.MEDKIT) {
            playerHealth.current = Math.min(playerHealth.current + 1, maxHealth.current);
          } else if (item.type === ItemType.WINGMAN) {
            wingmenCount.current = Math.min(wingmenCount.current + 1, 2);
          }
          items.current.splice(idx, 1);
          statsRef.current.currentHealth = playerHealth.current;
          statsRef.current.maxHealth = maxHealth.current;
          checkAchievements();
          onStatsUpdate({ ...statsRef.current });
        }
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Background
      const gradient = ctx.createRadialGradient(
        GAME_WIDTH / 2, GAME_HEIGHT / 2, 0,
        GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_HEIGHT
      );
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#020617');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      
      stars.current.forEach(s => s.draw(ctx));

      // Entities
      bullets.current.forEach(b => b.draw(ctx));
      enemies.current.forEach(e => {
        let imgKey = 'enemyBasic';
        if (e.type === EnemyType.FAST) imgKey = 'enemyFast';
        if (e.type === EnemyType.HEAVY || e.type === EnemyType.SHOOTER) imgKey = 'enemyHeavy';
        e.draw(ctx, images.current[imgKey]);
      });
      items.current.forEach(i => i.draw(ctx));
      particles.current.forEach(p => p.draw(ctx));

      // Player
      drawPlayer(ctx);

      // Boss Health Bar
      if (isBossActive.current) {
        const boss = enemies.current.find(e => e.type === EnemyType.BOSS);
        if (boss) {
          const barWidth = GAME_WIDTH * 0.8;
          const barHeight = 10;
          const x = (GAME_WIDTH - barWidth) / 2;
          const y = 40;
          
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(x, y, barWidth, barHeight);
          
          const healthPercent = boss.health / boss.maxHealth;
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 16px Inter';
          ctx.textAlign = 'center';
          ctx.fillText('BOSS', GAME_WIDTH / 2, y - 10);
        }
      }
    };

    const drawPlayer = (ctx: CanvasRenderingContext2D) => {
      const { x, y } = playerPos.current;
      
      ctx.save();

      // Draw wingmen
      for (let i = 0; i < wingmenCount.current; i++) {
        const wx = i === 0 ? x - 40 : x + 40;
        const wy = y + 10;
        
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#818cf8';
        ctx.fillStyle = '#818cf8';
        ctx.beginPath();
        ctx.moveTo(wx, wy - 10);
        ctx.lineTo(wx - 8, wy + 8);
        ctx.lineTo(wx + 8, wy + 8);
        ctx.closePath();
        ctx.fill();
        
        // Wingman engine
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(wx - 3, wy + 8);
        ctx.lineTo(wx + 3, wy + 8);
        ctx.lineTo(wx, wy + 14);
        ctx.fill();
        ctx.restore();
      }

      // Draw health bar below player
      const barWidth = PLAYER_SIZE;
      const barHeight = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - barWidth / 2, y + PLAYER_SIZE / 2 + 10, barWidth, barHeight);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - barWidth / 2, y + PLAYER_SIZE / 2 + 10, barWidth * (playerHealth.current / maxHealth.current), barHeight);

      if (isInvincible.current) {
        // Pulsing transparency and glow when invincible
        const pulse = Math.sin(Date.now() / 50) * 0.5 + 0.5;
        ctx.globalAlpha = 0.4 + pulse * 0.6;
        ctx.shadowBlur = 15 + pulse * 15;
        ctx.shadowColor = '#00f2ff';
      }
      
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
        // Optimized Vector Ship Design
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00f2ff';
        
        // Main Body (more complex)
        ctx.fillStyle = '#00f2ff';
        ctx.beginPath();
        ctx.moveTo(x, y - PLAYER_SIZE / 2); // Nose
        ctx.lineTo(x - PLAYER_SIZE / 2, y + PLAYER_SIZE / 4); // Left wing tip
        ctx.lineTo(x - PLAYER_SIZE / 4, y + PLAYER_SIZE / 2); // Left engine
        ctx.lineTo(x + PLAYER_SIZE / 4, y + PLAYER_SIZE / 2); // Right engine
        ctx.lineTo(x + PLAYER_SIZE / 2, y + PLAYER_SIZE / 4); // Right wing tip
        ctx.closePath();
        ctx.fill();

        // Wings detail
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - PLAYER_SIZE / 4, y);
        ctx.lineTo(x - PLAYER_SIZE / 2, y + PLAYER_SIZE / 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + PLAYER_SIZE / 4, y);
        ctx.lineTo(x + PLAYER_SIZE / 2, y + PLAYER_SIZE / 4);
        ctx.stroke();

        // Cockpit (Glassy look)
        const cockpitGradient = ctx.createLinearGradient(x, y - 5, x, y + 10);
        cockpitGradient.addColorStop(0, '#ffffff');
        cockpitGradient.addColorStop(1, '#94a3b8');
        ctx.fillStyle = cockpitGradient;
        ctx.beginPath();
        ctx.ellipse(x, y + 2, PLAYER_SIZE / 6, PLAYER_SIZE / 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Engine Flames (Dual)
        const flamePulse = Math.sin(Date.now() / 50) * 5;
        ctx.fillStyle = '#f59e0b';
        
        // Left Engine
        ctx.beginPath();
        ctx.moveTo(x - 12, y + PLAYER_SIZE / 2);
        ctx.lineTo(x - 4, y + PLAYER_SIZE / 2);
        ctx.lineTo(x - 8, y + PLAYER_SIZE / 2 + 10 + flamePulse);
        ctx.fill();
        
        // Right Engine
        ctx.beginPath();
        ctx.moveTo(x + 4, y + PLAYER_SIZE / 2);
        ctx.lineTo(x + 12, y + PLAYER_SIZE / 2);
        ctx.lineTo(x + 8, y + PLAYER_SIZE / 2 + 10 + flamePulse);
        ctx.fill();
      }

      ctx.restore();
    };

    const createExplosion = (x: number, y: number, color: string) => {
      // More particles for a bigger explosion
      const count = 50;
      for (let i = 0; i < count; i++) {
        particles.current.push(new Particle(x, y, color));
      }
      // Add some white "flash" particles
      for (let i = 0; i < 20; i++) {
        const p = new Particle(x, y, '#ffffff');
        p.size *= 1.5;
        particles.current.push(p);
      }
    };

    const takeDamage = () => {
      playerHealth.current -= 1;
      statsRef.current.damageTaken += 1;
      statsRef.current.currentHealth = playerHealth.current;
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
      // If boss is active, don't level up until it's dead
      if (isBossActive.current) return;

      const currentLevel = statsRef.current.level;
      const nextLevelThreshold = 500 * Math.pow(currentLevel + 1, 2) + 500 * (currentLevel + 1) - 1000;
      
      if (statsRef.current.score >= nextLevelThreshold) {
        statsRef.current.level += 1;
        onLevelUp(statsRef.current.level);
        // Clear screen
        enemies.current = [];
        bullets.current = [];
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
