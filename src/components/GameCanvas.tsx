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
  shootSound: '/assets/shoot.mp3',
  explosionSound: '/assets/explosion.mp3',
  bgMusic: '/assets/background_music.mp3',
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

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D, image?: HTMLImageElement | null) {
    ctx.save();
    
    // Draw health bar for enemies with more than 1 HP
    if (this.maxHealth > 1) {
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
    
    // Health bar for tougher enemies
    if (this.maxHealth > 1) {
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
  const sounds = useRef<{ [key: string]: HTMLAudioElement }>({});

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
      } else if (src.endsWith('.mp3')) {
        const audio = new Audio();
        const onAudioLoad = () => {
          audio.removeEventListener('canplay', onAudioLoad);
          audio.removeEventListener('canplaythrough', onAudioLoad);
          checkLoaded();
        };
        audio.addEventListener('canplay', onAudioLoad);
        audio.addEventListener('canplaythrough', onAudioLoad);
        audio.onerror = () => {
          console.warn(`Failed to load audio: ${src}`);
          onAudioLoad();
        };
        audio.preload = 'auto';
        audio.src = src;
        if (key === 'bgMusic') {
          audio.loop = true;
          audio.volume = 0.4; // Increased volume slightly
        }
        audio.load();
        sounds.current[key] = audio;
      }
    });
  }, []);

  // Manage background music
  useEffect(() => {
    if (!assetsLoaded) return;
    const music = sounds.current['bgMusic'];
    if (!music) return;

    const playMusic = () => {
      if (gameState === GameState.PLAYING) {
        music.play().catch(() => {
          // Autoplay block - will retry on next interaction
        });
      } else {
        music.pause();
        music.currentTime = 0;
      }
    };

    playMusic();

    // Add global interaction listener to ensure music plays
    const handleInteraction = () => {
      if (gameState === GameState.PLAYING && music.paused) {
        music.play().catch(() => {});
      }
    };

    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [gameState, assetsLoaded]);

  const playSound = (key: string) => {
    const sound = sounds.current[key];
    if (sound) {
      const clone = sound.cloneNode() as HTMLAudioElement;
      clone.volume = 0.3;
      clone.play().catch(() => {
        // Ignore errors if audio can't play (e.g. user hasn't interacted yet)
      });
    }
  };

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
        const dx = pointerPos.current.x - playerPos.current.x;
        const dy = pointerPos.current.y - playerPos.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          playerPos.current.x += (dx / dist) * currentSpeed;
          playerPos.current.y += (dy / dist) * currentSpeed;
        }
      }

      // Bound Player
      playerPos.current.x = Math.max(PLAYER_SIZE / 2, Math.min(GAME_WIDTH - PLAYER_SIZE / 2, playerPos.current.x));
      playerPos.current.y = Math.max(PLAYER_SIZE / 2, Math.min(GAME_HEIGHT - PLAYER_SIZE / 2, playerPos.current.y));

      // Shooting
      const shouldShoot = keysPressed.current.has('Space') || isPointerDown.current;
      const shotInterval = Math.max(80, 150 - upgradeStats.current.fireRateBonus);
      if (shouldShoot && time - lastShotTime.current > shotInterval) {
        playSound('shootSound');
        const isTriple = time < tripleShotUntil.current;
        const damage = 1 + upgradeStats.current.damageBonus;
        if (isTriple) {
          bullets.current.push(new Bullet(playerPos.current.x, playerPos.current.y - 20, 0, -BULLET_SPEED, '#00f2ff', damage));
          bullets.current.push(new Bullet(playerPos.current.x - 10, playerPos.current.y - 15, -2, -BULLET_SPEED, '#00f2ff', damage));
          bullets.current.push(new Bullet(playerPos.current.x + 10, playerPos.current.y - 15, 2, -BULLET_SPEED, '#00f2ff', damage));
        } else {
          bullets.current.push(new Bullet(playerPos.current.x, playerPos.current.y - 20, 0, -BULLET_SPEED, '#00f2ff', damage));
        }
        lastShotTime.current = time;
      }

      // Spawning Enemies
      const spawnInterval = Math.max(500, 1500 - statsRef.current.level * 100);
      if (time - lastEnemySpawn.current > spawnInterval) {
        const types = [EnemyType.BASIC, EnemyType.BASIC, EnemyType.FAST];
        if (statsRef.current.level >= 3) types.push(EnemyType.HEAVY);
        if (statsRef.current.level >= 5) types.push(EnemyType.SHOOTER);
        const type = types[Math.floor(Math.random() * types.length)];
        enemies.current.push(new Enemy(Math.random() * (GAME_WIDTH - 40) + 20, -50, type, statsRef.current.level));
        lastEnemySpawn.current = time;
      }

      // Spawning Items
      if (time - lastItemSpawn.current > 15000) {
        const rand = Math.random();
        let type = ItemType.TRIPLE_SHOT;
        if (rand > 0.66) type = ItemType.SHIELD;
        else if (rand > 0.33) type = ItemType.MEDKIT;
        
        items.current.push(new Item(Math.random() * (GAME_WIDTH - 40) + 20, -50, type));
        lastItemSpawn.current = time;
      }

      // Update Stars
      stars.current.forEach(s => s.update());

      // Update Bullets
      bullets.current.forEach(b => b.update());
      bullets.current = bullets.current.filter(b => b.y > -20 && b.x > -20 && b.x < GAME_WIDTH + 20);

      // Update Enemies
      enemies.current.forEach(e => {
        e.update();
        // Shooter enemy shooting logic
        if (e.type === EnemyType.SHOOTER && time - e.lastShotTime > 1000) {
          bullets.current.push(new Bullet(e.x, e.y + e.size / 2, 0, 15, '#ef4444', 1, true));
          e.lastShotTime = time;
        }
      });
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
        if (b.isEnemy) return; // Player bullets only
        enemies.current.forEach((e, eIdx) => {
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.size / 2 + BULLET_SIZE) {
            e.health -= b.damage;
            bullets.current.splice(bIdx, 1);
            if (e.health <= 0) {
              playSound('explosionSound');
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
          } else if (item.type === ItemType.MEDKIT) {
            playerHealth.current = Math.min(playerHealth.current + 1, maxHealth.current);
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
    };

    const drawPlayer = (ctx: CanvasRenderingContext2D) => {
      const { x, y } = playerPos.current;
      
      ctx.save();

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
      // Level threshold scales: 
      // Level 2: 2000
      // Level 3: 5000 (2000 + 3000)
      // Level 4: 9000 (5000 + 4000)
      // Formula for total score to reach level L: 500*L^2 + 500*L - 1000
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
