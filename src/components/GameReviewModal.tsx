import React, { useEffect, useState } from 'react';
import { Trophy, CheckCircle2, AlertCircle, Sparkles, X, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: 'win' | 'loss' | 'draw';
  moveHistory: string[];
  userElo: number;
  userColor: 'w' | 'b';
  onPlayAgain: () => void;
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  result,
  moveHistory,
  userElo,
  userColor,
  onPlayAgain,
}) => {
  const [review, setReview] = useState<{
    accuracy?: string;
    summary?: string;
    strengths?: string[];
    areasToImprove?: string[];
    lukePraise?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (result === 'win') {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.5 },
      });
    }

    setLoading(true);
    fetch('/api/coach/game-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moveList: moveHistory,
        result,
        userColor,
        userElo,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setReview(data);
      })
      .catch(() => {
        setReview({
          accuracy: result === 'win' ? '82%' : '74%',
          summary: 'Terrific effort! You engaged your pieces with great courage and showed solid opening instincts.',
          strengths: ['Active piece mobility', 'Fighting for the center squares'],
          areasToImprove: ['Take a 3-second pause before moving to verify undefended pieces', 'Early King castling'],
          lukePraise: 'Every game brings you one step closer to chess mastery!',
        });
      })
      .finally(() => setLoading(false));
  }, [isOpen, result]);

  if (!isOpen) return null;

  const eloDelta = result === 'win' ? 15 : result === 'draw' ? 5 : 3;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5 animate-fade-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Result Banner */}
        <div className="text-center pt-2">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-300 mb-3">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 font-display">
            {result === 'win'
              ? 'Victory! Outstanding Game!'
              : result === 'draw'
              ? 'A Well-Fought Draw!'
              : 'Good Game! Great Learning Opportunity!'}
          </h3>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              +{eloDelta} Elo Rating Points!
            </span>
            <span className="text-xs text-stone-400">·</span>
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {moveHistory.length} Moves Played
            </span>
          </div>
        </div>

        {/* Coach Luke's Review Content */}
        {loading ? (
          <div className="py-8 text-center space-y-2">
            <div className="flex justify-center space-x-1">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-bounce" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-bounce [animation-delay:0.4s]" />
            </div>
            <p className="text-xs text-stone-500">Coach Luke is preparing your personalized review...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Accuracy & Summary */}
            <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200 dark:border-stone-700/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Game Accuracy
                </span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-display tabular-nums">
                  {review?.accuracy || '78%'}
                </span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                {review?.summary || 'You played with solid intention and kept pressure on the board.'}
              </p>
            </div>

            {/* What you did well */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-2">
                What You Did Wonderfully:
              </span>
              <div className="space-y-1.5">
                {(review?.strengths || ['Good early piece development', 'Active attacking spirit']).map(
                  (s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-lg text-xs text-emerald-900 dark:text-emerald-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{s}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Areas to improve */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-2">
                Key Habits to Practice Next:
              </span>
              <div className="space-y-1.5">
                {(
                  review?.areasToImprove || [
                    'Scan for undefended pieces before every single move',
                    'Castle your King before launching a big attack',
                  ]
                ).map((a, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-lg text-xs text-amber-900 dark:text-amber-200"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Luke's Inspirational Quote */}
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                &ldquo;{review?.lukePraise || 'Every game you finish is a stepping stone to mastery!'}&rdquo;
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              onClose();
              onPlayAgain();
            }}
            className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Next Match</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
};
