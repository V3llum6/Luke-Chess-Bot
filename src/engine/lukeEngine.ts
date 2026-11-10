import { Chess, Square, Move } from 'chess.js';

// Positional piece values (in centipawns)
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square bonus tables (indexed 0..63 where 0 is a8, 63 is h1)
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

function evaluateBoard(game: Chess): number {
  let score = 0;
  const board = game.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type] || 0;
      let positionalVal = 0;
      const idx = r * 8 + c;

      if (piece.type === 'p') {
        positionalVal = piece.color === 'w' ? PAWN_TABLE[63 - idx] : PAWN_TABLE[idx];
      } else if (piece.type === 'n') {
        positionalVal = piece.color === 'w' ? KNIGHT_TABLE[63 - idx] : KNIGHT_TABLE[idx];
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
    // Avoid blunder: if there's a free capture, take it 50% of the time
    const captureMoves = candidatePool.filter((m) => m.captured && m.captured !== 'p');
    if (captureMoves.length > 0 && Math.random() < 0.5) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }

    // Prefer developing knights, bishops, or pushing center pawns
    const naturalMoves = candidatePool.filter(
      (m) =>
        ['n', 'b', 'p'].includes(m.piece) &&
        ['d5', 'e5', 'c6', 'f6', 'd6', 'e6', 'c5', 'Nf6', 'Nc6', 'Be7', 'Bc5'].some(
          (sq) => m.to === sq || m.san.includes(sq)
        )
    );
    if (naturalMoves.length > 0 && Math.random() < 0.7) {
      return naturalMoves[Math.floor(Math.random() * naturalMoves.length)];
    }

    return candidatePool[Math.floor(Math.random() * candidatePool.length)];
  }

  // 2. Novice Coach (~950 Elo)
  // Castles early, takes undefended pieces, avoids blundering queen
  if (levelId === 'novice' || levelId === 'friendly') {
    // Priority 1: Checkmate if available!
    const mateMove = candidatePool.find((m) => m.san.includes('#'));
    if (mateMove) return mateMove;

    // Priority 2: Castle if available
    const castleMove = candidatePool.find((m) => m.san.includes('O-O'));
    if (castleMove && Math.random() < 0.85) return castleMove;

    // Priority 3: Captures
    const safeCaptures = candidatePool
      .filter((m) => Boolean(m.captured))
      .sort((a, b) => (PIECE_VALUES[b.captured || 'p'] || 0) - (PIECE_VALUES[a.captured || 'p'] || 0));

    if (safeCaptures.length > 0 && Math.random() < 0.75) {
      return safeCaptures[0];
    }

    // 1-ply evaluation for best positional move
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
  // Multi-ply minimax search with alpha-beta pruning
  const depth = levelId === 'master' ? 3 : 2;

  let bestMove = candidatePool[0];
  let bestScore = isBlackTurn ? Infinity : -Infinity;
  const alpha = -Infinity;
  const beta = Infinity;

  // Shuffle candidate moves for organic game variation
  const shuffledMoves = [...candidatePool].sort(() => 0.5 - Math.random());

  for (const move of shuffledMoves) {
    game.move(move);
    const score = minimax(game, depth - 1, alpha, beta, !isBlackTurn);
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

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return evaluateBoard(game);

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
