import React, { useState } from 'react';
import { X, ShieldCheck, Sparkles, BookOpen, HelpCircle } from 'lucide-react';
import { ChessPieceIcon } from './ChessPieces.tsx';

interface BeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

interface PieceGuide {
  type: PieceType;
  name: string;
  nickname: string;
  points: string;
  rule: string;
  tip: string;
  // 5x5 grid center is (2, 2). Valid targets highlighted
  isTarget: (r: number, c: number) => boolean;
}

const PIECE_GUIDES: PieceGuide[] = [
  {
    type: 'p',
    name: 'Pawn',
    nickname: 'The Frontline Soldier',
    points: '1 Point',
    rule: 'Walks straight forward 1 square at a time (or 2 squares on its very first move). Captures diagonally forward 1 square.',
    tip: 'If a Pawn reaches the far end of the board, it transforms into a Queen!',
    isTarget: (r, c) => (r === 1 && c === 2) || (r === 0 && c === 2),
  },
  {
    type: 'n',
    name: 'Knight',
    nickname: 'The L-Shaped Jumper',
    points: '3 Points',
    rule: 'Moves in an "L" shape (2 squares one way, 1 square sideways). The ONLY piece that can jump right over other pieces!',
    tip: 'Knights shine in the center where they reach 8 squares instead of getting stuck on the edge.',
    isTarget: (r, c) => {
      const dr = Math.abs(r - 2);
      const dc = Math.abs(c - 2);
      return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    },
  },
  {
    type: 'b',
    name: 'Bishop',
    nickname: 'The Diagonal Sniper',
    points: '3 Points',
    rule: 'Slides as far as it wants along diagonal lines, as long as no other piece blocks its path.',
    tip: 'Each Bishop stays on its starting color (light or dark) for the entire game.',
    isTarget: (r, c) => (r !== 2 || c !== 2) && Math.abs(r - 2) === Math.abs(c - 2),
  },
  {
    type: 'r',
    name: 'Rook',
    nickname: 'The Castle Tower',
    points: '5 Points',
    rule: 'Slides straight forward, backward, or sideways as far as it wants along open lines.',
    tip: 'Rooks love open lanes! Team up with Castling to bring your Rooks into the middle.',
    isTarget: (r, c) => (r !== 2 || c !== 2) && (r === 2 || c === 2),
  },
  {
    type: 'q',
    name: 'Queen',
    nickname: 'The Superhero',
    points: '9 Points',
    rule: 'The strongest piece on the board! Combines the Rook and Bishop—slides straight OR diagonally in any direction.',
    tip: 'Don’t rush her out on move 2! Keep her safe until your Knights and Bishops are on the field.',
    isTarget: (r, c) =>
      (r !== 2 || c !== 2) && (r === 2 || c === 2 || Math.abs(r - 2) === Math.abs(c - 2)),
  },
  {
    type: 'k',
    name: 'King',
    nickname: 'The VIP Boss',
    points: 'Priceless (Game Over if trapped)',
    rule: 'Steps carefully 1 square in any direction. Can never step into danger (a square attacked by the enemy).',
    tip: 'Tuck your King safely in the corner by Castling before move 10!',
    isTarget: (r, c) => (r !== 2 || c !== 2) && Math.abs(r - 2) <= 1 && Math.abs(c - 2) <= 1,
  },
];

export const BeginnerGuideModal: React.FC<BeginnerGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'PIECES' | 'RULES' | 'SPECIAL'>('PIECES');
  const [selectedPiece, setSelectedPiece] = useState<PieceType>('n');

  if (!isOpen) return null;

  const activeGuide = PIECE_GUIDES.find((p) => p.type === selectedPiece) || PIECE_GUIDES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                Chess Made Simple: Beginner&apos;s Field Guide
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Everything you need to start playing confidently in 60 seconds.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl mt-4 shrink-0">
          <button
            onClick={() => setActiveTab('PIECES')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'PIECES'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            1. How Pieces Move
          </button>
          <button
            onClick={() => setActiveTab('RULES')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'RULES'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            2. 4 Golden Habits
          </button>
          <button
            onClick={() => setActiveTab('SPECIAL')}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'SPECIAL'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            3. Special Moves
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === 'PIECES' && (
            <div className="space-y-4">
              {/* Piece Selector Bar */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PIECE_GUIDES.map((p) => (
                  <button
                    key={p.type}
                    onClick={() => setSelectedPiece(p.type)}
                    className={`flex flex-col items-center p-2.5 rounded-xl border transition-all ${
                      selectedPiece === p.type
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 ring-1 ring-amber-400/50'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div className="w-9 h-9 mb-1">
                      <ChessPieceIcon type={p.type} color="w" />
                    </div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">
                      {p.points.split(' ')[0]} pt
                    </span>
                  </button>
                ))}
              </div>

              {/* Interactive 5x5 Mini Grid & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60 rounded-2xl p-4">
                {/* 5x5 Visual Movement Grid */}
                <div className="sm:col-span-5 flex flex-col items-center">
                  <div className="w-44 h-44 grid grid-cols-5 grid-rows-5 rounded-lg overflow-hidden border border-amber-900/20 shadow-sm">
                    {Array.from({ length: 5 }).map((_, r) =>
                      Array.from({ length: 5 }).map((__, c) => {
                        const isCenter = r === 2 && c === 2;
                        const isDark = (r + c) % 2 === 1;
                        const canReach = activeGuide.isTarget(r, c);

                        return (
                          <div
                            key={`${r}-${c}`}
                            className={`relative flex items-center justify-center ${
                              isDark ? 'bg-[#B58863]' : 'bg-[#F0D9B5]'
                            }`}
                          >
                            {isCenter && (
                              <div className="w-4/5 h-4/5">
                                <ChessPieceIcon type={activeGuide.type} color="w" />
                              </div>
                            )}
                            {!isCenter && canReach && (
                              <div className="w-3.5 h-3.5 rounded-full bg-emerald-600/85 ring-2 ring-white/80 shadow-xs" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-2">
                    Green dots show valid movement squares
                  </span>
                </div>

                {/* Plain English Explanation */}
                <div className="sm:col-span-7 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-display">
                        {activeGuide.name}
                      </h4>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        · {activeGuide.points}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                      &ldquo;{activeGuide.nickname}&rdquo;
                    </p>
                  </div>

                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {activeGuide.rule}
                  </p>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Luke&apos;s Tip:</strong> {activeGuide.tip}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'RULES' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  num: '01',
                  title: 'Hold the High Ground',
                  body: 'Start by moving a Pawn to e4 or d4. Controlling the 4 middle squares lets your team travel smoothly to either side of the board.',
                },
                {
                  num: '02',
                  title: 'Get Your Team on the Field',
                  body: 'Move your Knights and Bishops out early. Never send your Queen out alone on move 2—she will just get chased around!',
                },
                {
                  num: '03',
                  title: 'Tuck Your King Away',
                  body: 'Use Castling before move 10 to shelter your King behind friendly Pawns and bring your corner Rook into the action.',
                },
                {
                  num: '04',
                  title: 'The 3-Second Safety Scan',
                  body: 'Before making a move, ask: "Is the square I am moving to safe, and are all my pieces protected?" Avoid free giveaways!',
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/70 space-y-1.5"
                >
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Rule {item.num}
                  </div>
                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {item.title}
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'SPECIAL' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/70 space-y-1.5">
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  1. Castling (The Royal Escape)
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Once per game, if the squares between your King and Rook are empty and neither has moved yet, slide your King <strong>two squares</strong> toward the Rook. The Rook automatically hops over to guard him!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/70 space-y-1.5">
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  2. Pawn Promotion (The Upgrade)
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  If one of your humble Pawns marches all the way across the board to the 8th row, it instantly transforms into any piece you want (usually a brand-new <strong>Queen</strong>!).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/70 space-y-1.5">
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  3. En Passant (In Passing)
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  If an enemy Pawn tries to sneak past your Pawn by leaping 2 squares forward on its first move, your Pawn can still capture it diagonally right behind it—but only on the very next turn!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            Got It — Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
