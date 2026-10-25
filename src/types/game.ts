export interface Question {
  id: string;
  question: string;       // Kolom A
  correctAnswer: string;  // Kolom B
  distractor1: string;    // Kolom C
  distractor2: string;    // Kolom D
  distractor3: string;    // Kolom E
  category?: string;
}

export type PlantType = 
  | 'sunflower'
  | 'peashooter'
  | 'snowpea'
  | 'wallnut'
  | 'repeater'
  | 'potatomine'
  | 'cherrybomb';

export interface PlantConfig {
  type: PlantType;
  name: string;
  sunCost: number;
  cooldownSeconds: number;
  maxHp: number;
  description: string;
  keyboardKey: string;
}

export interface PlantInstance {
  id: string;
  type: PlantType;
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  createdAt: number;
  lastShotTime: number;
  boostedUntil?: number;
  // Specific to Potato Mine
  isArmed?: boolean;
  armedAt?: number;
  // Specific to Cherry Bomb
  fuseEnd?: number;
}

export type ZombieType = 'regular' | 'conehead' | 'buckethead' | 'flag' | 'speedy';

export interface ZombieInstance {
  id: string;
  type: ZombieType;
  row: number;
  x: number; // percentage from 0 (left edge / lawnmowers) to 100 (right spawn)
  hp: number;
  maxHp: number;
  speed: number;
  isFrozen: boolean;
  frozenUntil: number;
  eatingPlantId: string | null;
  hitFlashUntil: number;
  walkCycle: number;
}

export interface ProjectileInstance {
  id: string;
  row: number;
  x: number;
  damage: number;
  isIce: boolean;
  speed: number;
}

export interface SunInstance {
  id: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  targetY: number;
  value: number;
  createdAt: number;
  isQuizSun?: boolean;
}

export interface LawnMowerInstance {
  row: number;
  triggered: boolean;
  active: boolean;
  x: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
}

export type QuizRewardType = 'sun_boost' | 'freeze_all' | 'plant_food' | 'cherry_bomb';

export interface ActiveQuizState {
  isOpen: boolean;
  question: Question | null;
  options: string[];
  selectedOption: string | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  rewardType: QuizRewardType;
  timeLeft: number;
  totalTime: number;
  source: 'user_boost' | 'sun_orb' | 'wave_alert';
  questionNumber?: number;
  totalQuestions?: number;
}

export interface GameStats {
  zombiesKilled: number;
  sunsCollected: number;
  questionsAnswered: number;
  questionsCorrect: number;
  wave: number;
  totalWaves: number;
  level: number;
  totalQuestions?: number;
}

export interface StudentProfile {
  name: string;
  token: string;
}

export interface StudentSubmission {
  id: string;
  studentName: string;
  token: string;
  quizTitle: string;
  zombiesKilled: number;
  sunsCollected: number;
  questionsAnswered: number;
  questionsCorrect: number;
  accuracy: number;
  gameOutcome: 'victory' | 'game_over';
  waveReached: number;
  level: number;
  timestamp: number;
}

export interface TeacherTokenPackage {
  token: string;
  title: string;
  spreadsheetUrl: string;
  questions: Question[];
  createdAt: number;
}

export type GameScreen = 'TITLE' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER' | 'STUDENT_LOGIN' | 'TEACHER_PORTAL';

export type GameDifficulty = 'easy' | 'normal' | 'hard';

