import React, { useState } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './ChessBoard.tsx';
import { Lesson, VisualArrow } from '../types.ts';
import { CheckCircle2, Sparkles, BookOpen, ChevronRight, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../audio.ts';

interface LessonAcademyProps {
  onEarnElo: (points: number) => void;
}

const LESSONS: Lesson[] = [
  {
    id: 'lesson-center',
    title: 'Controlling the Center',
    subtitle: 'The #1 Golden Rule of Chess',
    targetElo: '400 - 600 Elo',
    category: 'Opening Principles',
    analogy:
      'Think of the 4 center squares like holding the high ground on a hill. Whoever holds the high ground has the clearest view and easiest paths in every direction!',
    introText:
      'In chess, the four squares in the very center (e4, d4, e5, d5) control the flow of the entire battle. Plant your King’s pawn forward two squares to claim the high ground.',
    initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: ['e4'],
    hints: [
      'Look at the pawn standing right in front of your King (square e2).',
      'Pawns can leap two squares forward on their very first move!',
      'Play the move: e2 to e4.',
    ],
    successMessage:
      'Brilliant! You claimed the e4 center square, opened up lines for your Queen and Bishop, and seized the high ground!',
    explanation:
      'By placing your pawn on e4, you control d5 and f5. Your light-squared bishop and queen are now free to enter the battle.',
    visualArrows: [{ from: 'e2', to: 'e4', color: 'emerald' }],
  },
  {
    id: 'lesson-fork',
    title: 'The Sneaky Knight Fork',
    subtitle: 'Attacking Two Things at Once',
    targetElo: '500 - 750 Elo',
    category: 'Basic Tactics',
    analogy:
      'A fork is like ordering a combo meal where your opponent must surrender one of their pieces because they cannot protect both at the same time!',
    introText:
      'Knights are the only pieces that jump over others in an L-shape. In this position, leap your Knight from d5 to c7 to deliver check to Black’s King while attacking the Rook on a8!',
    initialFen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
    playerColor: 'w',
    solutionMoves: ['Nc7+'],
    hints: [
      'Look at your Knight on d5.',
      'Hop the Knight to c7: it puts Black’s King in check while threatening the Rook on a8!',
      'Play the move: Knight from d5 to c7.',
    ],
    successMessage:
      'Check! A devastating Knight Fork! The Black King must step away, leaving the Rook on a8 free for you to capture next move!',
    explanation:
      'Because knights jump in L-shapes, forks are a beginner’s secret superpower. Always scan for squares where your knight can hit two high-value pieces.',
    visualArrows: [
      { from: 'd5', to: 'c7', color: 'amber' },
      { from: 'c7', to: 'e8', color: 'rose' },
      { from: 'c7', to: 'a8', color: 'rose' },
    ],
  },
  {
    id: 'lesson-castle',
    title: 'Castling: King Safety',
    subtitle: 'Tucking Your Monarch in the Castle',
    targetElo: '600 - 800 Elo',
    category: 'King Safety',
    analogy:
      'Would you leave the president standing in the middle of a soccer field during a thunderstorm? No way—tuck him safely into the VIP shelter before the battle begins!',
    introText:
      'Castling is the only move in chess where two pieces move at once: your King slides two squares toward the corner, and the Rook hops over him to join the fight.',
    initialFen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/4P3/5N2/PPPPBPPP/RNBQK2R w KQkq - 4 4',
    playerColor: 'w',
    solutionMoves: ['O-O'],
    hints: [
      'The path between your King (e1) and your Rook (h1) is completely clear!',
      'Click your King on e1, then click the square g1.',
      'Castle Kingside: Move your King from e1 to g1.',
    ],
    successMessage:
      'Splendid! Your King is securely sheltered behind a wall of pawns, and your Rook is activated to contest the center.',
    explanation:
      'Beginners who castle before move 10 win significantly more games because surprise checkmates down the center files become almost impossible.',
    visualArrows: [{ from: 'e1', to: 'g1', color: 'emerald' }],
  },
  {
    id: 'lesson-pin',
    title: 'The Deadly Pin',
    subtitle: 'Freezing Enemy Defenders',
    targetElo: '700 - 900 Elo',
    category: 'Intermediate Tactics',
    analogy:
      'Imagine a bodyguard frozen in place. If the bodyguard steps aside, the VIP behind them takes the hit! That piece is completely immobilized.',
    introText:
      'A pin occurs when an attacking piece threatens an enemy piece that cannot move without exposing an even more valuable piece behind it. Move your Bishop to b5 to pin Black’s Knight to their King!',
    initialFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    playerColor: 'w',
    solutionMoves: ['Bb5'],
    hints: [
      'Look at your light-squared Bishop resting on f1.',
      'Slide the Bishop up the diagonal to square b5.',
      'From b5, your Bishop points directly through the c6 Knight to the e8 King!',
    ],
    successMessage:
      'Excellently played! That is the famous Ruy Lopez pin. The c6 Knight is paralyzed because moving it would expose their King to check!',
    explanation:
      'Whenever you notice an enemy piece lined up on the same diagonal or file as their King or Queen, look for a sliding Bishop or Rook to pin it.',
    visualArrows: [{ from: 'f1', to: 'b5', color: 'emerald' }],
  },
  {
    id: 'lesson-blunder-scan',
    title: 'The 3-Second Blunder Check',
    subtitle: 'Stop Giving Away Free Pieces',
    targetElo: '400 - 700 Elo',
    category: 'Habit & Mindset',
    analogy:
      'Like looking both ways before crossing the road: 1 second left, 1 second right, 1 second forward. A simple 3-second habit that wins matches!',
    introText:
      'Black just pushed their pawn to d5, attacking your undefended Knight on c4! Instead of rushing forward, spot the danger and retreat your Knight to a safe, protected square.',
    initialFen: 'rnbqkbnr/ppp1pppp/8/3p4/2N1P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 2',
    playerColor: 'w',
    solutionMoves: ['Ne3', 'Na3', 'Nf3'],
    hints: [
      'Black’s pawn on d5 is pointing its spear directly at your Knight on c4!',
      'If you ignore it, Black captures your Knight for free on the next move.',
      'Retreat your Knight to a safe square like e3 or a3.',
    ],
    successMessage:
      'Safe and sound! You spotted the threat, kept your army intact, and denied your opponent free material.',
    explanation:
      'At the beginner level, the player who avoids giving away free pieces wins 9 out of 10 matches. Always pause 3 seconds to scan for undefended teammates!',
    visualArrows: [{ from: 'c4', to: 'e3', color: 'emerald' }],
  },
];

export const LessonAcademy: React.FC<LessonAcademyProps> = ({ onEarnElo }) => {
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const activeLesson = LESSONS[activeLessonIndex];

  const [game, setGame] = useState(() => new Chess(activeLesson.initialFen));
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'success' | 'incorrect'>('idle');

  const handleSelectLesson = (index: number) => {
    setActiveLessonIndex(index);
    const lesson = LESSONS[index];
    setGame(new Chess(lesson.initialFen));
    setCurrentHintIndex(0);
    setFeedbackStatus('idle');
  };

  const handleResetBoard = () => {
    setGame(new Chess(activeLesson.initialFen));
    setFeedbackStatus('idle');
    setCurrentHintIndex(0);
  };

  const handleMove = ({ san }: { san: string }) => {
    const isSolution = activeLesson.solutionMoves.some(
      (sol) => sol === san || sol.replace('+', '') === san.replace('+', '')
    );

    if (isSolution) {
      setFeedbackStatus('success');
      sounds.playVictory();

      confetti({
        particleCount: 45,
        spread: 65,
        origin: { y: 0.6 },
      });

      if (!completedLessons.has(activeLesson.id)) {
        setCompletedLessons((prev) => new Set([...prev, activeLesson.id]));
        onEarnElo(25);
      }
    } else {
      setFeedbackStatus('incorrect');
      setTimeout(() => {
        setGame(new Chess(activeLesson.initialFen));
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Academy Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 font-display">
            Interactive Strategy Academy
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Bite-sized, jargon-free lessons designed by Coach Luke for non-technical beginners.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <Sparkles className="w-4 h-4" />
          <span>Earn +25 Elo per completed lesson!</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lesson Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          {LESSONS.map((lesson, idx) => {
            const isCurrent = idx === activeLessonIndex;
            const isDone = completedLessons.has(lesson.id);

            return (
              <button
                key={lesson.id}
                onClick={() => handleSelectLesson(idx)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isCurrent
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-xs ring-1 ring-amber-400/50'
                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {lesson.title}
                    </h4>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      {lesson.subtitle}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Interactive Lesson Stage */}
        <div className="lg:col-span-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {activeLesson.category}
                </span>
                <span className="text-xs text-stone-400">·</span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  Recommended for {activeLesson.targetElo}
                </span>
              </div>
              <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                {activeLesson.title}
              </h4>
            </div>

            <button
              onClick={handleResetBoard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Everyday Analogy Box */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
            <span className="text-base shrink-0">💡</span>
            <div>
              <strong className="font-semibold block mb-0.5">Luke&apos;s Plain-English Analogy:</strong>
              {activeLesson.analogy}
            </div>
          </div>

          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
            {activeLesson.introText}
          </p>

          {/* Interactive Chessboard with Visual Arrows */}
          <div className="max-w-[420px] mx-auto">
            <ChessBoard
              game={game}
              onMove={handleMove}
              isPlayerTurn={feedbackStatus !== 'success'}
              playerColor={activeLesson.playerColor}
              coachVisionEnabled={true}
              visualArrows={activeLesson.visualArrows}
            />
          </div>

          {/* Feedback & Result Banner */}
          {feedbackStatus === 'success' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-emerald-900 dark:text-emerald-200 animate-fade-in">
              <div className="flex items-center gap-2 mb-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h5 className="text-sm font-bold">{activeLesson.successMessage}</h5>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed mb-3">
                {activeLesson.explanation}
              </p>
              {activeLessonIndex < LESSONS.length - 1 && (
                <button
                  onClick={() => handleSelectLesson(activeLessonIndex + 1)}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>Next Lesson: {LESSONS[activeLessonIndex + 1].title}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {feedbackStatus === 'incorrect' && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 animate-shake">
              <span>Not quite that move! Give it another try or check Luke&apos;s clue below.</span>
            </div>
          )}

          {/* Hint Strip */}
          {feedbackStatus !== 'success' && (
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-stone-400">
                Stuck? Luke has a clue ready for you.
              </span>
              <button
                onClick={() => {
                  setCurrentHintIndex((prev) => Math.min(prev + 1, activeLesson.hints.length - 1));
                  sounds.playHint();
                }}
                className="text-amber-700 dark:text-amber-400 font-semibold hover:underline"
              >
                Show Clue ({currentHintIndex + 1}/{activeLesson.hints.length})
              </button>
            </div>
          )}

          {currentHintIndex >= 0 && feedbackStatus !== 'success' && (
            <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              <span className="font-semibold text-amber-600 dark:text-amber-400 mr-1.5">Clue:</span>
              {activeLesson.hints[currentHintIndex]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
