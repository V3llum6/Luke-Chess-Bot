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

// Simplified piece-square bonus tables for basic positional awareness
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
        positionalVal = piece.color === 'w' ? PAWN_TABLE[idx] : PAWN_TABLE[63 - idx];
      } else if (piece.type === 'n') {
        positionalVal = piece.color === 'w' ? KNIGHT_TABLE[idx] : KNIGHT_TABLE[63 - idx];
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

export function pickLukeMove(game: Chess, levelId: string): Move | null {
  const legalMoves = game.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const isBlackTurn = game.turn() === 'b';

  // 1. Gentle Coach (~500 Elo)
  // Plays mostly natural moves, prioritizes developing pawns/knights, 25% chance of random move
  if (levelId === 'gentle') {
    // Check if there is a safe capture or simple central move
    const captureMoves = legalMoves.filter((m) => m.captured && m.captured !== 'p');
    if (captureMoves.length > 0 && Math.random() < 0.6) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }

    // Prefer developing knights or central pawns
    const devMoves = legalMoves.filter(
      (m) =>
        ['n', 'b', 'p'].includes(m.piece) &&
        ['d5', 'e5', 'c6', 'f6', 'd6', 'e6', 'c5', 'Nf6', 'Nc6'].some((sq) => m.to === sq || m.san.includes(sq))
    );
    if (devMoves.length > 0 && Math.random() < 0.7) {
      return devMoves[Math.floor(Math.random() * devMoves.length)];
    }

    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  // 2. Friendly Sparring Partner (~850 Elo)
  // Castles if available, takes free pieces, avoids hanging queen
  if (levelId === 'friendly') {
    // Castle if legal
    const castleMove = legalMoves.find((m) => m.san.includes('O-O'));
    if (castleMove && Math.random() < 0.8) return castleMove;

    // Capture pieces if advantageous
    const safeCaptures = legalMoves
      .filter((m) => Boolean(m.captured))
      .sort((a, b) => (PIECE_VALUES[b.captured || 'p'] || 0) - (PIECE_VALUES[a.captured || 'p'] || 0));

    if (safeCaptures.length > 0 && Math.random() < 0.75) {
      return safeCaptures[0];
    }

    // Score moves with 1-ply eval
    let bestMove = legalMoves[0];
    let bestScore = isBlackTurn ? Infinity : -Infinity;

    for (const move of legalMoves) {
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

  // 3. Strategist Luke (~1250 Elo) & Master Luke (~1700 Elo)
  // Minimax with alpha-beta search
  const depth = levelId === 'master' ? 3 : 2;

  let bestMove = legalMoves[0];
  let bestScore = isBlackTurn ? Infinity : -Infinity;
  const alpha = -Infinity;
  const beta = Infinity;

  // Shuffle legal moves slightly so games have variety
  const shuffledMoves = [...legalMoves].sort(() => 0.5 - Math.random());

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
