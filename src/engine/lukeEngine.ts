import { Chess, Square, Move, PieceSymbol, Color } from 'chess.js';
import { MoveQuality, OpeningInfo } from '../types.ts';

// Positional piece values (in centipawns)
export const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export const PIECE_NAMES: Record<string, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

// Piece-square tables (indexed 0..63 where 0 is a8, 63 is h1; from Black's top-down view)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MIDDLE_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

// Fast static + terminal board evaluation (Positive = White ahead, Negative = Black ahead)
export function evaluateBoard(game: Chess, depthRemaining = 0): number {
  if (game.isCheckmate()) {
    // Prefer faster checkmates
    return game.turn() === 'w' ? -(900000 + depthRemaining * 100) : 900000 + depthRemaining * 100;
  }
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
    return 0;
  }

  let score = 0;
  const board = game.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type] || 0;
      const whiteIdx = r * 8 + c;
      const blackIdx = (7 - r) * 8 + c;
      const tableIdx = piece.color === 'w' ? whiteIdx : blackIdx;

      let positionalVal = 0;
      switch (piece.type) {
        case 'p':
          positionalVal = PAWN_TABLE[tableIdx];
          break;
        case 'n':
          positionalVal = KNIGHT_TABLE[tableIdx];
          break;
        case 'b':
          positionalVal = BISHOP_TABLE[tableIdx];
          break;
        case 'r':
          positionalVal = ROOK_TABLE[tableIdx];
          break;
        case 'q':
          positionalVal = QUEEN_TABLE[tableIdx];
          break;
        case 'k':
          positionalVal = KING_MIDDLE_TABLE[tableIdx];
          break;
      }

      const totalVal = baseVal + positionalVal;
      if (piece.color === 'w') {
        score += totalVal;
      } else {
        score -= totalVal;
      }
    }
  }

  return score;
}

// MVV-LVA Move Ordering for blazingly fast Alpha-Beta Pruning
function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (a.san.includes('#')) scoreA += 10000;
    if (b.san.includes('#')) scoreB += 10000;

    if (a.captured) {
      scoreA += 10 * (PIECE_VALUES[a.captured] || 100) - (PIECE_VALUES[a.piece] || 100);
    }
    if (b.captured) {
      scoreB += 10 * (PIECE_VALUES[b.captured] || 100) - (PIECE_VALUES[b.piece] || 100);
    }

    if (a.promotion) scoreA += 800;
    if (b.promotion) scoreB += 800;

    if (a.san.includes('+')) scoreA += 150;
    if (b.san.includes('+')) scoreB += 150;

    if (a.san === 'O-O' || a.san === 'O-O-O') scoreA += 120;
    if (b.san === 'O-O' || b.san === 'O-O-O') scoreB += 120;

    return scoreB - scoreA;
  });
}

// Safety check: Does this move directly allow opponent to play checkmate on next ply?
function allowsDirectMate(game: Chess, move: Move): boolean {
  try {
    game.move(move);
    const opponentMoves = game.moves({ verbose: true });
    let canMate = false;
    for (const oppMove of opponentMoves) {
      if (oppMove.san.includes('#')) {
        canMate = true;
        break;
      }
    }
    game.undo();
    return canMate;
  } catch {
    return false;
  }
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game, depth);
  }

  const moves = orderMoves(game.moves({ verbose: true }));
  if (moves.length === 0) return evaluateBoard(game, depth);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Finds the objectively strongest move using depth-2/3 search
export function getBestEngineMove(game: Chess, depth = 2): Move | null {
  const legalMoves = orderMoves(game.moves({ verbose: true }));
  if (legalMoves.length === 0) return null;

  const isMaximizing = game.turn() === 'w';
  let bestMove = legalMoves[0];
  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (const move of legalMoves) {
    game.move(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing);
    game.undo();

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return bestMove;
}

export function pickLukeMove(game: Chess, levelId: string): Move | null {
  const legalMoves = game.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const isBlackTurn = game.turn() === 'b';

  // Filter out moves that suicide into mate-in-1 if better legal moves exist
  const safeMoves = legalMoves.filter((m) => !allowsDirectMate(game, m));
  const candidatePool = safeMoves.length > 0 ? safeMoves : legalMoves;

  // 1. Gentle Guide (~500 Elo)
  // Forgiving, natural beginner play. Develops pawns and minor pieces.
  if (levelId === 'gentle') {
    const captureMoves = candidatePool.filter((m) => m.captured && m.captured !== 'p');
    if (captureMoves.length > 0 && Math.random() < 0.5) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }

    const naturalMoves = candidatePool.filter(
      (m) =>
        ['n', 'b', 'p'].includes(m.piece) &&
        ['d5', 'e5', 'c6', 'f6', 'd6', 'e6', 'c5', 'Nf6', 'Nc6', 'Be7', 'Bc5', 'd4', 'e4', 'Nf3', 'Nc3'].some(
          (sq) => m.to === sq || m.san.includes(sq)
        )
    );
    if (naturalMoves.length > 0 && Math.random() < 0.7) {
      return naturalMoves[Math.floor(Math.random() * naturalMoves.length)];
    }

    return candidatePool[Math.floor(Math.random() * candidatePool.length)];
  }

  // 2. Novice Coach (~950 Elo)
  if (levelId === 'novice' || levelId === 'friendly') {
    const mateMove = candidatePool.find((m) => m.san.includes('#'));
    if (mateMove) return mateMove;

    const castleMove = candidatePool.find((m) => m.san.includes('O-O'));
    if (castleMove && Math.random() < 0.85) return castleMove;

    const safeCaptures = candidatePool
      .filter((m) => Boolean(m.captured))
      .sort((a, b) => (PIECE_VALUES[b.captured || 'p'] || 0) - (PIECE_VALUES[a.captured || 'p'] || 0));

    if (safeCaptures.length > 0 && Math.random() < 0.75) {
      return safeCaptures[0];
    }

    let bestMove = candidatePool[0];
    let bestScore = isBlackTurn ? Infinity : -Infinity;

    for (const move of candidatePool) {
      game.move(move);
      const score = evaluateBoard(game);
      game.undo();

      if (isBlackTurn) {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } else {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    return bestMove;
  }

  // 3. Strategist Luke (~1350 Elo) & Master Luke (~1750 Elo)
  const depth = levelId === 'master' ? 3 : 2;
  const orderedPool = orderMoves(candidatePool);

  let bestMove = orderedPool[0];
  let bestScore = isBlackTurn ? Infinity : -Infinity;

  for (const move of orderedPool) {
    game.move(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isBlackTurn);
    game.undo();

    if (isBlackTurn) {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return bestMove;
}

// Translate SAN move into clear, readable English for beginners
export function translateMoveToPlainEnglish(san: string): string {
  if (!san) return '';
  if (san === 'O-O') return 'Castle Kingside (King safe!)';
  if (san === 'O-O-O') return 'Castle Queenside (King safe!)';

  const clean = san.replace(/[+#]/g, '');
  const pieceChar = clean[0];
  const isCapture = clean.includes('x');
  const isCheck = san.includes('+');
  const isMate = san.includes('#');

  let pieceName = 'Pawn';
  if (pieceChar === 'N') pieceName = 'Knight';
  else if (pieceChar === 'B') pieceName = 'Bishop';
  else if (pieceChar === 'R') pieceName = 'Rook';
  else if (pieceChar === 'Q') pieceName = 'Queen';
  else if (pieceChar === 'K') pieceName = 'King';

  const promoMatch = clean.match(/=([QRBN])/);
  const promoText = promoMatch ? ` -> ${PIECE_NAMES[promoMatch[1].toLowerCase()]}` : '';
  const withoutPromo = clean.replace(/=[QRBN]/, '');
  const destSquare = withoutPromo.slice(-2);

  const verb = isCapture ? 'captures on' : 'to';
  const suffix = isMate ? ' (Checkmate!)' : isCheck ? ' (Check!)' : '';

  return `${pieceName} ${verb} ${destSquare}${promoText}${suffix}`;
}

// Classify Move Quality based on centipawn delta from mover's perspective
export function classifyMoveQuality(
  beforeScore: number,
  afterScore: number,
  moverColor: Color,
  isCheckmate: boolean
): MoveQuality {
  if (isCheckmate) return 'brilliant';
  const delta = moverColor === 'w' ? afterScore - beforeScore : beforeScore - afterScore;

  if (delta >= 150) return 'brilliant';
  if (delta >= 40) return 'great';
  if (delta >= -60) return 'good';
  if (delta >= -140) return 'inaccuracy';
  if (delta >= -280) return 'mistake';
  return 'blunder';
}

// Check if a move walks a valuable piece into an unsafe/hanging square (Beginner Safety Guard)
export function checkMoveSafety(
  game: Chess,
  from: Square,
  to: Square
): { isRisky: boolean; warningText: string; san: string } {
  const clone = new Chess(game.fen());
  const movingPiece = clone.get(from);
  if (!movingPiece) return { isRisky: false, warningText: '', san: '' };

  let moveObj: Move;
  try {
    moveObj = clone.move({ from, to, promotion: 'q' });
  } catch {
    return { isRisky: false, warningText: '', san: '' };
  }

  // Never warn on checkmates or equal/winning captures
  if (clone.isCheckmate()) return { isRisky: false, warningText: '', san: moveObj.san };

  const opponentColor: Color = movingPiece.color === 'w' ? 'b' : 'w';
  const moverColor: Color = movingPiece.color;
  const pieceValue = PIECE_VALUES[movingPiece.type] || 100;
  const capturedValue = moveObj.captured ? PIECE_VALUES[moveObj.captured] || 100 : 0;

  // Check if the destination square is attacked by opponent
  const isAttackedByOpponent = clone.isAttacked(to, opponentColor);
  if (!isAttackedByOpponent) {
    return { isRisky: false, warningText: '', san: moveObj.san };
  }

  // Check if the piece on `to` is defended by any friendly piece
  const isDefended = clone.isAttacked(to, moverColor);

  // Find the lowest-value opponent attacker
  const oppMoves = clone.moves({ verbose: true }).filter((m) => m.to === to);
  let lowestAttackerVal = Infinity;
  let lowestAttackerPiece = '';
  for (const m of oppMoves) {
    const val = PIECE_VALUES[m.piece] || 100;
    if (val < lowestAttackerVal) {
      lowestAttackerVal = val;
      lowestAttackerPiece = PIECE_NAMES[m.piece] || 'piece';
    }
  }

  // Case 1: Piece lands on an undefended square attacked by opponent and didn't capture equal/more material
  if (!isDefended && pieceValue > capturedValue && pieceValue >= 300) {
    const name = PIECE_NAMES[movingPiece.type] || 'piece';
    const oppLabel = opponentColor === 'w' ? 'White' : 'Black';
    return {
      isRisky: true,
      san: moveObj.san,
      warningText: `Hold on! Moving your ${name} to ${to} leaves it undefended—${oppLabel}'s ${lowestAttackerPiece} can capture it for free!`,
    };
  }

  // Case 2: High-value piece (Queen/Rook) walks onto a square attacked by a lower-value piece (like a Pawn/Bishop/Knight)
  if (pieceValue - capturedValue > lowestAttackerVal + 100 && pieceValue >= 500) {
    const name = PIECE_NAMES[movingPiece.type] || 'piece';
    return {
      isRisky: true,
      san: moveObj.san,
      warningText: `Careful! Your ${name} is worth much more than their ${lowestAttackerPiece}. Even if defended, trading down loses big points!`,
    };
  }

  return { isRisky: false, warningText: '', san: moveObj.san };
}

// Convert centipawn evaluation into a beginner-friendly summary
export function getAdvantageSummary(evalScore: number, playerColor: Color): {
  label: string;
  whitePercent: number;
} {
  // Clamp between -800 and +800 for visual bar
  const clamped = Math.max(-800, Math.min(800, evalScore));
  // Smooth sigmoid-like percentage for White bar width (10% to 90%)
  const whitePercent = Math.round(50 + (clamped / 800) * 40);

  const playerRelative = playerColor === 'w' ? evalScore : -evalScore;

  let label = 'Even Game';
  if (Math.abs(evalScore) >= 800000) {
    label = playerRelative > 0 ? 'Checkmate Won!' : 'Checkmate';
  } else if (playerRelative >= 350) {
    label = 'Big Advantage for You!';
  } else if (playerRelative >= 120) {
    label = 'You are slightly ahead';
  } else if (playerRelative <= -350) {
    label = 'Luke has a big lead';
  } else if (playerRelative <= -120) {
    label = 'Luke has a slight edge';
  }

  return { label, whitePercent };
}

// Beginner-Friendly Opening Recognizer
export function identifyOpening(moveSans: string[]): OpeningInfo | null {
  const line = moveSans.slice(0, 8).join(' ');
  if (moveSans.length === 0) return null;

  if (line.startsWith('e4 e5 Nf3 Nc6 Bc4 Bc5')) {
    return {
      name: 'Italian Game (Giuoco Piano)',
      nickname: 'The Classic Beginner Opening',
      summary: 'Both sides smoothly develop Knights and Bishops toward the center.',
      tip: 'Look to castle your King soon and support your center pawns with c3 and d3.',
    };
  }
  if (line.startsWith('e4 e5 Nf3 Nc6 Bc4')) {
    return {
      name: 'Italian Game',
      nickname: 'Aiming at the Weakest Square (f7)',
      summary: 'White eyes the vulnerable f7 square right next to Black’s King.',
      tip: 'Develop your other Knight or Castle to safety—teamwork wins!',
    };
  }
  if (line.startsWith('e4 e5 Nf3 Nc6 Bb5')) {
    return {
      name: 'Ruy Lopez (Spanish Opening)',
      nickname: 'The Grandmaster Favorite',
      summary: 'White puts immediate pressure on the Knight defending Black’s e5 center pawn.',
      tip: 'Castle early and keep your center strong.',
    };
  }
  if (line.startsWith('e4 e5 Qh5') || line.startsWith('e4 e5 Bc4 Bc5 Qh5')) {
    return {
      name: "Scholar's Mate Setup",
      nickname: 'Early Queen Attack Alert!',
      summary: 'White brought the Queen out early to threaten checkmate on f7.',
      tip: 'Keep calm! Block or defend f7 with your Pawn or Knight—don’t let the Queen bully your army.',
    };
  }
  if (line.startsWith('e4 c5')) {
    return {
      name: 'Sicilian Defense',
      nickname: 'The Counter-Attacking Defense',
      summary: 'Black fights for the center asymmetrically from the wing.',
      tip: 'Develop your Knights toward the center and prepare to castle.',
    };
  }
  if (line.startsWith('e4 e6')) {
    return {
      name: 'French Defense',
      nickname: 'The Solid Fortress',
      summary: 'Black builds a sturdy pawn chain to challenge White’s center on move 2.',
      tip: 'Push d4 to claim the full center high ground.',
    };
  }
  if (line.startsWith('e4 c6')) {
    return {
      name: 'Caro-Kann Defense',
      nickname: 'Steady & Safe Structure',
      summary: 'Black prepares to challenge the center without trapping their Bishop.',
      tip: 'Claim the high ground with d4 and develop smoothly.',
    };
  }
  if (line.startsWith('d4 d5 c4')) {
    return {
      name: "Queen's Gambit",
      nickname: 'Fighting for the Center',
      summary: 'White offers a side pawn to distract Black’s central pawn.',
      tip: 'Keep developing your Knights and Bishops—if they take on c4, you can win it back easily.',
    };
  }
  if (line.startsWith('d4 Nf6 Bf4') || line.startsWith('d4 d5 Bf4')) {
    return {
      name: 'London System',
      nickname: 'The Cozy Pyramid Setup',
      summary: 'White builds an ultra-safe, easy-to-remember triangle of pawns and pieces.',
      tip: 'Complete your pawn triangle (d4, e3, c3) and tuck your King away.',
    };
  }
  if (line.startsWith('e4 e5')) {
    return {
      name: "King's Pawn Game",
      nickname: 'Open & Active Battle',
      summary: 'Both players staked their flag directly in the central high ground!',
      tip: 'Next step: bring out your Knights (Nf3/Nc3) before moving your Queen.',
    };
  }
  if (line.startsWith('e4')) {
    return {
      name: "King's Pawn Opening",
      nickname: 'Best by Test',
      summary: 'Opens lines for both your Queen and Bishop immediately.',
      tip: 'Follow up by developing your Knights and Bishops onto the field.',
    };
  }
  if (line.startsWith('d4')) {
    return {
      name: "Queen's Pawn Opening",
      nickname: 'Solid Central Control',
      summary: 'Plants a well-defended pawn directly in the center.',
      tip: 'Bring out your Knights and Bishops to support the center.',
    };
  }

  return null;
}
