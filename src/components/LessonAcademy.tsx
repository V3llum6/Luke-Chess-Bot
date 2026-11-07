import React, { useState } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './ChessBoard.tsx';
import { Lesson } from '../types.ts';
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
      'Imagine a busy city with a grand town square in the middle. Whoever controls the town square can quickly send helpers to any neighborhood!',
    introText:
      'In chess, the four squares in the very center (e4, d4, e5, d5) control the flow of the entire game. Plant your king’s pawn forward two squares to claim the territory.',
    initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    playerColor: 'w',
    solutionMoves: ['e4'],
    hints: [
      'Look at the pawn standing in front of your King (square e2).',
      'Pawns can leap two squares forward on their very first move!',
      'Play the move: e2 to e4.',
    ],
    successMessage:
      'Brilliant! You claimed the e4 center square, opened up lines for your queen and bishop, and took the initiative!',
    explanation:
      'By placing your pawn on e4, you control d5 and f5. Your light-squared bishop and queen are now free to enter the battle.',
  },
  {
    id: 'lesson-fork',
    title: 'The Sneaky Knight Fork',
    subtitle: 'Attacking Two Things at Once',
    targetElo: '500 - 750 Elo',
    category: 'Basic Tactics',
    analogy:
      'A fork is like ordering a combo meal where your opponent must give you one of their items because they cannot protect both at the same time!',
    introText:
      'Knights are the only pieces that can jump over other pieces. In this position, find the jumping square where your White Knight attacks Black’s King AND Black’s Rook simultaneously!',
    // Position where Nc7+ is a royal fork against King on e8 and Rook on a8
    initialFen: 'r3k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
    playerColor: 'w',
    solutionMoves: ['Nc7+'],
    hints: [
      'Your knight on e4 can hop to several squares.',
      'Look at c7: it puts Black’s King in check while eyeing the rook on a8!',
      'Jump your knight from e4 to c7.',
    ],
    successMessage:
      'Check! A classic Knight Fork! The black king MUST move, leaving the defenseless rook on a8 for you to capture on the next move!',
    explanation:
      'Because knights jump in unpredictable L-shapes, forks are a beginner’s secret superpower. Always scan where your knight can hit two high-value pieces.',
  },
  {
    id: 'lesson-castle',
    title: 'Castling: King Safety',
    subtitle: 'Tucking Your Monarch in the Castle',
    targetElo: '600 - 800 Elo',
    category: 'King Safety',
    analogy:
      'Would you leave the president standing in the middle of a soccer field during a heavy storm? No way—tuck him safely into the VIP shelter!',
    introText:
      'Castling is the only move in chess where two pieces move at the same time: your King slides two squares toward the corner, and the Rook hops right over him.',
    // White ready to castle kingside
    initialFen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/4P3/5N2/PPPPBPPP/RNBQK2R w KQkq - 4 4',
    playerColor: 'w',
    solutionMoves: ['O-O'],
    hints: [
      'The path between your King (e1) and Kingside Rook (h1) is clear!',
      'Click your King on e1, then click the square g1.',
      'Castle Kingside: Move King from e1 to g1.',
    ],
    successMessage:
      'Splendid! Your King is securely sheltered behind a wall of pawns, and your rook is activated to help control the open e-file.',
    explanation:
      'Beginners who castle before move 10 win significantly more games because sudden checkmates along the center files become almost impossible.',
  },
  {
    id: 'lesson-pin',
    title: 'The Deadly Pin',
    subtitle: 'Freezing Enemy Defenders',
    targetElo: '700 - 900 Elo',
    category: 'Intermediate Tactics',
    analogy:
      'Imagine a bodyguard standing directly in front of the president. If the bodyguard moves out of the way, the president gets hit!',
    introText:
      'A pin occurs when an attacking piece threatens an enemy piece that cannot move without exposing an even more valuable piece behind it. Pin Black’s knight to their King using your bishop!',
    // White bishop on f1, black knight on f6, black king on e8, black pawn on d7
    initialFen: '4k3/4r3/5n2/8/8/8/8/4KB2 w - - 0 1',
    playerColor: 'w',
    solutionMoves: ['Bb5'],
    hints: [
      'Look at your light-squared bishop on f1.',
      'Look along the diagonal toward the enemy rook on e7.',
      'Actually, move your bishop to b5 to deliver check or pin the defender!',
    ],
    successMessage:
      'Excellently played! Pins restrict the opponent’s freedom and force them into passive defense.',
    explanation:
      'Whenever you see an opponent piece aligned on the same diagonal or file with their King or Queen, look for a sliding piece to pin it!',
  },
  {
    id: 'lesson-blunder-scan',
    title: 'The 3-Second Blunder Check',
    subtitle: 'Stop Giving Away Free Pieces',
    targetElo: '400 - 700 Elo',
    category: 'Habit & Mindset',
    analogy:
      'Like looking both ways before crossing the street: 1 second left, 1 second right, 1 second forward. Simple habit, saves lives!',
    introText:
      'Black just played a move and attacked your undefended Knight on c4. Instead of rushing to attack, spot the threat and bring your knight to a safe, defended square.',
    initialFen: 'rnbqkbnr/ppp1pppp/8/3p4/2N1P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 2',
    playerColor: 'w',
    solutionMoves: ['Ne3', 'Na3', 'Nf3'],
    hints: [
      'Black’s pawn on d5 is attacking your knight on c4!',
      'If you do nothing, Black takes your knight for free next move.',
      'Retreat your knight to safety (e.g. e3 or a3).',
    ],
    successMessage:
      'Safe and sound! You recognized the danger, kept your army intact, and denied your opponent free material.',
    explanation:
      'At the beginner level, the player who gives away fewer free pieces wins almost every single match. Build the 3-second pause into your DNA!',
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
    // Check if move matches solution moves
    const isSolution = activeLesson.solutionMoves.some(
      (sol) => sol === san || sol.replace('+', '') === san.replace('+', '')
    );

    if (isSolution) {
      setFeedbackStatus('success');
      sounds.playVictory();

      // Trigger celebratory confetti
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
      });

      if (!completedLessons.has(activeLesson.id)) {
        setCompletedLessons((prev) => new Set([...prev, activeLesson.id]));
        onEarnElo(25); // Award rating points
      }
    } else {
      setFeedbackStatus('incorrect');
      // Reset board after a brief delay so student can try again
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
          {/* Lesson Header */}
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
              <strong className="font-semibold block mb-0.5">Luke&apos;s Plain English Analogy:</strong>
              {activeLesson.analogy}
            </div>
          </div>

          {/* Lesson Instructions */}
          <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
            {activeLesson.introText}
          </p>

          {/* Interactive Chessboard */}
          <div className="max-w-[420px] mx-auto">
            <ChessBoard
              game={game}
              onMove={handleMove}
              isPlayerTurn={feedbackStatus !== 'success'}
              playerColor={activeLesson.playerColor}
              coachVisionEnabled={true}
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
              <span>Not quite that one! Try again or click &quot;Need a Clue?&quot; below.</span>
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
