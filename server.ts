import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Comprehensive Coach Luke System Instruction strictly enforcing the User's Pedagogical Framework
const LUKE_SYSTEM_INSTRUCTION = `You are Luke, a friendly, patient, and approachable chess tutor. Your target audience includes absolute beginners and non-technical players who want to build strategic intuition without getting bogged down by heavy computer analysis or intimidating jargon.

TONE & PERSONALITY:
- Encouraging, conversational, direct, and patient.
- Never snobbish or overly mathematical.
- Analogy Framework: Always use intuitive real-world metaphors (e.g. control of the center as "controlling the high ground", piece activity as "getting your team out onto the field", pawns as "soldiers holding hands in a chain", castling as "tucking your King into his safe room before the storm").

ELO TIER ADAPTATION:
Adjust your vocabulary and feedback depth based on the student's rating:
- Beginner (< 800 ELO): Focus purely on piece movements, basic piece safety (hanging/undefended pieces), 1-step captures, and claiming the central high ground. Avoid deep variations.
- Novice (800 – 1200 ELO): Teach basic tactical patterns (forks, pins, double attacks, skewers), king safety, and opening fundamentals (don't move the same piece twice, develop knights before bishops).
- Intermediate (1200 – 1600 ELO): Discuss long-term plans, pawn structures, weak squares, planning 2-3 moves ahead, and basic endgame conversions (King + Rook checkmate).
- Advanced / Master (1600+ ELO): Focus on positional trade-offs, pawn levers, prophylactic thinking ("What does my opponent want to do?"), and deep calculation paths.

MANDATORY RESPONSE FORMAT RULES:
Every instructional reaction MUST strictly follow this predictable 3-part layout:
1. The Move: [Acknowledge move neutrally. ALWAYS translate raw algebraic notation into plain English. E.g. "Nxd5 (Knight captures the pawn on d5)" or "e4 (moving your Pawn two squares forward to claim the center)"]
2. The Strategic Insight: [Apply the "One Advice Rule"—give exactly ONE key strategic lesson per turn using an intuitive metaphor. Explain WHY it worked or what opportunity was missed. Never dump multiple variations.]
3. Luke's Micro-Challenge: [End with a simple, encouraging follow-up question or quick multiple-choice check to test active recall before continuing.]

PEDAGOGICAL SAFEGUARDS:
- No Direct Answers First: When a blunder occurs or a hint is asked for, NEVER reveal the exact winning move immediately. Provide a gentle hint first (e.g. "Look closely at your undefended Knight on c6—does Black have a way to attack it?") to encourage active recall.
- Interactive Visual Notation: When explaining pins, forks, or threats, specify the affected squares so visual arrows can be drawn on the board.`;

// Helper: Translate raw SAN notation to plain English
function translateMoveToEnglish(san: string): string {
  if (!san) return 'Move';
  if (san === 'O-O') return 'O-O (Kingside Castling: King slides to g1 and Rook hops to f1)';
  if (san === 'O-O-O') return 'O-O-O (Queenside Castling: King slides to c1 and Rook hops to d1)';

  const piecePrefix = san[0];
  const isCapture = san.includes('x');
  const isCheck = san.includes('+');
  const isCheckmate = san.includes('#');
  const targetSquare = san.replace(/[+#x=QRNB]/g, '').slice(-2);

  let pieceName = 'Pawn';
  if (piecePrefix === 'N') pieceName = 'Knight';
  else if (piecePrefix === 'B') pieceName = 'Bishop';
  else if (piecePrefix === 'R') pieceName = 'Rook';
  else if (piecePrefix === 'Q') pieceName = 'Queen';
  else if (piecePrefix === 'K') pieceName = 'King';

  let action = isCapture ? `captures on ${targetSquare}` : `moves to ${targetSquare}`;
  let extra = isCheckmate ? ' with checkmate!' : isCheck ? ' with check!' : '';

  return `${san} (${pieceName} ${action}${extra})`;
}

// Endpoint: Move Feedback
app.post('/api/coach/feedback', async (req, res) => {
  try {
    const { fen, move, moveHistory, userElo, coachLevel, isUserMove, capturedPiece, isCheck, blunderDetected } = req.body;

    const eloNum = Number(userElo) || 600;
    const tierName = eloNum < 800 ? 'Beginner (<800)' : eloNum < 1200 ? 'Novice (800-1200)' : eloNum < 1600 ? 'Intermediate (1200-1600)' : 'Master (1600+)';

    if (!ai) {
      // Local fallback with exact 3-part layout and plain English
      const feedback = getStructuredHeuristicFeedback(move, isUserMove, eloNum, capturedPiece, isCheck, blunderDetected);
      return res.json({
        ...feedback,
        source: 'local',
      });
    }

    const prompt = `Student Elo: ~${eloNum} (${tierName}).
Move made: ${move} (${translateMoveToEnglish(move)})
Is student move: ${isUserMove ? 'Yes' : 'No (Luke played this move)'}
Captured piece: ${capturedPiece || 'none'}
Check state: ${isCheck ? 'King is in check!' : 'None'}
Blunder flag: ${blunderDetected ? 'Potential blunder/hanging piece' : 'Normal move'}
Current FEN: ${fen}
Recent moves: ${(moveHistory || []).slice(-6).join(', ')}

Respond as Coach Luke in JSON format with these exact keys:
- theMove: Brief neutral move acknowledgment with immediate plain English translation (e.g. "${translateMoveToEnglish(move)}").
- strategicInsight: Exactly ONE key strategic takeaway adhering to the "One Advice Rule", using an intuitive analogy (e.g. controlling the center as "holding the high ground", piece activity as "getting your team on the field"). Never dump multiple lines. If a blunder occurred, apply the "No Direct Answers First" safeguard—give a gentle hint about the danger instead of the direct answer.
- microChallenge: A short, friendly follow-up question or quick check testing the student's active recall.
- challengeOptions: Array of 3 short multiple-choice answer strings (max 6 words each) for the micro-challenge.
- correctOptionIndex: Integer (0, 1, or 2) pointing to the correct choice.
- visualArrows: Array of 1-2 objects each with 'from' (square e.g. "e2") and 'to' (square e.g. "e4") and 'color' ("amber", "emerald", "rose", "sky") indicating the move or threat.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: LUKE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      theMove: parsed.theMove || translateMoveToEnglish(move),
      strategicInsight: parsed.strategicInsight || getFallbackInsight(move, isUserMove, eloNum),
      microChallenge: parsed.microChallenge || 'Which piece on your side is ready to join the team next?',
      challengeOptions: parsed.challengeOptions || ['Develop a knight or bishop', 'Move a rook pawn', 'Push King forward'],
      correctOptionIndex: typeof parsed.correctOptionIndex === 'number' ? parsed.correctOptionIndex : 0,
      visualArrows: parsed.visualArrows || extractArrowsFromMove(move),
      source: 'gemini',
    });
  } catch (error: any) {
    console.error('Error generating coach feedback:', error);
    const { move, isUserMove, userElo, capturedPiece, isCheck, blunderDetected } = req.body;
    const feedback = getStructuredHeuristicFeedback(move, isUserMove, Number(userElo) || 600, capturedPiece, isCheck, blunderDetected);
    return res.json({
      ...feedback,
      source: 'fallback',
    });
  }
});

// Endpoint: Coach Hint (Strictly obeys "No Direct Answers First")
app.post('/api/coach/hint', async (req, res) => {
  try {
    const { fen, userElo, legalMoves, bestMoveHint } = req.body;
    const eloNum = Number(userElo) || 600;

    if (!ai) {
      return res.json({
        hintText: `Look closely at your central high ground (the d4, e4, d5, e5 squares). Is one of your team members ready to step into the town square?`,
        strategicInsight: 'Always seek to activate dormant pieces before launching solo attacks.',
        microChallenge: 'Which piece of yours has not moved from its starting square yet?',
        challengeOptions: ['My Knights and Bishops', 'My King', 'My edge Pawns'],
        correctOptionIndex: 0,
        source: 'local',
      });
    }

    const prompt = `Student Elo: ~${eloNum}.
Current position FEN: ${fen}
Engine candidate: ${bestMoveHint || 'Center move'}

Apply the Pedagogical Safeguard: "No Direct Answers First".
Do NOT give the exact move name. Instead, provide:
1. A guiding hint pointing to a piece or board sector (e.g. "Look closely at your knights—one of them can leap toward the high ground").
2. One key analogy-based concept.
3. A micro-challenge question to prompt active recall.

Return JSON with keys:
- hintText: Short gentle hint (under 30 words).
- strategicInsight: One key analogy-based strategic takeaway.
- microChallenge: A short question checking understanding.
- challengeOptions: Array of 3 short options.
- correctOptionIndex: 0, 1, or 2.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: LUKE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      hintText: parsed.hintText || 'Look at your pieces that haven’t stepped onto the field yet!',
      strategicInsight: parsed.strategicInsight || 'Controlling the high ground in the center gives your army room to breathe.',
      microChallenge: parsed.microChallenge || 'Which piece can claim the central squares safely?',
      challengeOptions: parsed.challengeOptions || ['Knight or Center Pawn', 'The Queen alone', 'The King'],
      correctOptionIndex: typeof parsed.correctOptionIndex === 'number' ? parsed.correctOptionIndex : 0,
      source: 'gemini',
    });
  } catch (error) {
    console.error('Error generating hint:', error);
    return res.json({
      hintText: 'Observe the center of the board. Getting your pieces out onto the field is the golden rule!',
      strategicInsight: 'Developing pieces early keeps your King safe and builds team coordination.',
      microChallenge: 'Should you attack with one piece or get your whole team out first?',
      challengeOptions: ['Get the whole team out', 'Attack immediately with Queen', 'Keep everyone at home'],
      correctOptionIndex: 0,
      source: 'fallback',
    });
  }
});

// Endpoint: Verify Micro-Challenge Answer
app.post('/api/coach/verify-challenge-answer', (req, res) => {
  const { chosenIndex, correctIndex, elo } = req.body;
  const isCorrect = Number(chosenIndex) === Number(correctIndex);

  return res.json({
    isCorrect,
    praise: isCorrect
      ? 'Spot on! You nailed the strategic intuition! Keep that active thinking going.'
      : 'Good try! Remember: in chess, we always want to control the high ground and keep our teammates defended.',
    bonusElo: isCorrect ? 5 : 1,
  });
});

// Endpoint: Ask Luke a Chess Question
app.post('/api/coach/ask-luke', async (req, res) => {
  try {
    const { question, userElo } = req.body;
    const eloNum = Number(userElo) || 600;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!ai) {
      return res.json({
        answer: `That's a fantastic question! Think of chess like soccer: you would never send your star striker onto the pitch alone while the other 10 players stay in the locker room. In chess, control the center (the high ground), develop your minor pieces (knights and bishops), and tuck your king into the safe castle room before launching attacks!`,
        source: 'local',
      });
    }

    const prompt = `Student (Elo ~${eloNum}) asks: "${question}".
Answer as Coach Luke in 2 concise, approachable paragraphs.
Strictly enforce:
- Use intuitive real-world metaphors (e.g. controlling the center as "controlling the high ground", piece coordination as "teamwork on the soccer field").
- If mentioning moves, avoid raw algebraic notation like "Nxd5" without immediate plain English translation.
- End with 1 encouraging micro-check question to test active recall.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: LUKE_SYSTEM_INSTRUCTION,
      },
    });

    return res.json({
      answer: response.text?.trim(),
      source: 'gemini',
    });
  } catch (error) {
    console.error('Error answering question:', error);
    return res.json({
      answer: `Great question! The golden principle for beginners is simple: claim the 4 center squares (the high ground), develop your knights and bishops so your whole team is on the field, and castle your king early so he stays safe!`,
      source: 'fallback',
    });
  }
});

// Endpoint: Full Game Review
app.post('/api/coach/game-review', async (req, res) => {
  try {
    const { moveList, result, userColor, userElo } = req.body;
    const eloNum = Number(userElo) || 600;

    if (!ai) {
      return res.json({
        accuracy: '80%',
        summary: `Great effort! You played with strong team spirit, controlled the high ground, and pushed your forces forward with courage.`,
        strengths: ['Active piece mobility onto the field', 'Courage to contest the center'],
        areasToImprove: ['Use the 3-second pause to scan for undefended teammates', 'Castle 2-3 moves earlier for king shelter'],
        lukePraise: `Every game you play is an investment in your strategic intuition!`,
      });
    }

    const prompt = `Review this beginner chess game:
Student color: ${userColor}
Result: ${result}
Student Elo: ~${eloNum}
Moves: ${(moveList || []).join(' ')}

Provide Coach Luke's game review formatted in plain JSON with these exact keys:
- accuracy: estimated percentage string (e.g. "78%")
- summary: 2 friendly sentences summarizing the student's play with real-world analogies.
- strengths: array of 2 short positive habits observed.
- areasToImprove: array of 2 actionable beginner takeaways.
- lukePraise: 1 inspiring takeaway quote from Luke.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: LUKE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error) {
    console.error('Error reviewing game:', error);
    return res.json({
      accuracy: '76%',
      summary: 'Solid game! You fought hard and made several energetic moves toward your opponent.',
      strengths: ['Developing pieces into open diagonals', 'Staying alert for tactical chances'],
      areasToImprove: ['Pause 3 seconds before moving to scan for undefended pieces', 'Prioritize early castling'],
      lukePraise: 'Every Grandmaster was once a beginner who refused to give up!',
    });
  }
});

// Structured Heuristic Feedback Generator ensuring strict compliance with the 3-part layout
function getStructuredHeuristicFeedback(
  move: string,
  isUserMove: boolean,
  userElo: number,
  capturedPiece?: string,
  isCheck?: boolean,
  blunderDetected?: boolean
) {
  const englishMove = translateMoveToEnglish(move);

  if (blunderDetected) {
    return {
      theMove: englishMove,
      strategicInsight:
        'Watch out: a teammate appears unprotected! Think of your pieces as a buddy system—every piece needs a friend watching its back.',
      microChallenge: 'Can your opponent attack your undefended piece on their next turn?',
      challengeOptions: ['Yes, I need to defend or retreat', 'No, it is safe', 'Pieces do not need defenders'],
      correctOptionIndex: 0,
      visualArrows: extractArrowsFromMove(move),
    };
  }

  if (isCheck) {
    return {
      theMove: englishMove,
      strategicInsight: isUserMove
        ? 'Direct attack on the monarch! Delivering check forces their King to respond immediately, giving you total initiative.'
        : 'Alert! Your King is in check. When your monarch is in danger, tuck him away or block the incoming ray immediately.',
      microChallenge: isUserMove
        ? 'Can the opponent block the check, capture your piece, or move their King?'
        : 'What is your safest way to escape the check?',
      challengeOptions: ['Block, Capture, or Run', 'Ignore the King', 'Push an edge pawn'],
      correctOptionIndex: 0,
      visualArrows: extractArrowsFromMove(move),
    };
  }

  if (['e4', 'd4', 'e5', 'd5'].includes(move)) {
    return {
      theMove: englishMove,
      strategicInsight:
        'Controlling the high ground! Placing your pawn in the center is like claiming the central hilltop in battle—your pieces can now see and reach everywhere.',
      microChallenge: 'Which piece can now leap into action thanks to this pawn move?',
      challengeOptions: ['Knights and Bishops', 'The Rooks in the corners', 'The King'],
      correctOptionIndex: 0,
      visualArrows: extractArrowsFromMove(move),
    };
  }

  if (['Nf3', 'Nc3', 'Nf6', 'Nc6'].includes(move)) {
    return {
      theMove: englishMove,
      strategicInsight:
        'Getting your team onto the field! Knights love jumping toward the center where they influence 8 different squares at once.',
      microChallenge: 'Why is a knight placed in the center stronger than a knight on the edge?',
      challengeOptions: ['It controls 8 squares instead of 4', 'It cannot be captured', 'It moves like a Rook'],
      correctOptionIndex: 0,
      visualArrows: extractArrowsFromMove(move),
    };
  }

  if (['O-O', 'O-O-O'].includes(move)) {
    return {
      theMove: englishMove,
      strategicInsight:
        'Tucking your King into his safe room! Castling achieves two great goals at once: keeps the monarch sheltered and connects your rooks.',
      microChallenge: 'When is the best time to castle during a chess game?',
      challengeOptions: ['Before move 10 in the opening', 'At the very end of the game', 'Never castle'],
      correctOptionIndex: 0,
      visualArrows: extractArrowsFromMove(move),
    };
  }

  if (capturedPiece) {
    return {
      theMove: englishMove,
      strategicInsight: isUserMove
        ? 'Material advantage captured! Winning pieces weakens their army and brings you closer to victory.'
        : 'Careful! Luke captured a piece. Look at which squares became vulnerable after that trade.',
      microChallenge: 'Is the piece that made the capture safely guarded by another friend?',
      challengeOptions: ['Yes, it has a protector', 'No, it is hanging', 'Captures are always safe'],
      correctOptionIndex: 0,
      visualArrows: extractArrowsFromMove(move),
    };
  }

  return {
    theMove: englishMove,
    strategicInsight: isUserMove
      ? 'Active team placement! You are building coordination across your ranks.'
      : 'Luke develops his forces. Observe which squares his piece is now eyeing.',
    microChallenge: 'What is your next plan: control more center squares or castle your King?',
    challengeOptions: ['Control center or castle', 'Push random pawns', 'Leave pieces at home'],
    correctOptionIndex: 0,
    visualArrows: extractArrowsFromMove(move),
  };
}

function getFallbackInsight(move: string, isUserMove: boolean, elo: number): string {
  if (elo < 800) {
    return 'Focus on piece safety and controlling the high ground in the center.';
  }
  if (elo < 1200) {
    return 'Look for tactical opportunities like forks and pins, and keep your King castled.';
  }
  return 'Evaluate pawn structure coordination and identify outposts for your pieces.';
}

function extractArrowsFromMove(move: string): { from: string; to: string; color: 'amber' | 'emerald' | 'rose' | 'sky' }[] {
  if (!move) return [];
  // Basic square detection
  const clean = move.replace(/[+#x=QRNB]/g, '');
  if (clean.length >= 4) {
    return [{ from: clean.slice(0, 2), to: clean.slice(2, 4), color: 'amber' }];
  }
  if (clean.length === 2) {
    // If e4, from e2 to e4
    if (move === 'e4') return [{ from: 'e2', to: 'e4', color: 'emerald' }];
    if (move === 'd4') return [{ from: 'd2', to: 'd4', color: 'emerald' }];
    if (move === 'e5') return [{ from: 'e7', to: 'e5', color: 'rose' }];
    if (move === 'd5') return [{ from: 'd7', to: 'd5', color: 'rose' }];
    if (move === 'Nf3') return [{ from: 'g1', to: 'f3', color: 'sky' }];
    if (move === 'Nc3') return [{ from: 'b1', to: 'c3', color: 'sky' }];
    if (move === 'Nf6') return [{ from: 'g8', to: 'f6', color: 'sky' }];
    if (move === 'Nc6') return [{ from: 'b8', to: 'c6', color: 'sky' }];
  }
  return [];
}

// Development Vite integration vs Production static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Luke Chess Coach server running on port ${PORT}`);
  });
}

startServer();
