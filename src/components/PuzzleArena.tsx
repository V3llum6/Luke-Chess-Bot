import React, { useState } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './ChessBoard.tsx';
import { TacticalPuzzle, EloTier } from '../types.ts';
import { CheckCircle2, RotateCcw, Lightbulb, Trophy, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../audio.ts';

interface PuzzleArenaProps {
  onEarnElo: (points: number) => void;
}

const PUZZLES: TacticalPuzzle[] = [
  {
    id: 'puzzle-1',
    title: 'Back-Rank Checkmate',
    elo: 550,
    tier: 'BEGINNER',
    theme: 'Checkmate Pattern',
    prompt: 'Black’s King is trapped behind his own pawns like a room with no open doors! Deliver checkmate in 1 move.',
    fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1',
    playerColor: 'w',
    solutionSan: ['Ra8#'],
    lukeClue: 'Slide your Rook all the way to the 8th rank. The pawns block the King from stepping forward!',
    explanation:
      'This is the famous Back-Rank Checkmate! When pawns are not pushed to create an escape window (called "luft"), rooks can end the game instantly.',
    visualArrows: [{ from: 'a1', to: 'a8', color: 'rose' }],
  },
  {
    id: 'puzzle-2',
    title: 'Defend the Free Knight',
    elo: 650,
    tier: 'BEGINNER',
    theme: 'Blunder Defense',
    prompt: 'Black’s Queen just lunged forward to e5 and is targeting your undefended Knight on c3. Defend your teammate with an active developing move!',
    fen: 'r1b1kbnr/pppp1ppp/8/4q3/8/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 1',
    playerColor: 'w',
    solutionSan: ['Nf3', 'd3', 'd4', 'e3', 'e4', 'Bd2'],
    lukeClue: 'Developing your other Knight to f3 attacks Black’s Queen while defending your team!',
    explanation:
      'Developing Nf3 is the gold standard: it activates a new piece, protects your board, and gains tempo by threatening the enemy Queen!',
    visualArrows: [{ from: 'g1', to: 'f3', color: 'emerald' }],
  },
  {
    id: 'puzzle-3',
    title: 'The Royal Fork',
    elo: 950,
    tier: 'NOVICE',
    theme: 'Knight Tactics',
    prompt: 'Black’s King (e8) and Queen (c8) are lined up for an L-shaped ambush! Hop your Knight to d6 to deliver check while simultaneously attacking the Queen.',
    fen: '2q1k2r/ppp2ppp/8/8/4N3/8/PPPP1PPP/R1BQK2R w KQk - 0 1',
    playerColor: 'w',
    solutionSan: ['Nd6+'],
    lukeClue: 'Look at square d6: jumping your Knight from e4 to d6 attacks BOTH the King on e8 and Queen on c8!',
    explanation:
      'A true Royal Fork! Because Black must respond to check by moving their King, your Knight captures their Queen (Nxc8) on the very next move.',
    visualArrows: [
      { from: 'e4', to: 'd6', color: 'amber' },
      { from: 'd6', to: 'e8', color: 'rose' },
      { from: 'd6', to: 'c8', color: 'rose' },
    ],
  },
  {
    id: 'puzzle-4',
    title: 'The Discovered Pin Attack',
    elo: 1350,
    tier: 'INTERMEDIATE',
    theme: 'Discovered Attack',
    prompt: 'White’s Rook on e1 is aligned with Black’s King on e8, but your Bishop on e2 is in the way. Step your Bishop to b5 to deliver check and unleash the Rook!',
    fen: '4k3/4r3/8/8/8/8/4B3/4R1K1 w - - 0 1',
    playerColor: 'w',
    solutionSan: ['Bb5+', 'Bxh5+'],
    lukeClue: 'Step your Bishop to b5 with check! Black is forced to respond to the King threat, leaving their Rook on e7 pinned and doomed.',
    explanation:
      'Discovered attacks are devastating: the moving piece creates a fresh threat while uncovering an ambush from the piece behind it.',
    visualArrows: [
      { from: 'e2', to: 'b5', color: 'emerald' },
      { from: 'e1', to: 'e7', color: 'rose' },
    ],
  },
  {
    id: 'puzzle-5',
    title: 'Master Queen Sacrifice & Deflection',
    elo: 1750,
    tier: 'MASTER',
    theme: 'Decoy & Back-Rank Mate',
    prompt: 'Black’s Rook on f8 is overworked defending both f7 and the 8th rank. Sacrifice your Queen on f7 to deflect the defender!',
    fen: '5rk1/5ppp/8/8/8/8/5QPP/4R1K1 w - - 0 1',
    playerColor: 'w',
    solutionSan: ['Qxf7+'],
    lukeClue: 'Strike directly: Qxf7+ forces Black’s Rook to capture your Queen (Rxf7), abandoning their back rank for Re8# checkmate!',
    explanation:
      'A master-level deflection sacrifice! Black has no choice but 1... Rxf7, which removes their guard of the back rank, allowing 2. Re8+ Rf8 3. Rxf8# checkmate.',
    visualArrows: [
      { from: 'f2', to: 'f7', color: 'rose' },
      { from: 'e1', to: 'e8', color: 'sky' },
    ],
  },
];

export const PuzzleArena: React.FC<PuzzleArenaProps> = ({ onEarnElo }) => {
  const [activeTier, setActiveTier] = useState<EloTier | 'ALL'>('ALL');
  const [selectedPuzzleIdx, setSelectedPuzzleIdx] = useState(0);

  const filteredPuzzles =
    activeTier === 'ALL' ? PUZZLES : PUZZLES.filter((p) => p.tier === activeTier);
  const activePuzzle = filteredPuzzles[selectedPuzzleIdx] || PUZZLES[0];

  const [game, setGame] = useState(() => new Chess(activePuzzle.fen));
  const [solvedPuzzles, setSolvedPuzzles] = useState<Set<string>>(new Set());
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'incorrect'>('idle');
  const [showHint, setShowHint] = useState(false);

  const handleSelectPuzzle = (idx: number) => {
    setSelectedPuzzleIdx(idx);
    const puzzle = filteredPuzzles[idx];
    setGame(new Chess(puzzle.fen));
    setFeedbackStatus('idle');
    setShowHint(false);
  };

  const handleReset = () => {
    setGame(new Chess(activePuzzle.fen));
    setFeedbackStatus('idle');
    setShowHint(false);
  };

  const handleMove = ({ san }: { san: string }) => {
    const isCorrect = activePuzzle.solutionSan.some(
      (sol) => sol === san || sol.replace('+', '').replace('#', '') === san.replace('+', '').replace('#', '')
    );

    if (isCorrect) {
      setFeedbackStatus('success');
      sounds.playVictory();

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });

      if (!solvedPuzzles.has(activePuzzle.id)) {
        setSolvedPuzzles((prev) => new Set([...prev, activePuzzle.id]));
        onEarnElo(15);
      }
    } else {
      setFeedbackStatus('incorrect');
      setTimeout(() => {
        setGame(new Chess(activePuzzle.fen));
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tier Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 font-display">
            Tactical Training Drills
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Train your tactical eye across Beginner, Novice, Intermediate, and Master brackets.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
          {(['ALL', 'BEGINNER', 'NOVICE', 'INTERMEDIATE', 'MASTER'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => {
                setActiveTier(tier);
                setSelectedPuzzleIdx(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeTier === tier
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {tier === 'ALL'
                ? 'All Drills'
                : tier === 'BEGINNER'
                ? 'Beginner (<800)'
                : tier === 'NOVICE'
                ? 'Novice (800–1200)'
                : tier === 'INTERMEDIATE'
                ? 'Intermediate (1200–1600)'
                : 'Master (1600+)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Puzzle Selector List */}
        <div className="lg:col-span-4 space-y-2">
          {filteredPuzzles.map((p, idx) => {
            const isCurrent = idx === selectedPuzzleIdx;
            const isSolved = solvedPuzzles.has(p.id);

            return (
              <button
                key={p.id}
                onClick={() => handleSelectPuzzle(idx)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isCurrent
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-xs ring-1 ring-amber-400/50'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSolved
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {isSolved ? '✓' : idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {p.title}
                    </h4>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                      ~{p.elo} Elo · {p.theme}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Puzzle Board & Details */}
        <div className="lg:col-span-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {activePuzzle.tier} DRILL
                </span>
                <span className="text-xs text-stone-400">·</span>
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 tabular-nums">
                  {activePuzzle.elo} Elo Rating
                </span>
              </div>
              <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                {activePuzzle.title}
              </h4>
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200 dark:border-stone-700/60">
            {activePuzzle.prompt}
          </p>

          {/* Puzzle Chessboard */}
          <div className="max-w-[420px] mx-auto">
            <ChessBoard
              game={game}
              onMove={handleMove}
              isPlayerTurn={feedbackStatus !== 'success'}
              playerColor={activePuzzle.playerColor}
              coachVisionEnabled={true}
              visualArrows={activePuzzle.visualArrows}
            />
          </div>

          {/* Feedback & Result */}
          {feedbackStatus === 'success' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-emerald-900 dark:text-emerald-200 animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h5 className="text-sm font-bold">Solved! +15 Elo Points Earned!</h5>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                {activePuzzle.explanation}
              </p>
            </div>
          )}

          {feedbackStatus === 'incorrect' && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <span>Not quite the winning move! Try looking for a more direct tactic.</span>
            </div>
          )}

          {/* Luke's Clue Button */}
          {feedbackStatus !== 'success' && (
            <div className="pt-2">
              {!showHint ? (
                <button
                  onClick={() => {
                    setShowHint(true);
                    sounds.playHint();
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>Ask Coach Luke for a clue</span>
                </button>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  <strong className="font-semibold block mb-0.5">Luke&apos;s Clue:</strong>
                  {activePuzzle.lukeClue}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
