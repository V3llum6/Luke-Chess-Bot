import React, { useState } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { ChessPieceIcon } from './ChessPieces.tsx';
import { sounds } from '../audio.ts';
import { VisualArrow } from '../types.ts';

interface ChessBoardProps {
  game: Chess;
  onMove: (moveResult: { from: Square; to: Square; promotion?: string; san: string; captured?: string }) => void;
  isPlayerTurn: boolean;
  playerColor?: 'w' | 'b';
  lastMove?: { from: Square; to: Square } | null;
  coachVisionEnabled?: boolean;
  hintHighlight?: { from: Square; to?: Square } | null;
  visualArrows?: VisualArrow[];
  interactive?: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const CENTER_SQUARES: Square[] = ['d4', 'e4', 'd5', 'e5'];

const PIECE_WEIGHTS: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const ChessBoard: React.FC<ChessBoardProps> = ({
  game,
  onMove,
  isPlayerTurn,
  playerColor = 'w',
  lastMove,
  coachVisionEnabled = false,
  hintHighlight,
  visualArrows = [],
  interactive = true,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Calculate live material balance
  const materialBalance = React.useMemo(() => {
    let whiteTotal = 0;
    let blackTotal = 0;
    const board = game.board();

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          const val = PIECE_WEIGHTS[p.type] || 0;
          if (p.color === 'w') whiteTotal += val;
          else blackTotal += val;
        }
      }
    }

    return {
      white: whiteTotal,
      black: blackTotal,
      diff: whiteTotal - blackTotal,
    };
  }, [game]);

  // Calculate legal destination moves for the selected piece
  const legalMovesForSelected = React.useMemo(() => {
    if (!selectedSquare) return [];
    try {
      const moves = game.moves({ square: selectedSquare, verbose: true });
      return moves.map((m) => ({ to: m.to, isCapture: Boolean(m.captured) }));
    } catch {
      return [];
    }
  }, [game, selectedSquare]);

  // Find King square in check
  const kingInCheckSquare = React.useMemo(() => {
    if (!game.inCheck()) return null;
    const turn = game.turn();
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          const file = FILES[c];
          const rank = RANKS[r];
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  }, [game]);

  // Coach Vision: Find player's undefended pieces
  const undefendedSquares = React.useMemo(() => {
    if (!coachVisionEnabled) return new Set<Square>();
    const undefended = new Set<Square>();
    const board = game.board();
    const playerPieces: { square: Square; type: PieceSymbol }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === playerColor && piece.type !== 'k') {
          const sq = `${FILES[c]}${RANKS[r]}` as Square;
          playerPieces.push({ square: sq, type: piece.type });
        }
      }
    }

    playerPieces.forEach((p) => {
      const opponentColor: Color = playerColor === 'w' ? 'b' : 'w';
      const isUnderThreat = game.isAttacked(p.square, opponentColor);
      if (isUnderThreat) {
        undefended.add(p.square);
      }
    });

    return undefended;
  }, [game, coachVisionEnabled, playerColor]);

  const handleSquareClick = (square: Square) => {
    if (!interactive || !isPlayerTurn) return;

    if (pendingPromotion) {
      setPendingPromotion(null);
      return;
    }

    const clickedPiece = game.get(square);

    if (clickedPiece && clickedPiece.color === game.turn() && clickedPiece.color === playerColor) {
      setSelectedSquare(square);
      return;
    }

    if (selectedSquare) {
      const isLegal = legalMovesForSelected.some((m) => m.to === square);
      if (isLegal) {
        attemptMove(selectedSquare, square);
        return;
      }
    }

    setSelectedSquare(null);
  };

  const attemptMove = (from: Square, to: Square) => {
    const piece = game.get(from);
    const isPromotion =
      piece?.type === 'p' &&
      ((piece.color === 'w' && to.endsWith('8')) || (piece.color === 'b' && to.endsWith('1')));

    if (isPromotion) {
      setPendingPromotion({ from, to });
      return;
    }

    executeMove(from, to);
    setSelectedSquare(null);
  };

  const executeMove = (from: Square, to: Square, promotion?: string) => {
    try {
      const targetPiece = game.get(to);
      const isCapture = Boolean(targetPiece);

      const moveObj = game.move({
        from,
        to,
        promotion: promotion || undefined,
      });

      if (moveObj) {
        if (game.inCheck()) {
          sounds.playCheck();
        } else if (isCapture) {
          sounds.playCapture();
        } else {
          sounds.playMove();
        }

        onMove({
          from,
          to,
          promotion,
          san: moveObj.san,
          captured: moveObj.captured,
        });
      }
    } catch (e) {
      console.error('Invalid move attempt:', e);
    }
  };

  const handlePromotionSelect = (promotionPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    executeMove(pendingPromotion.from, pendingPromotion.to, promotionPiece);
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (!interactive || !isPlayerTurn) return;
    const piece = game.get(square);
    if (!piece || piece.color !== game.turn() || piece.color !== playerColor) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', square);
    setSelectedSquare(square);
  };

  const handleDragOver = (e: React.DragEvent, square: Square) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSquare !== square) {
      setDragOverSquare(square);
    }
  };

  const handleDragLeave = () => {
    setDragOverSquare(null);
  };

  const handleDrop = (e: React.DragEvent, toSquare: Square) => {
    e.preventDefault();
    setDragOverSquare(null);
    if (!interactive || !isPlayerTurn) return;

    const fromSquare = e.dataTransfer.getData('text/plain') as Square;
    if (!fromSquare || fromSquare === toSquare) return;

    // Check if legal
    const moves = game.moves({ square: fromSquare, verbose: true });
    const isLegal = moves.some((m) => m.to === toSquare);
    if (isLegal) {
      attemptMove(fromSquare, toSquare);
    }
  };

  const ranksDisplay = playerColor === 'b' ? [...RANKS].reverse() : RANKS;
  const filesDisplay = playerColor === 'b' ? [...FILES].reverse() : FILES;

  // Coordinate helper for visual arrows
  const getSquareCoordinates = (sq: string) => {
    if (sq.length < 2) return null;
    const f = sq[0];
    const r = sq[1];
    const colIdx = filesDisplay.indexOf(f);
    const rowIdx = ranksDisplay.indexOf(r);
    if (colIdx === -1 || rowIdx === -1) return null;
    return {
      x: ((colIdx + 0.5) / 8) * 100,
      y: ((rowIdx + 0.5) / 8) * 100,
    };
  };

  return (
    <div className="relative select-none touch-manipulation max-w-[560px] w-full mx-auto">
      {/* Material Advantage Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-1.5 text-xs text-stone-600 dark:text-stone-300">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-stone-800 dark:text-stone-200">
            {playerColor === 'w' ? 'White (You)' : 'White (Luke)'}
          </span>
          {materialBalance.diff > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
              +{materialBalance.diff}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {materialBalance.diff < 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
              +{Math.abs(materialBalance.diff)}
            </span>
          )}
          <span className="font-semibold text-stone-800 dark:text-stone-200">
            {playerColor === 'b' ? 'Black (You)' : 'Black (Luke)'}
          </span>
        </div>
      </div>

      {/* Board Outer Wooden Frame */}
      <div className="p-2 sm:p-3 bg-amber-950/20 dark:bg-stone-900/60 rounded-2xl border border-amber-900/10 dark:border-stone-800 shadow-md">
        <div className="relative aspect-square w-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden border border-amber-900/20 shadow-inner">
          {ranksDisplay.map((rank, rankIdx) =>
            filesDisplay.map((file, fileIdx) => {
              const square = `${file}${rank}` as Square;
              const isDarkSquare = (rankIdx + fileIdx) % 2 === 1;
              const piece = game.get(square);

              const isSelected = selectedSquare === square;
              const isLastMoveFrom = lastMove?.from === square;
              const isLastMoveTo = lastMove?.to === square;
              const isKingCheck = kingInCheckSquare === square;
              const isCenter = CENTER_SQUARES.includes(square);
              const isUndefendedWarning = undefendedSquares.has(square);
              const isHintSource = hintHighlight?.from === square;
              const isHintTarget = hintHighlight?.to === square;
              const isDragTarget = dragOverSquare === square;

              const legalDest = legalMovesForSelected.find((m) => m.to === square);
              const isDraggable =
                interactive &&
                isPlayerTurn &&
                Boolean(piece && piece.color === game.turn() && piece.color === playerColor);

              return (
                <div
                  key={square}
                  onClick={() => handleSquareClick(square)}
                  onDragOver={(e) => handleDragOver(e, square)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, square)}
                  className={`relative flex items-center justify-center transition-colors cursor-pointer ${
                    isDarkSquare
                      ? 'bg-[#B58863] text-[#F0D9B5]'
                      : 'bg-[#F0D9B5] text-[#B58863]'
                  } ${
                    isSelected
                      ? 'ring-4 ring-inset ring-amber-400 bg-amber-200/60'
                      : ''
                  } ${
                    isLastMoveFrom || isLastMoveTo
                      ? 'bg-amber-300/40'
                      : ''
                  } ${
                    isKingCheck
                      ? 'ring-4 ring-inset ring-rose-500 bg-rose-400/50 animate-pulse'
                      : ''
                  } ${
                    isHintSource || isHintTarget
                      ? 'ring-4 ring-inset ring-sky-400 bg-sky-200/50'
                      : ''
                  } ${
                    isDragTarget
                      ? 'ring-4 ring-inset ring-emerald-400 bg-emerald-200/40'
                      : ''
                  }`}
                  data-square={square}
                >
                  {/* Coach Vision: Center squares indicator ("The High Ground") */}
                  {coachVisionEnabled && isCenter && (
                    <div
                      className="absolute inset-1.5 border border-dashed border-emerald-600/40 rounded-sm pointer-events-none"
                      title="Central High Ground (e4, d4, e5, d5)"
                    />
                  )}

                  {/* Coach Vision: Threat / undefended warning */}
                  {isUndefendedWarning && (
                    <div
                      className="absolute inset-0.5 border-2 border-rose-500/80 rounded-md animate-pulse pointer-events-none"
                      title="Caution: This teammate is under attack!"
                    />
                  )}

                  {/* Rank / File Coordinate Labels on edges */}
                  {fileIdx === 0 && (
                    <span className="absolute top-0.5 left-1 text-[10px] sm:text-xs font-semibold opacity-70 pointer-events-none">
                      {rank}
                    </span>
                  )}
                  {rankIdx === 7 && (
                    <span className="absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-semibold opacity-70 pointer-events-none">
                      {file}
                    </span>
                  )}

                  {/* Chess Piece with Native Drag & Drop */}
                  {piece && (
                    <div
                      draggable={isDraggable}
                      onDragStart={(e) => handleDragStart(e, square)}
                      className={`w-[85%] h-[85%] flex items-center justify-center transform transition-transform active:scale-95 ${
                        isDraggable ? 'cursor-grab active:cursor-grabbing hover:scale-105' : ''
                      }`}
                    >
                      <ChessPieceIcon type={piece.type} color={piece.color} />
                    </div>
                  )}

                  {/* Legal Move Indicators */}
                  {legalDest && !legalDest.isCapture && (
                    <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-600/70 pointer-events-none shadow-sm" />
                  )}
                  {legalDest && legalDest.isCapture && (
                    <div className="absolute inset-1 rounded-full border-4 border-rose-500/80 pointer-events-none shadow-sm" />
                  )}
                </div>
              );
            })
          )}

          {/* SVG Visual Arrows Layer */}
          {visualArrows.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <marker id="arrow-emerald" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#059669" />
                </marker>
                <marker id="arrow-rose" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#E11D48" />
                </marker>
                <marker id="arrow-amber" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#D97706" />
                </marker>
                <marker id="arrow-sky" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#0284C7" />
                </marker>
              </defs>

              {visualArrows.map((arr, idx) => {
                const start = getSquareCoordinates(arr.from);
                const end = getSquareCoordinates(arr.to);
                if (!start || !end) return null;

                const colorKey = arr.color || 'amber';
                const strokeColor =
                  colorKey === 'emerald'
                    ? '#059669'
                    : colorKey === 'rose'
                    ? '#E11D48'
                    : colorKey === 'sky'
                    ? '#0284C7'
                    : '#D97706';

                return (
                  <line
                    key={idx}
                    x1={`${start.x}%`}
                    y1={`${start.y}%`}
                    x2={`${end.x}%`}
                    y2={`${end.y}%`}
                    stroke={strokeColor}
                    strokeWidth="3.5"
                    strokeOpacity="0.85"
                    strokeLinecap="round"
                    markerEnd={`url(#arrow-${colorKey})`}
                  />
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Pawn Promotion Modal */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-30 p-4 rounded-2xl animate-fade-in">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl shadow-2xl max-w-xs w-full text-center">
            <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
              Promote Your Pawn!
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Your brave soldier reached the enemy base. Choose their promotion:
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePromotionSelect(p)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-stone-200 dark:border-stone-700 hover:border-amber-400 transition-colors"
                >
                  <div className="w-10 h-10 mb-1">
                    <ChessPieceIcon type={p} color={playerColor} />
                  </div>
                  <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 capitalize">
                    {p === 'q' ? 'Queen' : p === 'r' ? 'Rook' : p === 'b' ? 'Bishop' : 'Knight'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
