import React, { useState } from 'react';
import { ELO_MILESTONES, EloTier, EloMilestone } from '../types.ts';
import { Award, ChevronRight, CheckCircle2, TrendingUp, Compass, Target, Crown, Shield } from 'lucide-react';

interface EloLadderProps {
  userElo: number;
  onSetUserElo?: (newElo: number) => void;
}

export const EloLadder: React.FC<EloLadderProps> = ({ userElo, onSetUserElo }) => {
  const [selectedMilestone, setSelectedMilestone] = useState<EloMilestone>(
    ELO_MILESTONES.find((m) => userElo >= m.minElo && userElo <= m.maxElo) || ELO_MILESTONES[0]
  );

  const currentTier: EloTier =
    userElo < 800 ? 'BEGINNER' : userElo < 1200 ? 'NOVICE' : userElo < 1600 ? 'INTERMEDIATE' : 'MASTER';

  // Calculate percentage within current tier
  const tierMin = currentTier === 'BEGINNER' ? 400 : currentTier === 'NOVICE' ? 800 : currentTier === 'INTERMEDIATE' ? 1200 : 1600;
  const tierMax = currentTier === 'BEGINNER' ? 799 : currentTier === 'NOVICE' ? 1199 : currentTier === 'INTERMEDIATE' ? 1599 : 2300;
  const tierProgress = Math.min(
    100,
    Math.max(0, Math.round(((userElo - tierMin) / (tierMax - tierMin)) * 100))
  );

  return (
    <div className="space-y-6">
      {/* Current Rating Hero Card */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-stone-900 dark:to-stone-800/80 border border-amber-200/80 dark:border-stone-700/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400">
                Your Progress Tracker
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500">·</span>
              <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                {currentTier === 'BEGINNER'
                  ? 'Beginner Tier (< 800)'
                  : currentTier === 'NOVICE'
                  ? 'Novice Tier (800 – 1200)'
                  : currentTier === 'INTERMEDIATE'
                  ? 'Intermediate Tier (1200 – 1600)'
                  : 'Advanced / Master Tier (1600+)'}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-stone-900 dark:text-stone-100 font-display tabular-nums">
                {userElo}
              </span>
              <span className="text-base font-semibold text-amber-800 dark:text-amber-300">
                Elo Rating
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-md">
              Gain Elo points by answering Luke&apos;s Micro-Challenges, sparring in matches, and completing lessons!
            </p>
          </div>

          {/* Quick Elo Level Presets */}
          {onSetUserElo && (
            <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                Adjust Your Starting Elo:
              </span>
              <div className="flex items-center gap-1.5">
                {[600, 950, 1350, 1750].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => onSetUserElo(rating)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                      userElo === rating
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bracket Progress Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-stone-600 dark:text-stone-400">
            <span>Current Tier Progress: {tierProgress}%</span>
            <span>Next Milestone: {tierMax + 1} Elo</span>
          </div>
          <div className="h-3 w-full bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500 rounded-full"
              style={{ width: `${tierProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Core Tiers Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tier 1: Beginner (<800) */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            currentTier === 'BEGINNER'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/30'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-90'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Beginner
              </h4>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                &lt; 800 Elo
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
            Piece movements, eliminating hanging pieces, 1-step tactics, and claiming the central high ground.
          </p>
          <div className="text-[11px] space-y-1 text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>3-second blunder scan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Center as &quot;high ground&quot;</span>
            </div>
          </div>
        </div>

        {/* Tier 2: Novice (800-1200) */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            currentTier === 'NOVICE'
              ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 ring-2 ring-sky-500/30'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-90'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/50 rounded-xl text-sky-800 dark:text-sky-300">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Novice
              </h4>
              <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 tabular-nums">
                800 – 1200 Elo
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
            Forks, pins, skewers, early king castling, and opening discipline: don&apos;t move the same piece twice!
          </p>
          <div className="text-[11px] space-y-1 text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Forks, Pins & Skewers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Castle before move 10</span>
            </div>
          </div>
        </div>

        {/* Tier 3: Intermediate (1200-1600) */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            currentTier === 'INTERMEDIATE'
              ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/30'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-90'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-800 dark:text-blue-300">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Intermediate
              </h4>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                1200 – 1600 Elo
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
            Pawn structures, weak squares, planning 2–3 moves ahead, and basic endgames (King + Rook checkmate).
          </p>
          <div className="text-[11px] space-y-1 text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Pawn structure chains</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Calculate 2-3 moves ahead</span>
            </div>
          </div>
        </div>

        {/* Tier 4: Advanced / Master (1600+) */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            currentTier === 'MASTER'
              ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 ring-2 ring-purple-500/30'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-90'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-800 dark:text-purple-300">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Advanced / Master
              </h4>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 tabular-nums">
                1600+ Elo
              </p>
            </div>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
            Positional nuances, pawn levers, prophylactic thinking (&quot;What is their plan?&quot;), and deep calculation paths.
          </p>
          <div className="text-[11px] space-y-1 text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Prophylactic prevention</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Deep calculation paths</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Milestone Roadmap */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-4 font-display">
          Detailed Mastery Ladder & Skills Checklist
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Milestone List */}
          <div className="lg:col-span-5 space-y-2">
            {ELO_MILESTONES.map((m) => {
              const isSelected = selectedMilestone.id === m.id;
              const isCompleted = userElo >= m.maxElo;
              const isCurrent = userElo >= m.minElo && userElo <= m.maxElo;

              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMilestone(m)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 shadow-xs ring-1 ring-amber-400/50'
                      : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-stone-300 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {isCompleted ? '✓' : m.minElo}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {m.title}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">
                        {m.subtitle}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Selected Milestone Detail Pane */}
          <div className="lg:col-span-7 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-xl p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {selectedMilestone.tier} STAGE
                </span>
                <span className="text-xs text-stone-400">·</span>
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 tabular-nums">
                  {selectedMilestone.minElo} – {selectedMilestone.maxElo} Elo
                </span>
              </div>
              <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                {selectedMilestone.title}
              </h4>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 leading-relaxed">
                {selectedMilestone.description}
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                Core Habits to Level Up
              </h5>
              <div className="space-y-2">
                {selectedMilestone.coreSkills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Luke&apos;s Golden Rule: &ldquo;Control the high ground, tuck your King in the castle, and use the 3-second scan before letting go of any piece!&rdquo;
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
