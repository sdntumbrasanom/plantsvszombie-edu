/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameScreen, GameStats, Question, StudentProfile, TeacherTokenPackage, StudentSubmission } from './types/game'; // <-- TAMBAHAN StudentSubmission
import { GameBoard } from './components/GameBoard';
import { SpreadsheetModal } from './components/SpreadsheetModal';
import { StudentLoginModal } from './components/StudentLoginModal';
import { TeacherPortalModal } from './components/TeacherPortalModal';
import { SubmitResultModal } from './components/SubmitResultModal';
import { AchievementSystem } from './components/AchievementSystem';
import { StudentLeaderboard } from './components/StudentLeaderboard';
import { getSavedQuestions, saveQuestions } from './utils/spreadsheetParser';
import { saveStudentSubmission, saveGasApiUrl } from './utils/teacherStorage'; // <-- TAMBAHAN AUTO-SAVE & GAS IMPORT
import { sound } from './utils/audio';

// Import aset gambar agar otomatis terdeteksi dengan benar oleh Vite / GitHub Pages
import titleBannerImg from './assets/images/pvz_title_banner_1792131025537.jpg';
import gardenLawnImg from './assets/images/pvz_garden_lawn_1792131024837.jpg';

import { 
  Play, 
  Trophy, 
  Skull, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Send,
  GraduationCap,
  Sparkles,
  User,
  LogOut,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [questions, setQuestions] = useState<Question[]>(() => getSavedQuestions());
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [activeTokenPkg, setActiveTokenPkg] = useState<TeacherTokenPackage | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  const [urlToken, setUrlToken] = useState<string>('');

  // Handle URL query parameters (?token=...&db=...) for zero-friction student access across devices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      try {
        const params = new URLSearchParams(window.location.search);
        const tok = params.get('token');
        const db = params.get('db') || params.get('api');
        if (db && db.startsWith('https://script.google.com/')) {
          saveGasApiUrl(db);
        }
        if (tok && tok.trim()) {
          const cleanTok = tok.trim().toUpperCase();
          setUrlToken(cleanTok);
          // Buka modal login siswa otomatis jika ada token di URL
          setIsStudentLoginOpen(true);
        }
      } catch (err) {
        console.warn('Gagal membaca parameter URL:', err);
      }
    }
  }, []);

  // Sync fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Modals state
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState<boolean>(false);
  const [isStudentLoginOpen, setIsStudentLoginOpen] = useState<boolean>(false);
  const [isTeacherPortalOpen, setIsTeacherPortalOpen] = useState<boolean>(false);
  const [isSubmitResultOpen, setIsSubmitResultOpen] = useState<boolean>(false);

  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [gameStats, setGameStats] = useState<GameStats>({
    zombiesKilled: 0,
    sunsCollected: 0,
    questionsAnswered: 0,
    questionsCorrect: 0,
    wave: 1,
    totalWaves: 3,
    level: 1
  });

  const handleUpdateQuestions = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    saveQuestions(newQuestions);
  };

  const handleStartGame = (lvl = selectedLevel) => {
    setSelectedLevel(lvl);
    const qCount = Math.max(1, questions.length);
    setGameStats({
      zombiesKilled: 0,
      sunsCollected: 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
      wave: 1,
      totalWaves: qCount,
      level: lvl,
      totalQuestions: qCount
    });
    setScreen('PLAYING');
  };

  const handleGameOver = (stats: GameStats) => {
    setGameStats(stats);
    setScreen('GAME_OVER');
  };

  const handleVictory = (stats: GameStats) => {
    setGameStats(stats);
    setScreen('VICTORY');
    confetti({ particleCount: 130, spread: 90 });
  };

  // ==========================================
  // AUTO-SAVE NILAI SAAT GAME BERAKHIR
  // ==========================================
  useEffect(() => {
    if (screen === 'VICTORY' || screen === 'GAME_OVER') {
      // Pastikan siswa sudah login dan tokennya valid
      if (studentProfile && activeTokenPkg) {
        const accuracy = gameStats.questionsAnswered > 0 
          ? Math.round((gameStats.questionsCorrect / gameStats.questionsAnswered) * 100) 
          : 0;

        const autoSubmission: StudentSubmission = {
          id: `sub-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentName: studentProfile.name,
          token: activeTokenPkg.token,
          quizTitle: activeTokenPkg.title || 'Kuis PvZ Edukasi',
          zombiesKilled: gameStats.zombiesKilled,
          sunsCollected: gameStats.sunsCollected,
          questionsAnswered: gameStats.questionsAnswered,
          questionsCorrect: gameStats.questionsCorrect,
          accuracy: accuracy,
          gameOutcome: screen === 'VICTORY' ? 'victory' : 'game_over',
          waveReached: gameStats.wave,
          level: gameStats.level || selectedLevel,
          timestamp: Date.now()
        };

        // Simpan otomatis ke localStorage agar Leaderboard langsung terisi
        saveStudentSubmission(autoSubmission);
      }
    }
  }, [screen, studentProfile, activeTokenPkg, gameStats, selectedLevel]);

  // Student login success with chosen level
  const handleStudentLoginSuccess = (profile: StudentProfile, tokenPkg: TeacherTokenPackage, lvl?: number) => {
    setStudentProfile(profile);
    setActiveTokenPkg(tokenPkg);
    setQuestions(tokenPkg.questions);
    const targetLvl = lvl || selectedLevel;
    handleStartGame(targetLvl);
  };

  // Teacher selecting token to play/test
  const handleTeacherSelectTokenForPlay = (pkg: TeacherTokenPackage) => {
    setActiveTokenPkg(pkg);
    setQuestions(pkg.questions);
    setStudentProfile({
      name: 'Guru (Uji Coba)',
      token: pkg.token
    });
    handleStartGame(selectedLevel);
  };

  // Keyboard shortcut on Title Screen: Space or Enter to open student login
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const anyModalOpen = isSpreadsheetOpen || isStudentLoginOpen || isTeacherPortalOpen || isSubmitResultOpen;
      if (screen === 'TITLE' && !anyModalOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsStudentLoginOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, isSpreadsheetOpen, isStudentLoginOpen, isTeacherPortalOpen, isSubmitResultOpen]);

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <main className="w-screen h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none overflow-hidden">

      {/* 1. TITLE SCREEN */}
      {screen === 'TITLE' && (
        <div 
          className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-8 overflow-y-auto"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.7), rgba(12,10,9,0.9)), url(${titleBannerImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Top Bar on Title Screen with Zoom Controls */}
          <div className="w-full flex items-center justify-between gap-3 z-10 shrink-0">
            {/* Student status badge if logged in */}
            {studentProfile ? (
              <div className="flex items-center gap-2 bg-emerald-950/90 border border-emerald-600/70 rounded-full px-3.5 py-1 text-xs text-emerald-300">
                <User className="w-3.5 h-3.5" />
                <span className="font-semibold">{studentProfile.name}</span>
                <span className="font-mono text-amber-300">({studentProfile.token})</span>
                <button
                  onClick={() => {
                    setStudentProfile(null);
                    setActiveTokenPkg(null);
                  }}
                  title="Ganti Akun Siswa"
                  className="ml-1 text-stone-400 hover:text-white"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : <div />}

            <div className="flex items-center gap-2">
              {/* Tombol Fullscreen / Exit Fullscreen */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                title={isFullscreen ? 'Keluar Layar Penuh (Exit Fullscreen)' : 'Layar Penuh (Fullscreen)'}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-stone-900/90 hover:bg-stone-800 border border-stone-700 text-xs font-bold text-stone-200 hover:text-white flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
                <span className="hidden sm:inline">{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}</span>
              </button>

              {/* Portal Guru Quick Link */}
              <button
                type="button"
                onClick={() => setIsTeacherPortalOpen(true)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/60 text-xs font-bold text-emerald-300 flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Portal Guru</span>
                <span className="sm:hidden">Guru</span>
              </button>

              <button
                type="button"
                onClick={toggleSound}
                className="p-2 rounded-full bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Center Title Lockup */}
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-4xl z-10 my-auto py-4 px-2">
            <div className="space-y-2.5 flex flex-col items-center w-full">
              <span className="text-xs tracking-wide text-amber-400 font-bold bg-amber-950/80 px-3.5 py-1 rounded-full border border-amber-600/40">
  Developed By Misbahul Munir
</span>
              <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 drop-shadow-2xl tracking-tight whitespace-nowrap">
                PLANTS VS ZOMBIES
              </h1>
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-2 text-xs sm:text-sm md:text-base font-black tracking-widest uppercase text-yellow-300 drop-shadow-md px-4 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/60 shadow-lg shadow-emerald-950/50">
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                  FUN GAME EDUKASI
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                </span>
              </div>
            </div>

            {/* Tombol Kuning Besar: Mulai Permainan */}
            <div className="w-full max-w-sm flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setIsStudentLoginOpen(true)}
                className="w-full py-4 px-8 text-lg sm:text-xl font-black bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-stone-950 rounded-2xl shadow-2xl shadow-amber-500/40 flex items-center justify-center gap-3 transition-transform active:scale-95 cursor-pointer ring-4 ring-amber-500/30"
              >
                <Play className="w-6 h-6 fill-stone-950" />
                Mulai Permainan
              </button>
            </div>
          </div>

          {/* Bottom Control Hint */}
          <div className="w-full flex flex-col items-center justify-center z-10 shrink-0 pb-3 pt-1">
            <p className="text-[11px] text-stone-400/90 font-mono">
              Klik Mulai Permainan untuk mengisi nama, token & pilih level permainan
            </p>
          </div>
        </div>
      )}

      {/* 2. ACTIVE PLAYING BOARD */}
      {screen === 'PLAYING' && (
        <GameBoard
          questions={questions}
          level={selectedLevel}
          studentProfile={studentProfile}
          onOpenSpreadsheet={() => setIsSpreadsheetOpen(true)}
          onGameOver={handleGameOver}
          onVictory={handleVictory}
          onExit={() => setScreen('TITLE')}
          onRequestSubmitResult={(st) => {
            setGameStats(st);
            setIsSubmitResultOpen(true);
          }}
        />
      )}

      {/* 3. VICTORY SCREEN */}
      {screen === 'VICTORY' && (
        <div 
          className="relative w-full h-full flex items-center justify-center p-3 sm:p-6 bg-stone-950/90 overflow-y-auto"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(16,185,129,0.2), rgba(0,0,0,0.85)), url(${gardenLawnImg})`,
            backgroundSize: 'cover'
          }}
        >
          <div className="relative w-full max-w-xl max-h-[96vh] overflow-y-auto bg-stone-900/95 border-2 border-emerald-500 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col items-center text-center space-y-4 my-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shrink-0">
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-1">
              <div className="inline-block px-3 py-1 bg-emerald-950 border border-emerald-600 rounded-full text-xs font-bold text-emerald-300">
                Level {gameStats.level || selectedLevel} Berhasil Ditaklukkan!
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-wide uppercase">
                Kemenangan Gemilang!
              </h2>
              <p className="text-xs sm:text-sm text-stone-300">
                Pekaranganmu selamat! Seluruh gelombang zombi berhasil dipukul mundur.
              </p>
            </div>

            {/* Scorecard breakdown */}
            <div className="w-full grid grid-cols-3 gap-2 p-3 bg-stone-950/80 rounded-2xl border border-stone-800 text-center">
              <div>
                <span className="text-[11px] text-stone-400 block">Soal Dikerjakan</span>
                <p className="text-base font-mono font-bold text-emerald-300">
                  {gameStats.questionsCorrect} / {gameStats.questionsAnswered}
                </p>
                <span className="text-[10px] text-emerald-400">
                  {gameStats.questionsAnswered > 0 ? `${Math.round((gameStats.questionsCorrect / gameStats.questionsAnswered) * 100)}% Benar` : '100%'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Zombi Ditumpas</span>
                <p className="text-base font-mono font-bold text-amber-300">{gameStats.zombiesKilled}</p>
                <span className="text-[10px] text-stone-500">Zombi</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Matahari</span>
                <p className="text-base font-mono font-bold text-yellow-400">{gameStats.sunsCollected}</p>
                <span className="text-[10px] text-stone-500">Terkumpul</span>
              </div>
            </div>

            {/* Achievement System Badges */}
            <AchievementSystem stats={gameStats} />

            {/* ========================================================== */}
            {/* PAPAN PERINGKAT (VICTORY) */}
            {/* ========================================================== */}
            <div className="w-full pt-2">
              <StudentLeaderboard 
                token={activeTokenPkg?.token || ''}
                currentStudentName={studentProfile?.name}
                quizTitle={activeTokenPkg?.title}
                maxDisplay={5}
              />
            </div>

            {/* Button to Submit Results to Teacher */}
            <button
              type="button"
              onClick={() => setIsSubmitResultOpen(true)}
              className="w-full py-3.5 px-6 text-sm font-black bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-stone-950 rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-transform active:scale-95 cursor-pointer ring-4 ring-emerald-500/20"
            >
              <Send className="w-5 h-5 fill-stone-950" />
              Kirim Hasil ke Guru (Soal, Zombi & Matahari)
            </button>

            {/* Navigation Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full pt-1">
              {selectedLevel < 10 ? (
                <button
                  type="button"
                  onClick={() => handleStartGame(selectedLevel + 1)}
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Lanjut Level {selectedLevel + 1}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex-1 py-2 px-3 text-xs font-black text-amber-300 bg-amber-950/80 border border-amber-500/60 rounded-xl flex items-center justify-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Tamat Seluruh 10 Level!</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleStartGame(selectedLevel)}
                className="py-2.5 px-4 text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl transition-all border border-stone-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Ulangi Level Ini
              </button>
              <button
                type="button"
                onClick={() => setScreen('TITLE')}
                className="py-2.5 px-4 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 transition-colors cursor-pointer"
              >
                Menu Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. GAME OVER SCREEN */}
      {screen === 'GAME_OVER' && (
        <div 
          className="relative w-full h-full flex items-center justify-center p-4 sm:p-6 bg-stone-950/90 overflow-y-auto"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(220,38,38,0.3), rgba(0,0,0,0.9)), url(${titleBannerImg})`,
            backgroundSize: 'cover'
          }}
        >
          <div className="relative w-full max-w-lg bg-stone-900/95 border-2 border-red-600 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500 flex items-center justify-center text-red-400 shadow-lg shrink-0">
              <Skull className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="inline-block px-3 py-1 bg-red-950 border border-red-700 rounded-full text-xs font-bold text-red-300">
                Tergugur di Level {gameStats.level || selectedLevel} / 10
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-red-500 tracking-wide uppercase drop-shadow">
                Zombi Memakan Otakmu!
              </h2>
              <p className="text-xs sm:text-sm text-stone-300">
                Zombi di level ini sangat tangguh! Jawab lebih banyak kuis untuk mendapatkan tambahan matahari.
              </p>
            </div>

            {/* Scorecard */}
            <div className="w-full grid grid-cols-3 gap-2 p-3.5 bg-stone-950/80 rounded-2xl border border-stone-800 text-center">
              <div>
                <span className="text-[11px] text-stone-400 block">Soal Dikerjakan</span>
                <p className="text-base font-mono font-bold text-stone-200">
                  {gameStats.questionsCorrect} / {gameStats.questionsAnswered}
                </p>
                <span className="text-[10px] text-stone-400">
                  {gameStats.questionsAnswered > 0 ? `${Math.round((gameStats.questionsCorrect / gameStats.questionsAnswered) * 100)}% Benar` : '0%'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Zombi Ditumpas</span>
                <p className="text-base font-mono font-bold text-amber-300">{gameStats.zombiesKilled}</p>
                <span className="text-[10px] text-stone-500">Zombi</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block">Matahari</span>
                <p className="text-base font-mono font-bold text-yellow-400">{gameStats.sunsCollected}</p>
                <span className="text-[10px] text-stone-500">Terkumpul</span>
              </div>
            </div>

            {/* ========================================================== */}
            {/* PAPAN PERINGKAT (GAME OVER) */}
            {/* ========================================================== */}
            <div className="w-full pt-2">
              <StudentLeaderboard 
                token={activeTokenPkg?.token || ''}
                currentStudentName={studentProfile?.name}
                quizTitle={activeTokenPkg?.title}
                maxDisplay={5}
              />
            </div>

            {/* Button to Submit Results to Teacher */}
            <button
              type="button"
              onClick={() => setIsSubmitResultOpen(true)}
              className="w-full py-3.5 px-6 text-sm font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-stone-950 rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2.5 transition-transform active:scale-95 cursor-pointer ring-4 ring-amber-500/20"
            >
              <Send className="w-5 h-5 fill-stone-950" />
              Kirim Hasil ke Guru (Soal, Zombi & Matahari)
            </button>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3 w-full pt-1">
              <button
                type="button"
                onClick={() => handleStartGame(selectedLevel)}
                className="flex-1 py-2.5 px-4 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Coba Lagi Level Ini
              </button>
              <button
                type="button"
                onClick={() => setScreen('TITLE')}
                className="py-2.5 px-4 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 transition-colors cursor-pointer"
              >
                Menu Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPREADSHEET QUESTION MANAGER MODAL */}
      <SpreadsheetModal
        isOpen={isSpreadsheetOpen}
        onClose={() => setIsSpreadsheetOpen(false)}
        questions={questions}
        onSaveQuestions={handleUpdateQuestions}
      />

      {/* STUDENT LOGIN MODAL */}
      <StudentLoginModal
        isOpen={isStudentLoginOpen}
        onClose={() => setIsStudentLoginOpen(false)}
        onStudentLoginSuccess={handleStudentLoginSuccess}
        initialToken={urlToken}
      />

      {/* TEACHER PORTAL MODAL */}
      <TeacherPortalModal
        isOpen={isTeacherPortalOpen}
        onClose={() => setIsTeacherPortalOpen(false)}
        onSelectTokenForPlay={handleTeacherSelectTokenForPlay}
      />

      {/* SUBMIT RESULT MODAL */}
      <SubmitResultModal
        isOpen={isSubmitResultOpen}
        onClose={() => setIsSubmitResultOpen(false)}
        gameStats={gameStats}
        gameOutcome={screen === 'VICTORY' ? 'victory' : 'game_over'}
        studentProfile={studentProfile}
      />

    </main>
  );
}