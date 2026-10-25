import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PlantInstance, 
  PlantType, 
  ZombieInstance, 
  ZombieType, 
  ProjectileInstance, 
  SunInstance, 
  LawnMowerInstance, 
  FloatingText,
  ActiveQuizState,
  GameStats,
  Question,
  QuizRewardType,
  StudentProfile
} from '../types/game';
import { PLANT_CONFIGS, PlantCard } from './PlantCard';
import { 
  SunflowerSprite, 
  PeashooterSprite, 
  SnowPeaSprite, 
  WallnutSprite, 
  RepeaterSprite, 
  PotatoMineSprite, 
  CherryBombSprite, 
  ZombieSprite, 
  LawnmowerSprite, 
  SunSprite, 
  PeaSprite, 
  IcePeaSprite 
} from './Sprites';
import { sound } from '../utils/audio';
import { 
  Pause, 
  Play, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  HelpCircle, 
  Zap, 
  FileSpreadsheet, 
  Sparkles,
  LogOut,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Import aset gambar latar belakang taman agar terbaca dengan benar di GitHub Pages
import gardenLawnImg from '../assets/images/pvz_garden_lawn_1792131024837.jpg';

interface GameBoardProps {
  questions: Question[];
  level?: number;
  studentProfile?: StudentProfile | null;
  onOpenSpreadsheet: () => void;
  onGameOver: (stats: GameStats) => void;
  onVictory: (stats: GameStats) => void;
  onExit: () => void;
  onRequestSubmitResult?: (stats: GameStats) => void;
}

const ROWS = 5;
const COLS = 9;

interface LevelConfig {
  name: string;
  totalWaves: number;
  zombiesPerWave: number[];
  hpMultiplier: number;
  speedMultiplier: number;
  spawnIntervalBase: number;
}

const LEVEL_CONFIGS: Record<number, LevelConfig> = {
  1: {
    name: 'Level 1: Halaman Pemula',
    totalWaves: 3,
    zombiesPerWave: [5, 8, 12],
    hpMultiplier: 1.0,
    speedMultiplier: 1.0,
    spawnIntervalBase: 6500
  },
  2: {
    name: 'Level 2: Zombi Helm Kerucut',
    totalWaves: 3,
    zombiesPerWave: [8, 12, 16],
    hpMultiplier: 1.1,
    speedMultiplier: 1.05,
    spawnIntervalBase: 5800
  },
  3: {
    name: 'Level 3: Pasukan Zombi Ember',
    totalWaves: 3,
    zombiesPerWave: [10, 15, 20],
    hpMultiplier: 1.2,
    speedMultiplier: 1.1,
    spawnIntervalBase: 5200
  },
  4: {
    name: 'Level 4: Zombi Pelari Cepat',
    totalWaves: 4,
    zombiesPerWave: [12, 18, 24, 28],
    hpMultiplier: 1.3,
    speedMultiplier: 1.15,
    spawnIntervalBase: 4700
  },
  5: {
    name: 'Level 5: Pasukan Zombi Campuran',
    totalWaves: 4,
    zombiesPerWave: [14, 20, 26, 34],
    hpMultiplier: 1.45,
    speedMultiplier: 1.2,
    spawnIntervalBase: 4300
  },
  6: {
    name: 'Level 6: Zombi Lapis Baja Super',
    totalWaves: 4,
    zombiesPerWave: [16, 24, 32, 40],
    hpMultiplier: 1.6,
    speedMultiplier: 1.25,
    spawnIntervalBase: 3900
  },
  7: {
    name: 'Level 7: Serbuan Cepat Lapangan',
    totalWaves: 4,
    zombiesPerWave: [18, 26, 36, 44],
    hpMultiplier: 1.75,
    speedMultiplier: 1.3,
    spawnIntervalBase: 3600
  },
  8: {
    name: 'Level 8: Pasukan Zombi Elit',
    totalWaves: 5,
    zombiesPerWave: [18, 26, 36, 46, 54],
    hpMultiplier: 1.9,
    speedMultiplier: 1.35,
    spawnIntervalBase: 3300
  },
  9: {
    name: 'Level 9: Badai Zombi Brutal',
    totalWaves: 5,
    zombiesPerWave: [20, 30, 42, 54, 64],
    hpMultiplier: 2.1,
    speedMultiplier: 1.4,
    spawnIntervalBase: 3000
  },
  10: {
    name: 'Level 10: Bos Akbar Zombi Terakhir',
    totalWaves: 5,
    zombiesPerWave: [24, 36, 48, 62, 75],
    hpMultiplier: 2.4,
    speedMultiplier: 1.45,
    spawnIntervalBase: 2700
  }
};

export const GameBoard: React.FC<GameBoardProps> = ({
  questions,
  level = 1,
  studentProfile,
  onOpenSpreadsheet,
  onGameOver,
  onVictory,
  onExit,
  onRequestSubmitResult
}) => {
  const currentLevelConfig = LEVEL_CONFIGS[level] || LEVEL_CONFIGS[1];

  const [sun, setSun] = useState<number>(75);
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>('peashooter');
  const [isShovelActive, setIsShovelActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const totalQuestions = Math.max(1, questions.length);
  const [questionsAnsweredCount, setQuestionsAnsweredCount] = useState<number>(0);
  const [hasFinishedAllQuestions, setHasFinishedAllQuestions] = useState<boolean>(false);
  const currentQuestionIndexRef = useRef<number>(0);
  const hasFinishedAllQuestionsRef = useRef<boolean>(false);
  const hasAnnouncedFinishRef = useRef<boolean>(false);
  const lastAutoQuizPromptTimeRef = useRef<number>(Date.now());
  const gameStartTimeRef = useRef<number>(Date.now());

  const [currentWave, setCurrentWave] = useState<number>(1);
  const totalWaves = currentLevelConfig.totalWaves;
  const [waveProgress, setWaveProgress] = useState<number>(0);
  const [waveAnnouncement, setWaveAnnouncement] = useState<string | null>(null);

  const [cooldowns, setCooldowns] = useState<Record<PlantType, number>>({
    sunflower: 0,
    peashooter: 0,
    snowpea: 0,
    wallnut: 0,
    repeater: 0,
    potatomine: 0,
    cherrybomb: 0
  });

  const [plants, setPlants] = useState<PlantInstance[]>([]);
  const [zombies, setZombies] = useState<ZombieInstance[]>([]);
  const [projectiles, setProjectiles] = useState<ProjectileInstance[]>([]);
  const [suns, setSuns] = useState<SunInstance[]>([]);
  const [lawnMowers, setLawnMowers] = useState<LawnMowerInstance[]>([
    { row: 0, triggered: false, active: true, x: 0 },
    { row: 1, triggered: false, active: true, x: 0 },
    { row: 2, triggered: false, active: true, x: 0 },
    { row: 3, triggered: false, active: true, x: 0 },
    { row: 4, triggered: false, active: true, x: 0 },
  ]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const statsRef = useRef<GameStats>({
    zombiesKilled: 0,
    sunsCollected: 0,
    questionsAnswered: 0,
    questionsCorrect: 0,
    wave: 1,
    totalWaves: Math.max(currentLevelConfig.totalWaves, totalQuestions),
    level,
    totalQuestions
  });

  const [quizState, setQuizState] = useState<ActiveQuizState>({
    isOpen: false,
    question: null,
    options: [],
    selectedOption: null,
    isAnswered: false,
    isCorrect: null,
    rewardType: 'sun_boost',
    timeLeft: 15,
    totalTime: 15,
    source: 'user_boost',
    questionNumber: 1,
    totalQuestions
  });

  const plantsRef = useRef(plants);
  const zombiesRef = useRef(zombies);
  const projectilesRef = useRef(projectiles);
  const sunsRef = useRef(suns);
  const lawnMowersRef = useRef(lawnMowers);
  const sunRef = useRef(sun);
  const isPausedRef = useRef(isPaused);
  const quizOpenRef = useRef(quizState.isOpen);
  const gameSpeedRef = useRef(gameSpeed);
  const lastSkySunTimeRef = useRef<number>(Date.now());
  const lastZombieSpawnTimeRef = useRef<number>(Date.now());
  const zombiesSpawnedInWaveRef = useRef<number>(0);
  const currentWaveRef = useRef(currentWave);

  plantsRef.current = plants;
  zombiesRef.current = zombies;
  projectilesRef.current = projectiles;
  sunsRef.current = suns;
  lawnMowersRef.current = lawnMowers;
  sunRef.current = sun;
  isPausedRef.current = isPaused;
  quizOpenRef.current = quizState.isOpen;
  gameSpeedRef.current = gameSpeed;
  currentWaveRef.current = currentWave;
  statsRef.current.level = level;
  statsRef.current.totalQuestions = totalQuestions;

  const addFloatingText = useCallback((x: number, y: number, text: string, color = '#FACC15') => {
    setFloatingTexts(prev => [
      ...prev,
      { id: `ft-${Date.now()}-${Math.random()}`, x, y, text, color, createdAt: Date.now() }
    ]);
  }, []);

  const triggerQuiz = useCallback((source: 'user_boost' | 'sun_orb' | 'wave_alert', rewardType: QuizRewardType = 'sun_boost') => {
    if (questions.length === 0) return;
    const qIndex = currentQuestionIndexRef.current % questions.length;
    const targetQ = questions[qIndex];
    const options = [
      targetQ.correctAnswer,
      targetQ.distractor1,
      targetQ.distractor2,
      targetQ.distractor3,
    ].filter(Boolean);

    lastAutoQuizPromptTimeRef.current = Date.now();

    setQuizState({
      isOpen: true,
      question: targetQ,
      options,
      selectedOption: null,
      isAnswered: false,
      isCorrect: null,
      rewardType,
      timeLeft: 15,
      totalTime: 15,
      source,
      questionNumber: Math.min(statsRef.current.questionsAnswered + 1, totalQuestions),
      totalQuestions
    });
  }, [questions, totalQuestions]);

  const handleQuizAnswer = useCallback((_selectedOption: string, isCorrect: boolean) => {
    statsRef.current.questionsAnswered += 1;
    currentQuestionIndexRef.current += 1;
    const currentAnswered = statsRef.current.questionsAnswered;
    setQuestionsAnsweredCount(currentAnswered);
    lastAutoQuizPromptTimeRef.current = Date.now();

    if (currentAnswered >= totalQuestions) {
      hasFinishedAllQuestionsRef.current = true;
      setHasFinishedAllQuestions(true);
    }

    if (isCorrect) {
      statsRef.current.questionsCorrect += 1;

      if (quizState.rewardType === 'sun_boost') {
        setSun(s => s + 30);
        addFloatingText(50, 20, `+30 ☀️ BONUS! (Soal ${currentAnswered}/${totalQuestions})`, '#FACC15');
      } else if (quizState.rewardType === 'freeze_all') {
        const freezeDuration = 5500;
        setZombies(prev => prev.map(z => ({
          ...z,
          isFrozen: true,
          frozenUntil: Date.now() + freezeDuration
        })));
        addFloatingText(50, 30, `❄️ SEMUA ZOMBI MEMBEKU! (${currentAnswered}/${totalQuestions}) ❄️`, '#38BDF8');
      } else if (quizState.rewardType === 'plant_food') {
        const boostDuration = 7500;
        setPlants(prev => prev.map(p => ({
          ...p,
          boostedUntil: Date.now() + boostDuration
        })));
        addFloatingText(50, 30, `⚡ OVERDRIVE TUMBUHAN! (${currentAnswered}/${totalQuestions}) ⚡`, '#4ADE80');
      } else if (quizState.rewardType === 'cherry_bomb') {
        const rowCounts = [0, 0, 0, 0, 0];
        zombiesRef.current.forEach(z => {
          if (z.row >= 0 && z.row < 5) rowCounts[z.row]++;
        });
        const targetRow = rowCounts.indexOf(Math.max(...rowCounts));
        sound.playExplosion();
        setZombies(prev => prev.filter(z => z.row !== targetRow));
        addFloatingText(50, 30, `💥 BOM CERI BARIS ${targetRow + 1}! (${currentAnswered}/${totalQuestions}) 💥`, '#EF4444');
      }
    } else {
      addFloatingText(50, 30, `Jawaban Belum Tepat (${currentAnswered}/${totalQuestions} Soal)`, '#F87171');
    }

    setQuizState(prev => ({ ...prev, isOpen: false }));
  }, [quizState.rewardType, totalQuestions, addFloatingText]);

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleCollectSun = (id: string, value: number, x: number, y: number, isQuizSun = false) => {
    sound.playSunCollect();
    setSun(prev => prev + value);
    statsRef.current.sunsCollected += value;
    addFloatingText(x, y, `+${value}`, '#FEF08A');
    setSuns(prev => prev.filter(s => s.id !== id));

    if (isQuizSun) {
      setTimeout(() => {
        triggerQuiz('sun_orb', 'sun_boost');
      }, 200);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (isPaused || quizOpenRef.current || showExitConfirm) return;

    const existing = plants.find(p => p.row === row && p.col === col);

    if (isShovelActive) {
      if (existing) {
        sound.playPlant();
        setPlants(prev => prev.filter(p => p.id !== existing.id));
        addFloatingText((col + 0.5) * (100 / COLS), (row + 0.5) * (100 / ROWS), 'Digali!', '#E2E8F0');
        setIsShovelActive(false);
      }
      return;
    }

    if (!selectedPlant) return;
    const config = PLANT_CONFIGS[selectedPlant];
    if (sun < config.sunCost) return;
    if (existing) return;

    const now = Date.now();
    if (cooldowns[selectedPlant] > now) return;

    sound.playPlant();
    const newPlant: PlantInstance = {
      id: `p-${Date.now()}-${row}-${col}`,
      type: selectedPlant,
      row,
      col,
      hp: config.maxHp,
      maxHp: config.maxHp,
      createdAt: now,
      lastShotTime: now,
      isArmed: selectedPlant === 'potatomine' ? false : undefined,
      armedAt: selectedPlant === 'potatomine' ? now + 12000 : undefined,
      fuseEnd: selectedPlant === 'cherrybomb' ? now + 1200 : undefined
    };

    setPlants(prev => [...prev, newPlant]);
    setSun(prev => prev - config.sunCost);

    setCooldowns(prev => ({
      ...prev,
      [selectedPlant]: now + config.cooldownSeconds * 1000
    }));

    if (selectedPlant === 'cherrybomb') {
      setTimeout(() => {
        sound.playExplosion();
        setZombies(prev => prev.filter(z => {
          const zombieCol = Math.floor(z.x / (100 / COLS));
          const rowDiff = Math.abs(z.row - row);
          const colDiff = Math.abs(zombieCol - col);
          const inRadius = rowDiff <= 1 && colDiff <= 1.5;
          if (inRadius) {
            statsRef.current.zombiesKilled += 1;
            return false;
          }
          return true;
        }));
        setPlants(prev => prev.filter(p => p.id !== newPlant.id));
        addFloatingText((col + 0.5) * (100 / COLS), (row + 0.5) * (100 / ROWS), 'BOOM!!', '#EF4444');
      }, 1200);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quizOpenRef.current || showExitConfirm) return;
      if (e.key === '1') setSelectedPlant('sunflower');
      else if (e.key === '2') setSelectedPlant('peashooter');
      else if (e.key === '3') setSelectedPlant('snowpea');
      else if (e.key === '4') setSelectedPlant('wallnut');
      else if (e.key === '5') setSelectedPlant('repeater');
      else if (e.key === '6') setSelectedPlant('potatomine');
      else if (e.key === '7') setSelectedPlant('cherrybomb');
      else if (e.key.toLowerCase() === 's') setIsShovelActive(prev => !prev);
      else if (e.key === ' ') setIsPaused(prev => !prev);
      else if (e.key === 'Escape') setShowExitConfirm(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExitConfirm]);

  const spawnOneZombie = useCallback((now: number) => {
    const spawnRow = Math.floor(Math.random() * ROWS);

    let zType: ZombieType = 'regular';
    const roll = Math.random();

    if (level >= 5) {
      if (roll < 0.45) zType = 'buckethead';
      else if (roll < 0.75) zType = 'conehead';
      else if (roll < 0.90) zType = 'speedy';
      else zType = 'flag';
    } else if (level >= 4) {
      if (roll < 0.35) zType = 'buckethead';
      else if (roll < 0.65) zType = 'conehead';
      else if (roll < 0.85) zType = 'speedy';
    } else if (level >= 3) {
      if (roll < 0.25) zType = 'buckethead';
      else if (roll < 0.55) zType = 'conehead';
      else if (roll < 0.70) zType = 'speedy';
    } else if (level >= 2) {
      if (roll < 0.40) zType = 'conehead';
      else if (roll < 0.55) zType = 'speedy';
    } else {
      if (currentWaveRef.current >= 3 && roll < 0.25) zType = 'conehead';
    }

    const hpMult = currentLevelConfig.hpMultiplier;
    const spdMult = currentLevelConfig.speedMultiplier;

    let rawHp = 200;
    if (zType === 'buckethead') rawHp = 1000;
    else if (zType === 'conehead') rawHp = 560;
    else if (zType === 'speedy') rawHp = 260;
    else if (zType === 'flag') rawHp = 400;

    const baseHp = Math.round(rawHp * hpMult);
    const baseSpeed = (zType === 'speedy' ? 3.8 : 2.2) * spdMult;

    const newZombie: ZombieInstance = {
      id: `zombie-${now}-${Math.random()}`,
      type: zType,
      row: spawnRow,
      x: 98,
      hp: baseHp,
      maxHp: baseHp,
      speed: baseSpeed,
      isFrozen: false,
      frozenUntil: 0,
      eatingPlantId: null,
      hitFlashUntil: 0,
      walkCycle: 0
    };

    setZombies(prev => [...prev, newZombie]);
    if (Math.random() < 0.3) sound.playZombieGroan();
  }, [level, currentLevelConfig]);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05) * gameSpeedRef.current;
      lastTime = time;

      if (!isPausedRef.current && !quizOpenRef.current) {
        const now = Date.now();

        setFloatingTexts(prev => prev.filter(ft => now - ft.createdAt < 1200));

        const skySunInterval = 8500 / gameSpeedRef.current;
        if (now - lastSkySunTimeRef.current > skySunInterval) {
          lastSkySunTimeRef.current = now;
          const x = 15 + Math.random() * 70;
          const targetY = 20 + Math.random() * 60;
          const isQuizSun = Math.random() < 0.42;
          setSuns(prev => [
            ...prev,
            {
              id: `sun-sky-${now}`,
              x,
              y: 0,
              targetY,
              value: 15,
              createdAt: now,
              isQuizSun
            }
          ]);
        }

        setSuns(prev => prev.map(s => {
          if (s.y < s.targetY) {
            return { ...s, y: Math.min(s.y + dt * 25, s.targetY) };
          }
          return s;
        }));

        plantsRef.current.forEach(p => {
          if (p.type === 'sunflower') {
            const isBoosted = p.boostedUntil && p.boostedUntil > now;
            const productionInterval = isBoosted ? 5000 : 13000;
            if (now - p.lastShotTime > productionInterval) {
              p.lastShotTime = now;
              const cellX = (p.col + 0.5) * (100 / COLS);
              const cellY = (p.row + 0.5) * (100 / ROWS);
              setSuns(prev => [
                ...prev,
                {
                  id: `sun-flower-${now}-${p.id}`,
                  x: cellX + (Math.random() * 4 - 2),
                  y: cellY - 2,
                  targetY: cellY + 4,
                  value: 15,
                  createdAt: now
                }
              ]);
            }
          }
        });

        setPlants(prev => prev.map(p => {
          if (p.type === 'potatomine' && !p.isArmed && p.armedAt && now >= p.armedAt) {
            return { ...p, isArmed: true };
          }
          return p;
        }));

        plantsRef.current.forEach(p => {
          if (p.type === 'peashooter' || p.type === 'snowpea' || p.type === 'repeater') {
            const isBoosted = p.boostedUntil && p.boostedUntil > now;
            const shootInterval = isBoosted ? 380 : 1400;

            const plantX = (p.col + 0.7) * (100 / COLS);
            const hasZombieInLane = zombiesRef.current.some(z => z.row === p.row && z.x > plantX && z.x < 100);

            if (hasZombieInLane && now - p.lastShotTime > shootInterval) {
              p.lastShotTime = now;
              const isIce = p.type === 'snowpea';
              if (isIce) sound.playIceShoot();
              else sound.playShoot();

              const startX = plantX;
              const newProj: ProjectileInstance = {
                id: `proj-${now}-${Math.random()}`,
                row: p.row,
                x: startX,
                speed: 38,
                damage: 20,
                isIce
              };

              setProjectiles(prev => [...prev, newProj]);

              if (p.type === 'repeater') {
                setTimeout(() => {
                  sound.playShoot();
                  setProjectiles(prev => [
                    ...prev,
                    {
                      id: `proj-rep-${Date.now()}-${Math.random()}`,
                      row: p.row,
                      x: startX - 2,
                      speed: 38,
                      damage: 20,
                      isIce: false
                    }
                  ]);
                }, 150);
              }
            }
          }
        });

        setProjectiles(prevProjectiles => {
          const nextProjectiles: ProjectileInstance[] = [];

          prevProjectiles.forEach(proj => {
            const nextX = proj.x + proj.speed * dt;

            const hitZombie = zombiesRef.current.find(z => 
              z.row === proj.row && Math.abs(z.x - nextX) < 3.2
            );

            if (hitZombie) {
              sound.playSplat();
              setZombies(prevZombies => prevZombies.map(z => {
                if (z.id === hitZombie.id) {
                  const newHp = z.hp - proj.damage;
                  const isDead = newHp <= 0;
                  if (isDead) {
                    statsRef.current.zombiesKilled += 1;
                    if (Math.random() < 0.15) {
                      setSuns(prev => [
                        ...prev,
                        {
                          id: `sun-drop-${Date.now()}`,
                          x: z.x,
                          y: (z.row + 0.5) * (100 / ROWS),
                          targetY: (z.row + 0.7) * (100 / ROWS),
                          value: 15,
                          createdAt: Date.now()
                        }
                      ]);
                    }
                  }
                  return {
                    ...z,
                    hp: newHp,
                    isFrozen: proj.isIce ? true : z.isFrozen,
                    frozenUntil: proj.isIce ? Date.now() + 4000 : z.frozenUntil,
                    hitFlashUntil: Date.now() + 100
                  };
                }
                return z;
              }).filter(z => z.hp > 0));

              addFloatingText(hitZombie.x, (proj.row + 0.4) * (100 / ROWS), `-${proj.damage}`, proj.isIce ? '#38BDF8' : '#22C55E');
            } else if (nextX < 100) {
              nextProjectiles.push({ ...proj, x: nextX });
            }
          });

          return nextProjectiles;
        });

        // ========================================================
        // ATURAN UTAMA: LAMANYA PERMAINAN DITENTUKAN DARI BANYAKNYA SOAL
        // SELAMA SOAL BELUM SELESAI, ZOMBI AKAN TERUS BERDATANGAN!
        // ========================================================
        const isAllQuestionsAnswered = statsRef.current.questionsAnswered >= totalQuestions;
        const currentWaveZombies = currentLevelConfig.zombiesPerWave[Math.min(currentWaveRef.current - 1, currentLevelConfig.zombiesPerWave.length - 1)] || 12;
        const spawnInterval = Math.max(1600, currentLevelConfig.spawnIntervalBase - (currentWaveRef.current * 400)) / gameSpeedRef.current;

        // Auto-prompt kuis soal secara berkala jika siswa belum membuka soal (agar siswa selalu mendapat kesempatan menjawab)
        if (!isAllQuestionsAnswered && !quizOpenRef.current) {
          const autoPromptInterval = 24000 / gameSpeedRef.current;
          if (now - lastAutoQuizPromptTimeRef.current > autoPromptInterval) {
            triggerQuiz('wave_alert', currentWaveRef.current % 2 === 0 ? 'freeze_all' : 'sun_boost');
          }
        }

        if (!isAllQuestionsAnswered) {
          // KONDISI 1: SOAL BELUM SELESAI -> ZOMBI TERUS BERDATANGAN!
          if (zombiesSpawnedInWaveRef.current < currentWaveZombies) {
            if (now - lastZombieSpawnTimeRef.current > spawnInterval) {
              lastZombieSpawnTimeRef.current = now;
              zombiesSpawnedInWaveRef.current += 1;
              spawnOneZombie(now);
              setWaveProgress(Math.min(1, zombiesSpawnedInWaveRef.current / currentWaveZombies));
            }
          } else {
            // Kuota gelombang ini selesai, tapi soal MASIH ADA:
            // Jika zombi di kebun tinggal sedikit (<= 1) atau habis, langsung panggil gelombang zombi baru!
            if (zombiesRef.current.length <= 1) {
              const nextWave = currentWaveRef.current + 1;
              setCurrentWave(nextWave);
              currentWaveRef.current = nextWave;
              zombiesSpawnedInWaveRef.current = 0;
              setWaveProgress(0);
              setWaveAnnouncement(`⚠️ Soal Belum Selesai (${statsRef.current.questionsAnswered}/${totalQuestions})! Gelombang Zombi ${nextWave} Terus Berdatangan!`);
              setTimeout(() => setWaveAnnouncement(null), 2500);

              if (!quizOpenRef.current) {
                triggerQuiz('wave_alert', nextWave % 2 === 0 ? 'freeze_all' : 'sun_boost');
              }
            } else {
              // Jika zombi di lapangan masih ada, tetap tambahkan zombi berkala agar tekanan pertahanan berlanjut
              if (now - lastZombieSpawnTimeRef.current > spawnInterval * 1.5) {
                lastZombieSpawnTimeRef.current = now;
                spawnOneZombie(now);
              }
            }
          }
        } else {
          // KONDISI 2: SELURUH SOAL TELAH SELESAI DIKERJAKAN!
          // Pemain harus menumpas sisa zombi yang ada di lapangan untuk menang.
          if (!hasAnnouncedFinishRef.current) {
            hasAnnouncedFinishRef.current = true;
            sound.playPlant();
            confetti({ particleCount: 80, spread: 80 });
            setWaveAnnouncement('🎉 SEMUA SOAL SELESAI DIKERJAKAN! Tumpas sisa zombi untuk MENANG!');
            setTimeout(() => setWaveAnnouncement(null), 3500);
          }

          if (zombiesRef.current.length === 0) {
            sound.playVictory();
            confetti({ particleCount: 150, spread: 90 });
            statsRef.current.totalQuestions = totalQuestions;
            statsRef.current.wave = currentWaveRef.current;
            onVictory(statsRef.current);
          }
        }

        setZombies(prevZombies => {
          return prevZombies.map(z => {
            const isFrozen = z.isFrozen && now < z.frozenUntil;
            const effectiveSpeed = isFrozen ? z.speed * 0.5 : z.speed;

            const zombieCol = Math.floor((z.x - 2) / (100 / COLS));
            const plantOnCell = plantsRef.current.find(p => p.row === z.row && p.col === zombieCol);

            if (plantOnCell && plantOnCell.type === 'potatomine' && plantOnCell.isArmed) {
              sound.playExplosion();
              setPlants(p => p.filter(item => item.id !== plantOnCell.id));
              statsRef.current.zombiesKilled += 1;
              addFloatingText(z.x, (z.row + 0.5) * (100 / ROWS), '💥 SPUDOW!', '#EF4444');
              return { ...z, hp: 0 };
            }

            if (plantOnCell && plantOnCell.hp > 0) {
              const biteDmg = (isFrozen ? 25 : 45) * dt;
              setPlants(prevPlants => prevPlants.map(p => {
                if (p.id === plantOnCell.id) {
                  const newHp = p.hp - biteDmg;
                  if (newHp <= 0) {
                    addFloatingText((p.col + 0.5) * (100 / COLS), (p.row + 0.5) * (100 / ROWS), 'Dimakan!', '#EF4444');
                  }
                  return { ...p, hp: newHp };
                }
                return p;
              }).filter(p => p.hp > 0));

              if (Math.random() < 0.1) sound.playChomp();

              return {
                ...z,
                eatingPlantId: plantOnCell.id,
                walkCycle: z.walkCycle + 0.5
              };
            }

            const nextX = z.x - effectiveSpeed * dt;

            const mower = lawnMowersRef.current.find(m => m.row === z.row);
            if (nextX <= 7 && mower && mower.active && !mower.triggered) {
              sound.playLawnMower();
              setLawnMowers(mList => mList.map(m => m.row === z.row ? { ...m, triggered: true } : m));
              addFloatingText(8, (z.row + 0.5) * (100 / ROWS), '🚜 PEMOTONG RUMPUT AKTIF!', '#EF4444');
            }

            if (nextX <= -2) {
              sound.playGameOver();
              onGameOver(statsRef.current);
            }

            return {
              ...z,
              x: nextX,
              eatingPlantId: null,
              walkCycle: z.walkCycle + 1
            };
          }).filter(z => z.hp > 0);
        });

        setLawnMowers(prevMowers => {
          return prevMowers.map(m => {
            if (m.triggered && m.active) {
              const nextX = m.x + dt * 65;
              setZombies(prevZ => prevZ.filter(z => {
                if (z.row === m.row && z.x <= nextX + 8) {
                  statsRef.current.zombiesKilled += 1;
                  return false;
                }
                return true;
              }));

              if (nextX >= 105) {
                return { ...m, active: false, triggered: false };
              }
              return { ...m, x: nextX };
            }
            return m;
          });
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameSpeed, level, currentLevelConfig, triggerQuiz, onVictory, onGameOver, addFloatingText, spawnOneZombie, totalQuestions]);

  return (
    <div className="relative w-full h-full flex flex-col bg-stone-950 select-none overflow-hidden">

      {/* TOP HUD BAR */}
      <header className="w-full bg-stone-900/95 border-b border-amber-900/60 px-3 py-2 flex items-center justify-between gap-3 shadow-md z-20 shrink-0">
        
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1 scrollbar-none">
          
          <div className="flex items-center gap-2 bg-amber-950/80 border-2 border-amber-600/80 rounded-xl px-2.5 py-1 shadow-inner shrink-0">
            <SunSprite size={24} />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-amber-300/80 tracking-wider">Matahari</span>
              <span className="text-base sm:text-lg font-black font-mono text-amber-300 leading-none tabular-nums">
                {sun}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {(['sunflower', 'peashooter', 'snowpea', 'wallnut', 'repeater', 'potatomine', 'cherrybomb'] as PlantType[]).map((type) => {
              const readyTime = cooldowns[type] || 0;
              const config = PLANT_CONFIGS[type];
              const remaining = Math.max(0, readyTime - Date.now());
              const progress = remaining / (config.cooldownSeconds * 1000);

              return (
                <PlantCard
                  key={type}
                  type={type}
                  currentSun={sun}
                  isSelected={selectedPlant === type && !isShovelActive}
                  cooldownProgress={progress}
                  onSelect={(t) => {
                    setSelectedPlant(t);
                    setIsShovelActive(false);
                  }}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsShovelActive(prev => !prev);
              setSelectedPlant(null);
            }}
            title="Sekop [S]: Gali dan bersihkan tanaman"
            className={`flex flex-col items-center justify-center w-12 h-18 sm:w-14 sm:h-20 rounded-lg border-2 p-1 transition-all shrink-0 ${
              isShovelActive
                ? 'border-red-400 bg-red-950/90 ring-2 ring-red-400 scale-105'
                : 'border-stone-700 bg-stone-900/90 hover:bg-stone-800 text-stone-300'
            }`}
          >
            <span className="text-lg">🪓</span>
            <span className="text-[9px] font-bold text-stone-200">Sekop (S)</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {studentProfile && (
            <div className="hidden md:flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-600/70 rounded-xl px-2.5 py-1 text-xs text-emerald-300">
              <span className="font-semibold">{studentProfile.name}</span>
              <span className="font-mono text-amber-300 font-bold">({studentProfile.token})</span>
            </div>
          )}

          <div 
            title={currentLevelConfig.name}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/90 border border-amber-500/70 rounded-xl text-xs font-bold text-amber-300 shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Level {level}/10</span>
          </div>

          {/* Question Counter in HUD */}
          <div 
            title={`Soal Terjawab: ${questionsAnsweredCount} dari ${totalQuestions}. Zombi akan terus berdatangan sampai seluruh soal selesai!`}
            className="flex items-center gap-1.5 sm:gap-2 bg-stone-950/90 border border-emerald-500/60 rounded-xl px-2.5 py-1 text-xs shadow-inner"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-400">Soal:</span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              {questionsAnsweredCount}/{totalQuestions}
            </span>
            <div className="w-10 sm:w-16 h-2 bg-stone-800 rounded-full overflow-hidden border border-stone-700 hidden sm:block">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (questionsAnsweredCount / totalQuestions) * 100)}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => triggerQuiz('user_boost', 'sun_boost')}
            disabled={hasFinishedAllQuestions}
            title={hasFinishedAllQuestions ? 'Semua soal telah selesai dikerjakan!' : 'Buka Soal Kuis: Jawab untuk bonus +30 Matahari & selesaikan seluruh soal untuk menang!'}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-stone-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer ${
              hasFinishedAllQuestions
                ? 'bg-emerald-600/70 text-emerald-100 cursor-default shadow-none'
                : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 shadow-amber-500/20 animate-pulse'
            }`}
          >
            <Zap className="w-4 h-4 fill-stone-950" />
            <span className="hidden sm:inline">
              {hasFinishedAllQuestions 
                ? '✅ Semua Soal Selesai' 
                : `Kuis Soal (${questionsAnsweredCount}/${totalQuestions})`}
            </span>
            <span className="sm:hidden">
              {hasFinishedAllQuestions ? '✅ Selesai' : `Soal (${questionsAnsweredCount}/${totalQuestions})`}
            </span>
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh (Exit Fullscreen)' : 'Layar Penuh (Fullscreen)'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg border border-stone-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}</span>
          </button>

          <button
            type="button"
            onClick={() => setGameSpeed(s => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
            title="Kecepatan Game"
            className="px-2 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono font-bold rounded-lg border border-stone-700"
          >
            {gameSpeed}x
          </button>

          <button
            type="button"
            onClick={handleToggleSound}
            title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
            className="p-1.5 sm:p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-700 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => setIsPaused(prev => !prev)}
            title="Jeda / Lanjut (Spasi)"
            className="p-1.5 sm:p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-700 transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            title="Berhenti Bermain & Keluar ke Menu (Esc)"
            className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden lg:inline">Keluar</span>
          </button>
        </div>

      </header>

      {/* LAWN PLAYFIELD CONTAINER */}
      <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center p-2 sm:p-4 bg-stone-900">
        
        <div 
          className="relative w-full max-w-6xl aspect-[16/9] max-h-[85vh] rounded-2xl overflow-hidden border-4 border-amber-950 shadow-2xl select-none"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.2)), url(${gardenLawnImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Top In-Game Target Soal & Zombie Warning Strip */}
          <div className="absolute top-2 left-2 right-2 sm:left-4 sm:right-4 flex items-center justify-between pointer-events-none z-30 text-[10px] sm:text-xs font-bold gap-2">
            <div className="bg-stone-950/85 backdrop-blur-md border border-emerald-500/60 rounded-xl px-2.5 sm:px-3 py-1 flex items-center gap-2 text-stone-200 shadow-lg">
              <span className="text-emerald-400 uppercase tracking-wider text-[9px] sm:text-[10px]">Target Soal:</span>
              <span className="font-mono text-amber-300 font-extrabold">{questionsAnsweredCount} / {totalQuestions}</span>
              <div className="w-12 sm:w-20 h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (questionsAnsweredCount / totalQuestions) * 100)}%` }}
                />
              </div>
              <span className="text-stone-400 font-mono text-[9px] sm:text-[10px]">
                ({Math.round(Math.min(100, (questionsAnsweredCount / totalQuestions) * 100))}%)
              </span>
            </div>

            {!hasFinishedAllQuestions ? (
              <div className="bg-amber-950/90 backdrop-blur-md border border-amber-600/70 rounded-xl px-2.5 sm:px-3 py-1 text-amber-300 shadow-lg flex items-center gap-1.5 animate-pulse">
                <span>🧟 Zombi terus datang sampai {totalQuestions - questionsAnsweredCount} soal lagi selesai!</span>
              </div>
            ) : (
              <div className="bg-emerald-950/95 backdrop-blur-md border border-emerald-500/80 rounded-xl px-2.5 sm:px-3 py-1 text-emerald-300 shadow-lg flex items-center gap-1.5 font-bold">
                <span>⭐ Semua {totalQuestions} soal selesai! Tumpas sisa zombi untuk menang!</span>
              </div>
            )}
          </div>

          <div className="absolute inset-0 grid grid-rows-5 grid-cols-9">
            {Array.from({ length: ROWS }).map((_, r) =>
              Array.from({ length: COLS }).map((_, c) => {
                const isHovered = hoveredCell?.row === r && hoveredCell?.col === c;
                const hasPlant = plants.some(p => p.row === r && p.col === c);
                const isChecker = (r + c) % 2 === 0;

                return (
                  <div
                    key={`${r}-${c}`}
                    onMouseEnter={() => setHoveredCell({ row: r, col: c })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleCellClick(r, c)}
                    className={`relative w-full h-full border border-black/10 cursor-pointer transition-colors ${
                      isChecker ? 'bg-emerald-700/25' : 'bg-emerald-600/15'
                    } ${isHovered && !hasPlant && selectedPlant ? 'bg-yellow-400/25 ring-2 ring-yellow-400/50' : ''} ${
                      isHovered && isShovelActive && hasPlant ? 'bg-red-500/35 ring-2 ring-red-400' : ''
                    }`}
                  >
                    {isHovered && !hasPlant && selectedPlant && !isShovelActive && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-45 pointer-events-none scale-90">
                        {selectedPlant === 'sunflower' && <SunflowerSprite size={48} />}
                        {selectedPlant === 'peashooter' && <PeashooterSprite size={48} />}
                        {selectedPlant === 'snowpea' && <SnowPeaSprite size={48} />}
                        {selectedPlant === 'wallnut' && <WallnutSprite size={48} />}
                        {selectedPlant === 'repeater' && <RepeaterSprite size={48} />}
                        {selectedPlant === 'potatomine' && <PotatoMineSprite size={48} isArmed={true} />}
                        {selectedPlant === 'cherrybomb' && <CherryBombSprite size={48} />}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {lawnMowers.map(m => {
            if (!m.active && !m.triggered) return null;
            const topPercent = (m.row + 0.1) * (100 / ROWS);
            const leftPercent = m.triggered ? m.x : 0.5;

            return (
              <div
                key={`mower-${m.row}`}
                className="absolute transition-transform pointer-events-none z-10"
                style={{
                  top: `${topPercent}%`,
                  left: `${leftPercent}%`,
                  width: `${100 / COLS * 0.8}%`,
                  height: `${100 / ROWS * 0.8}%`,
                }}
              >
                <LawnmowerSprite isSpinning={m.triggered} size={50} />
              </div>
            );
          })}

          {plants.map(p => {
            const leftPercent = (p.col / COLS) * 100;
            const topPercent = (p.row / ROWS) * 100;
            const cellW = 100 / COLS;
            const cellH = 100 / ROWS;
            const hpPercent = (p.hp / p.maxHp) * 100;
            const isBoosted = Boolean(p.boostedUntil && p.boostedUntil > Date.now());

            return (
              <div
                key={p.id}
                onClick={() => handleCellClick(p.row, p.col)}
                className="absolute flex items-center justify-center z-10 pointer-events-auto cursor-pointer transition-transform duration-100"
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  width: `${cellW}%`,
                  height: `${cellH}%`
                }}
              >
                {isBoosted && (
                  <div className="absolute inset-2 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
                )}

                {hpPercent < 90 && (
                  <div className="absolute top-1 left-2 right-2 h-1 bg-stone-950/80 rounded-full overflow-hidden pointer-events-none z-20">
                    <div
                      className={`h-full ${hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                )}

                {p.type === 'sunflower' && <SunflowerSprite size={58} isBoosted={isBoosted} />}
                {p.type === 'peashooter' && <PeashooterSprite size={58} isBoosted={isBoosted} />}
                {p.type === 'snowpea' && <SnowPeaSprite size={58} />}
                {p.type === 'wallnut' && <WallnutSprite size={58} hpPercent={hpPercent} />}
                {p.type === 'repeater' && <RepeaterSprite size={58} />}
                {p.type === 'potatomine' && <PotatoMineSprite size={58} isArmed={p.isArmed} />}
                {p.type === 'cherrybomb' && <CherryBombSprite size={64} isExploding={true} />}
              </div>
            );
          })}

          {projectiles.map(pr => {
            const topPercent = (pr.row + 0.38) * (100 / ROWS);
            return (
              <div
                key={pr.id}
                className="absolute pointer-events-none z-15"
                style={{
                  top: `${topPercent}%`,
                  left: `${pr.x}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {pr.isIce ? <IcePeaSprite size={20} /> : <PeaSprite size={20} />}
              </div>
            );
          })}

          {zombies.map(z => {
            const topPercent = (z.row + 0.05) * (100 / ROWS);
            const isHit = Date.now() < z.hitFlashUntil;
            const hpPercent = (z.hp / z.maxHp) * 100;

            return (
              <div
                key={z.id}
                className="absolute pointer-events-none z-15 transition-transform"
                style={{
                  top: `${topPercent}%`,
                  left: `${z.x}%`,
                  width: `${100 / COLS * 1.1}%`,
                  height: `${100 / ROWS * 1.1}%`,
                  transform: 'translate(-50%, 0)'
                }}
              >
                {hpPercent < 100 && (
                  <div className="absolute top-0 left-3 right-3 h-1 bg-stone-950/80 rounded-full overflow-hidden z-20">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                )}

                <ZombieSprite
                  type={z.type}
                  size={68}
                  isFrozen={z.isFrozen && Date.now() < z.frozenUntil}
                  isHit={isHit}
                  walkCycle={z.walkCycle}
                />
              </div>
            );
          })}

          {suns.map(s => (
            <div
              key={s.id}
              onClick={(e) => {
                e.stopPropagation();
                handleCollectSun(s.id, s.value, s.x, s.y, s.isQuizSun);
              }}
              className="absolute z-30 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              style={{
                top: `${s.y}%`,
                left: `${s.x}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="relative">
                <SunSprite size={48} />
                {s.isQuizSun && (
                  <div className="absolute -top-1 -right-1 bg-emerald-600 border border-emerald-300 text-white rounded-full p-1 shadow-md animate-bounce">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {floatingTexts.map(ft => (
            <div
              key={ft.id}
              className="absolute pointer-events-none font-black text-sm drop-shadow-md z-40 animate-out fade-out slide-out-to-top duration-1000"
              style={{
                top: `${ft.y}%`,
                left: `${ft.x}%`,
                color: ft.color,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {ft.text}
            </div>
          ))}

          {waveAnnouncement && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none z-40 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="bg-stone-900/90 border-2 border-amber-500/80 rounded-full px-5 py-1.5 shadow-2xl backdrop-blur-md flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider drop-shadow">
                  {waveAnnouncement}
                </span>
              </div>
            </div>
          )}

          {isPaused && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6 text-center space-y-4">
              <h2 className="text-3xl font-black text-amber-300">Permainan Dijeda</h2>
              <p className="text-sm text-stone-300 max-w-md">
                Tekan spasi atau tombol Lanjut untuk melanjutkan pertahanan kebun melawan zombi di {currentLevelConfig.name}.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaused(false)}
                  className="px-6 py-2.5 font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Lanjut Main
                </button>
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(true)}
                  className="px-5 py-2.5 font-semibold text-sm bg-stone-800 hover:bg-stone-700 text-red-300 rounded-xl border border-stone-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar ke Menu
                </button>
              </div>
            </div>
          )}

          {showExitConfirm && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-center animate-in zoom-in-95 duration-150">
              <div className="w-full max-w-md bg-stone-900 border-2 border-red-600/80 rounded-3xl p-6 shadow-2xl space-y-5 text-stone-100">
                <div className="w-14 h-14 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-red-400 mx-auto">
                  <LogOut className="w-7 h-7" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-red-400">
                    Berhenti Bermain?
                  </h3>
                  <p className="text-xs text-stone-300">
                    Apakah kamu ingin berhenti dari <b>{currentLevelConfig.name}</b>?
                  </p>
                </div>

                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Zombi</span>
                    <span className="font-mono font-bold text-amber-300">{statsRef.current.zombiesKilled}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Matahari</span>
                    <span className="font-mono font-bold text-yellow-300">{statsRef.current.sunsCollected}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Kuis Benar</span>
                    <span className="font-mono font-bold text-emerald-400">{statsRef.current.questionsCorrect}/{statsRef.current.questionsAnswered}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-stone-950 rounded-xl transition-colors cursor-pointer"
                  >
                    Lanjutkan Permainan
                  </button>

                  {onRequestSubmitResult && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowExitConfirm(false);
                        onRequestSubmitResult(statsRef.current);
                      }}
                      className="w-full py-2.5 text-xs font-bold bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-600/50 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Kirim Hasil Saat Ini ke Guru & Keluar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowExitConfirm(false);
                      onExit();
                    }}
                    className="w-full py-2 text-xs font-semibold text-stone-400 hover:text-red-400 transition-colors"
                  >
                    Keluar Tanpa Kirim Hasil
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {quizState.isOpen && (
        <QuizModalOverlay
          quizState={quizState}
          onAnswer={handleQuizAnswer}
          onClose={() => setQuizState(prev => ({ ...prev, isOpen: false }))}
        />
      )}

    </div>
  );
};

import { QuizModal as QuizModalOverlay } from './QuizModal';
