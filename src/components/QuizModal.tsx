import React, { useEffect, useState, useMemo } from 'react';
import { ActiveQuizState } from '../types/game';
import { SunSprite } from './Sprites';
import { sound } from '../utils/audio';
import { Zap, Snowflake, Sparkles, Bomb, CheckCircle, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizModalProps {
  quizState: ActiveQuizState;
  onAnswer: (selectedOption: string, isCorrect: boolean) => void;
  onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  quizState,
  onAnswer,
  onClose
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Shuffle options once when quiz opens
  const shuffledOptions = useMemo(() => {
    if (!quizState.question) return [];
    const opts = [
      quizState.question.correctAnswer,
      quizState.question.distractor1,
      quizState.question.distractor2,
      quizState.question.distractor3,
    ].filter(Boolean);
    // Fisher-Yates shuffle
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }, [quizState.question]);

  // Reset local state when a new question opens
  useEffect(() => {
    setSelected(null);
    setHasAnswered(false);
  }, [quizState.question?.id]);

  const handleSelectOption = (opt: string) => {
    if (hasAnswered || !quizState.question) return;

    setSelected(opt);
    setHasAnswered(true);

    const isCorrect = opt.trim().toLowerCase() === quizState.question.correctAnswer.trim().toLowerCase();

    if (isCorrect) {
      sound.playCorrect();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 }
      });
    } else {
      sound.playWrong();
    }

    setTimeout(() => {
      onAnswer(opt, isCorrect);
    }, 1200);
  };

  // Keyboard shortcut support (1-4 or A-D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasAnswered) return;
      let index = -1;
      if (e.key === '1' || e.key.toLowerCase() === 'a') index = 0;
      else if (e.key === '2' || e.key.toLowerCase() === 'b') index = 1;
      else if (e.key === '3' || e.key.toLowerCase() === 'c') index = 2;
      else if (e.key === '4' || e.key.toLowerCase() === 'd') index = 3;

      if (index >= 0 && index < shuffledOptions.length) {
        handleSelectOption(shuffledOptions[index]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasAnswered, shuffledOptions]);

  if (!quizState.isOpen || !quizState.question) return null;

  const rewardBadges = {
    sun_boost: {
      title: '+30 Matahari Tambahan',
      icon: <SunSprite size={20} />,
      color: 'text-amber-300 bg-amber-950/80 border-amber-600/50'
    },
    freeze_all: {
      title: 'Badai Es (Bekukan Semua Zombi 6s)',
      icon: <Snowflake className="w-5 h-5 text-cyan-300" />,
      color: 'text-cyan-300 bg-cyan-950/80 border-cyan-600/50'
    },
    plant_food: {
      title: 'Overdrive Tumbuhan (Rapid Fire)',
      icon: <Sparkles className="w-5 h-5 text-emerald-300" />,
      color: 'text-emerald-300 bg-emerald-950/80 border-emerald-600/50'
    },
    cherry_bomb: {
      title: 'Serangan Bom Ceri Gratis!',
      icon: <Bomb className="w-5 h-5 text-red-300" />,
      color: 'text-red-300 bg-red-950/80 border-red-600/50'
    }
  };

  const currentReward = rewardBadges[quizState.rewardType] || rewardBadges.sun_boost;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-stone-900 border-2 border-yellow-500/80 rounded-2xl shadow-2xl overflow-hidden text-stone-100 p-6 flex flex-col space-y-5 animate-in zoom-in-95 duration-150">

        {/* Top Header & Reward Tag */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Tantangan Otak Pintar
                </span>
                {quizState.questionNumber && quizState.totalQuestions && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-stone-950">
                    Soal {quizState.questionNumber} / {quizState.totalQuestions}
                  </span>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-stone-200">
                {quizState.source === 'wave_alert' 
                  ? '⚠️ Zombi Datang Cepat! Jawab untuk Mempertahankan Kebun!'
                  : 'Jawab Benar untuk Mengaktifkan Kekuatan Spesial!'}
              </h3>
            </div>
          </div>
          
          {quizState.totalQuestions && (
            <div className="text-right shrink-0 hidden sm:block">
              <span className="text-[10px] text-stone-400 block">Status Permainan:</span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {quizState.questionNumber} dari {quizState.totalQuestions} Soal
              </span>
            </div>
          )}
        </div>

        {/* Reward Pill Banner */}
        <div className={`flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold ${currentReward.color}`}>
          <div className="flex items-center gap-2">
            {currentReward.icon}
            <span>Hadiah: {currentReward.title}</span>
          </div>
          <span className="text-[10px] text-stone-300 opacity-80 hidden sm:inline">
            🧟 Zombi terus datang sampai semua soal selesai!
          </span>
        </div>

        {/* Question Box (Kolom A) */}
        <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl">
          <p className="text-base sm:text-lg font-bold text-stone-100 leading-snug">
            {quizState.question.question}
          </p>
          {quizState.question.category && (
            <span className="inline-block mt-2 text-[11px] text-stone-400 font-mono">
              Topik: {quizState.question.category}
            </span>
          )}
        </div>

        {/* 4 Shuffled Options (Kolom B, C, D, E) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shuffledOptions.map((opt, idx) => {
            const letter = ['A', 'B', 'C', 'D'][idx];
            const isSelected = selected === opt;
            const isCorrectAnswer = opt.trim().toLowerCase() === quizState.question?.correctAnswer.trim().toLowerCase();

            let btnStyle = 'border-stone-700 bg-stone-800/90 text-stone-200 hover:bg-stone-700/90 hover:border-amber-400/50';

            if (hasAnswered) {
              if (isCorrectAnswer) {
                btnStyle = 'border-emerald-500 bg-emerald-950/90 text-emerald-200 ring-2 ring-emerald-500 font-bold';
              } else if (isSelected && !isCorrectAnswer) {
                btnStyle = 'border-red-500 bg-red-950/90 text-red-200 ring-2 ring-red-500';
              } else {
                btnStyle = 'border-stone-800 bg-stone-900/60 text-stone-500 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={hasAnswered}
                onClick={() => handleSelectOption(opt)}
                className={`relative flex items-center gap-3 p-3.5 rounded-xl border-2 text-left text-sm font-medium transition-all shadow-sm ${btnStyle}`}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-stone-950/70 text-xs font-mono font-bold text-amber-300 border border-stone-700 shrink-0">
                  {letter}
                </span>
                <span className="flex-1 leading-snug">{opt}</span>
                {hasAnswered && isCorrectAnswer && (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                {hasAnswered && isSelected && !isCorrectAnswer && (
                  <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom helper info */}
        <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
          <span>Gunakan mouse atau tombol keyboard <b>1–4 / A–D</b></span>
          {hasAnswered && (
            <button
              onClick={onClose}
              className="text-amber-400 font-semibold hover:underline"
            >
              Lanjutkan →
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
