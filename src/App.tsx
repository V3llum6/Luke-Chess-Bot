import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './components/ChessBoard.tsx';
import { CoachPanel } from './components/CoachPanel.tsx';
import { EloLadder } from './components/EloLadder.tsx';
import { LessonAcademy } from './components/LessonAcademy.tsx';
import { PuzzleArena } from './components/PuzzleArena.tsx';
import { AskLukeModal } from './components/AskLukeModal.tsx';
import { GameReviewModal } from './components/GameReviewModal.tsx';
import { BeginnerGuideModal } from './components/BeginnerGuideModal.tsx';
import { COACH_LEVELS, CoachLevel, CoachFeedback, MoveRecord, MoveQuality } from './types.ts';
import {
  pickLukeMove,
  getBestEngineMove,
  evaluateBoard,
  classifyMoveQuality,
  translateMoveToPlainEnglish,
  getAdvantageSummary,
  identifyOpening,
} from './engine/lukeEngine.ts';
import { sounds } from './audio.ts';
import {
  TrendingUp,
  RotateCcw,
  Sun,
  Moon,
  MessageSquare,
  Award,
  ShieldCheck,
  ArrowLeftRight,
  Copy,
  Check,
  BookOpen,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

type TabView = 'PLAY' | 'LESSONS' | 'PUZZLES' | 'LADDER';

const INITIAL_COACH_FEEDBACK: CoachFeedback = {
  theMove: 'Ready to Play',
  strategicInsight:
    'Controlling the high ground! In the opening, claiming the four center squares (e4, d4, e5, d5) lets your pieces coordinate easily across the entire board.',
  microChallenge: 'Which central pawn do you want to push to claim the high ground?',
  challengeOptions: [
    'e4 (King pawn forward two squares)',
    'd4 (Queen pawn forward two squares)',
    'h4 (Edge pawn move)',
  ],
  correctOptionIndex: 0,
};

function getQualityBadge(quality?: MoveQuality): { label: string; className: string } | null {
  switch (quality) {
    case 'brilliant':
      return {
        label: 'Brilliant',
        className: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300',
      };
    case 'great':
      return {
        label: 'Great',
        className: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
      };
    case 'inaccuracy':
      return {
        label: 'Inaccuracy',
        className: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
      };
    case 'mistake':
      return {
        label: 'Mistake',
        className: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300',
      };
    case 'blunder':
      return {
        label: 'Blunder',
        className: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
      };
    default:
      return null;
  }
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabView>('PLAY');

  // User State
  const [userElo, setUserElo] = useState<number>(() => {
    const saved = localStorage.getItem('luke_chess_elo');
    return saved ? Number(saved) : 600;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('luke_chess_theme') === 'dark';
  });

  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game State
  const [game, setGame] = useState(() => new Chess());
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [selectedCoachLevel, setSelectedCoachLevel] = useState<CoachLevel>(COACH_LEVELS[0]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveRecords, setMoveRecords] = useState<MoveRecord[]>([]);
  const [viewMoveIndex, setViewMoveIndex] = useState<number | null>(null);
  const [showPlainEnglishMoves, setShowPlainEnglishMoves] = useState(true);
  const [evalScore, setEvalScore] = useState(0);
  const [isLukeThinking, setIsLukeThinking] = useState(false);
  const [coachVisionEnabled, setCoachVisionEnabled] = useState(false);
  const [safetyGuardEnabled, setSafetyGuardEnabled] = useState<boolean>(() => userElo < 900);
  const [pendingRiskyMove, setPendingRiskyMove] = useState<{
    from: Square;
    to: Square;
    warning: string;
    san: string;
  } | null>(null);
  const [hintHighlight, setHintHighlight] = useState<{ from: Square; to?: Square } | null>(null);
  const [isCopiedPgn, setIsCopiedPgn] = useState(false);

  // Request ID sequence ref to prevent async race conditions
  const feedbackSeqRef = useRef<number>(0);

  // Structured 3-Part Feedback from Luke
  const [coachFeedback, setCoachFeedback] = useState<CoachFeedback>(INITIAL_COACH_FEEDBACK);

  // Modals & Helpers
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isBeginnerGuideOpen, setIsBeginnerGuideOpen] = useState(false);
  const [showBeginnerBanner, setShowBeginnerBanner] = useState<boolean>(() => userElo < 900);
  const [reviewModalState, setReviewModalState] = useState<{
    isOpen: boolean;
    result: 'win' | 'loss' | 'draw' | 'ongoing';
  }>({
    isOpen: false,
    result: 'ongoing',
  });

  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('luke_chess_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('luke_chess_theme', 'light');
    }
  }, [darkMode]);

  // Save Elo
  const handleEarnElo = (points: number) => {
    setUserElo((prev) => {
      const next = Math.max(400, Math.min(2400, prev + points));
      localStorage.setItem('luke_chess_elo', String(next));
      return next;
    });
  };

  const handleSetUserElo = (newElo: number) => {
    setUserElo(newElo);
    localStorage.setItem('luke_chess_elo', String(newElo));
  };

  const moveHistorySans = useMemo(() => moveRecords.map((m) => m.san), [moveRecords]);

  // View state when scrubbing move history vs live game
  const isViewingHistory = viewMoveIndex !== null && viewMoveIndex < moveRecords.length - 1;

  const displayedGame = useMemo(() => {
    if (viewMoveIndex !== null && moveRecords[viewMoveIndex]) {
      return new Chess(moveRecords[viewMoveIndex].fen);
    }
    return game;
  }, [viewMoveIndex, moveRecords, game]);

  const displayedLastMove = useMemo(() => {
    if (viewMoveIndex !== null && moveRecords[viewMoveIndex]) {
      return {
        from: moveRecords[viewMoveIndex].from as Square,
        to: moveRecords[viewMoveIndex].to as Square,
      };
    }
    return lastMove;
  }, [viewMoveIndex, moveRecords, lastMove]);

  const displayedEval = useMemo(() => {
    if (viewMoveIndex !== null && moveRecords[viewMoveIndex]) {
      return evaluateBoard(displayedGame);
    }
    return evalScore;
  }, [viewMoveIndex, moveRecords, displayedGame, evalScore]);

  const advantageInfo = useMemo(
    () => getAdvantageSummary(displayedEval, playerColor),
    [displayedEval, playerColor]
  );

  const detectedOpening = useMemo(() => identifyOpening(moveHistorySans), [moveHistorySans]);

  // Derive captured pieces accurately at any scrubbed or live point
  const activeRecords = useMemo(
    () => (viewMoveIndex !== null ? moveRecords.slice(0, viewMoveIndex + 1) : moveRecords),
    [moveRecords, viewMoveIndex]
  );

  const capturedByUser = useMemo(
    () => activeRecords.filter((m) => m.captured && m.color === playerColor).map((m) => m.captured!),
    [activeRecords, playerColor]
  );

  const capturedByLuke = useMemo(
    () => activeRecords.filter((m) => m.captured && m.color !== playerColor).map((m) => m.captured!),
    [activeRecords, playerColor]
  );

  const isPlayerTurn = game.turn() === playerColor && !game.isGameOver();

  // Reset or start new game
  const handleStartNewGame = (chosenColor: 'w' | 'b' = playerColor) => {
    feedbackSeqRef.current++;
    const newG = new Chess();
    setGame(newG);
    setLastMove(null);
    setMoveRecords([]);
    setViewMoveIndex(null);
    setEvalScore(0);
    setPendingRiskyMove(null);
    setHintHighlight(null);
    setIsLukeThinking(false);

    if (chosenColor === 'b') {
      setCoachFeedback({
        theMove: 'Game Ready (You are Black)',
        strategicInsight:
          'Luke plays White! Watch how he develops his pawns to contest the central high ground.',
        microChallenge: 'How should Black respond to 1. e4 or 1. d4?',
        challengeOptions: ['Contest the center with e5 or d5', 'Push an edge pawn', 'Move King immediately'],
        correctOptionIndex: 0,
      });

      setIsLukeThinking(true);
      setTimeout(() => {
        executeLukeMove(newG, [], 0, 'w');
      }, 600);
    } else {
      setCoachFeedback(INITIAL_COACH_FEEDBACK);
    }
  };

  // Flip sides (White <-> Black)
  const handleToggleColor = () => {
    const nextColor = playerColor === 'w' ? 'b' : 'w';
    setPlayerColor(nextColor);
    handleStartNewGame(nextColor);
  };

  // Check Game Over status
  const checkGameOverStatus = (currentGame: Chess) => {
    if (currentGame.isCheckmate()) {
      const isUserWin = currentGame.turn() !== playerColor;
      setCoachFeedback({
        theMove: isUserWin ? 'Checkmate! (Victory)' : 'Checkmate! (Game Concluded)',
        strategicInsight: isUserWin
          ? 'Magnificent finish! Your team coordination and piece pressure broke through the opponent’s defenses.'
          : 'Checkmate! Never be discouraged—every checkmate is the absolute fastest way to build pattern recognition.',
        microChallenge: 'What was the decisive breakthrough in this match?',
        challengeOptions: ['Active piece pressure', 'Pawn race', 'Lucky move'],
        correctOptionIndex: 0,
      });
      setReviewModalState({
        isOpen: true,
        result: isUserWin ? 'win' : 'loss',
      });
      handleEarnElo(isUserWin ? 15 : 3);
      return true;
    }

    if (currentGame.isDraw() || currentGame.isStalemate()) {
      setCoachFeedback({
        theMove: 'Stalemate / Draw',
        strategicInsight: 'A hard-fought draw! Both sides contested the center with equal determination.',
        microChallenge: 'How did the game reach a peaceful conclusion?',
        challengeOptions: ['No legal moves without check', 'Equal material', 'Agreed draw'],
        correctOptionIndex: 0,
      });
      setReviewModalState({
        isOpen: true,
        result: 'draw',
      });
      handleEarnElo(5);
      return true;
    }

    return false;
  };

  // Request Coach Feedback from API with sequence counter to prevent race conditions
  const requestCoachFeedback = async (
    fen: string,
    moveSan: string,
    historyForRequest: string[],
    isUser: boolean,
    captured?: string,
    isCheck?: boolean,
    blunderDetected?: boolean
  ) => {
    const reqId = ++feedbackSeqRef.current;

    try {
      const res = await fetch('/api/coach/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen,
          move: moveSan,
          moveHistory: historyForRequest,
          userElo,
          coachLevel: selectedCoachLevel.id,
          isUserMove: isUser,
          capturedPiece: captured,
          isCheck,
          blunderDetected,
        }),
      });
      const data: CoachFeedback = await res.json();
      if (reqId === feedbackSeqRef.current && data.theMove) {
        setCoachFeedback(data);
      }
    } catch {
      // Graceful fallback handled server/state-side
    }
  };

  // Handle Player's Move
  const handlePlayerMove = ({
    from,
    to,
    san,
    captured,
  }: {
    from: Square;
    to: Square;
    promotion?: string;
    san: string;
    captured?: string;
  }) => {
    setLastMove({ from, to });
    setHintHighlight(null);
    setViewMoveIndex(null);
    setPendingRiskyMove(null);

    const nextGame = new Chess(game.fen());
    const afterEval = evaluateBoard(nextGame);
    const quality = classifyMoveQuality(evalScore, afterEval, playerColor, nextGame.isCheckmate());
    const blunderDetected = quality === 'blunder' || quality === 'mistake';

    const newRecord: MoveRecord = {
      san,
      english: translateMoveToPlainEnglish(san),
      fen: nextGame.fen(),
      from,
      to,
      color: playerColor,
      captured,
      quality,
    };

    const updatedRecords = [...moveRecords, newRecord];
    setMoveRecords(updatedRecords);
    setEvalScore(afterEval);
    setGame(nextGame);

    const isGameOver = checkGameOverStatus(nextGame);

    requestCoachFeedback(
      nextGame.fen(),
      san,
      updatedRecords.map((m) => m.san),
      true,
      captured,
      nextGame.inCheck(),
      blunderDetected
    );

    if (!isGameOver && nextGame.turn() !== playerColor) {
      setIsLukeThinking(true);
      setTimeout(() => {
        executeLukeMove(nextGame, updatedRecords, afterEval);
      }, 650);
    }
  };

  // Confirm risky move intercepted by Beginner Safety Guard
  const handleConfirmRiskyMove = () => {
    if (!pendingRiskyMove) return;
    const { from, to } = pendingRiskyMove;
    try {
      const targetPiece = game.get(to);
      const isCapture = Boolean(targetPiece);
      const moveObj = game.move({ from, to });
      if (moveObj) {
        if (game.inCheck()) {
          sounds.playCheck();
        } else if (isCapture) {
          sounds.playCapture();
        } else {
          sounds.playMove();
        }
        handlePlayerMove({
          from,
          to,
          san: moveObj.san,
          captured: moveObj.captured,
        });
      }
    } catch (e) {
      console.error('Failed confirming move:', e);
      setPendingRiskyMove(null);
    }
  };

  // Luke plays his move
  const executeLukeMove = (
    currentGame: Chess,
    currentRecords: MoveRecord[],
    prevEvalOverride?: number,
    lukeColorOverride?: 'w' | 'b'
  ) => {
    try {
      const lukeColor = lukeColorOverride ?? (playerColor === 'w' ? 'b' : 'w');
      const beforeEval = prevEvalOverride ?? evaluateBoard(currentGame);
      const lukeMove = pickLukeMove(currentGame, selectedCoachLevel.id);
      if (!lukeMove) {
        setIsLukeThinking(false);
        checkGameOverStatus(currentGame);
        return;
      }

      const moveObj = currentGame.move(lukeMove);
      if (moveObj) {
        if (currentGame.inCheck()) {
          sounds.playCheck();
        } else if (moveObj.captured) {
          sounds.playCapture();
        } else {
          sounds.playMove();
        }

        const nextGame = new Chess(currentGame.fen());
        const afterEval = evaluateBoard(nextGame);
        const quality = classifyMoveQuality(beforeEval, afterEval, lukeColor, nextGame.isCheckmate());

        const lukeRecord: MoveRecord = {
          san: moveObj.san,
          english: translateMoveToPlainEnglish(moveObj.san),
          fen: nextGame.fen(),
          from: moveObj.from,
          to: moveObj.to,
          color: lukeColor,
          captured: moveObj.captured,
          quality,
        };

        const updatedRecords = [...currentRecords, lukeRecord];
        setLastMove({ from: moveObj.from, to: moveObj.to });
        setMoveRecords(updatedRecords);
        setEvalScore(afterEval);
        setGame(nextGame);
        setIsLukeThinking(false);

        const isOver = checkGameOverStatus(nextGame);
        if (!isOver) {
          requestCoachFeedback(
            nextGame.fen(),
            moveObj.san,
            updatedRecords.map((m) => m.san),
            false,
            moveObj.captured,
            nextGame.inCheck(),
            false
          );
        }
      }
    } catch (e) {
      console.error('Luke move failed:', e);
      setIsLukeThinking(false);
    }
  };

  // Pedagogical Safeguard: "No Direct Answers First" smart hint powered by alpha-beta engine
  const handleRequestHint = async () => {
    if (!isPlayerTurn || isLukeThinking) return;
    sounds.playHint();
    setViewMoveIndex(null);

    try {
      const legalMoves = game.moves({ verbose: true });
      if (legalMoves.length === 0) return;

      const candidate = getBestEngineMove(game, 2) || legalMoves[0];
      setHintHighlight({ from: candidate.from, to: candidate.to });

      const res = await fetch('/api/coach/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: game.fen(),
          userElo,
          legalMoves: legalMoves.map((m) => m.san),
          bestMoveHint: candidate.san,
        }),
      });
      const data = await res.json();
      setCoachFeedback({
        theMove: 'Hint Requested (Pedagogical Clue)',
        strategicInsight:
          data.strategicInsight ||
          data.hintText ||
          'Look at your teammates that haven’t stepped onto the field yet!',
        microChallenge: data.microChallenge || 'Which piece is best positioned to claim the high ground?',
        challengeOptions: data.challengeOptions || ['Center Knight / Pawn', 'Solo Queen move', 'Rook on edge'],
        correctOptionIndex: data.correctOptionIndex ?? 0,
      });
    } catch {
      setCoachFeedback({
        theMove: 'Hint Requested',
        strategicInsight:
          'Always look to activate your pieces toward the central high ground before launching an attack.',
        microChallenge: 'Which piece can safely step forward onto the field?',
        challengeOptions: ['Minor piece (Knight/Bishop)', 'King alone', 'Corner pawn'],
        correctOptionIndex: 0,
      });
    }
  };

  // Takeback move
  const handleTakeback = () => {
    if (moveRecords.length < 2 || isLukeThinking) return;
    try {
      game.undo();
      game.undo();
      const freshGame = new Chess(game.fen());
      const nextRecords = moveRecords.slice(0, -2);
      const prevLast = nextRecords[nextRecords.length - 1];

      setGame(freshGame);
      setMoveRecords(nextRecords);
      setViewMoveIndex(null);
      setEvalScore(evaluateBoard(freshGame));
      setLastMove(prevLast ? { from: prevLast.from as Square, to: prevLast.to as Square } : null);
      setHintHighlight(null);
      setPendingRiskyMove(null);

      setCoachFeedback({
        theMove: 'Takeback Accepted',
        strategicInsight:
          'Trying again is how masters are made! Take a 3-second breath, scan the board, and find a safer, more active square.',
        microChallenge: 'What was the risk with your previous choice?',
        challengeOptions: ['Undefended piece / lost tempo', 'It was perfectly safe', 'No reason'],
        correctOptionIndex: 0,
      });
      sounds.playMove();
    } catch (e) {
      console.error('Takeback error:', e);
    }
  };

  // Copy PGN
  const handleCopyPgn = () => {
    try {
      navigator.clipboard.writeText(game.pgn() || moveHistorySans.join(' '));
      setIsCopiedPgn(true);
      setTimeout(() => setIsCopiedPgn(false), 2000);
    } catch {}
  };

  // Determine proper Game Review state (completed vs ongoing)
  const getCurrentReviewResult = (): 'win' | 'loss' | 'draw' | 'ongoing' => {
    if (game.isCheckmate()) {
      return game.turn() !== playerColor ? 'win' : 'loss';
    }
    if (game.isDraw() || game.isStalemate()) {
      return 'draw';
    }
    return 'ongoing';
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Contract: Brand Wordmark - 4 concise nav links - 1 Primary Action */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-40 shadow-xs">
        {/* Brand Wordmark */}
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0 font-display flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
          Luke Chess Coach
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600 dark:text-stone-400">
          <button
            onClick={() => setActiveTab('PLAY')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-stone-900 dark:hover:text-stone-100 ${
              activeTab === 'PLAY' ? 'text-amber-700 dark:text-amber-400 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Spar with Luke
          </button>
          <button
            onClick={() => setActiveTab('LESSONS')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-stone-900 dark:hover:text-stone-100 ${
              activeTab === 'LESSONS' ? 'text-amber-700 dark:text-amber-400 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Strategy Academy
          </button>
          <button
            onClick={() => setActiveTab('PUZZLES')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-stone-900 dark:hover:text-stone-100 ${
              activeTab === 'PUZZLES' ? 'text-amber-700 dark:text-amber-400 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Tactical Drills
          </button>
          <button
            onClick={() => setActiveTab('LADDER')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-stone-900 dark:hover:text-stone-100 ${
              activeTab === 'LADDER' ? 'text-amber-700 dark:text-amber-400 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Elo Ladder
          </button>
        </nav>

        {/* Primary Action Zone */}
        <div className="flex items-center gap-3 shrink-0">
          {/* User Elo Badge */}
          <button
            onClick={() => setActiveTab('LADDER')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50 text-xs font-semibold"
            title="Click to view Elo milestones"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="tabular-nums">{userElo} Elo</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 rounded-lg transition-colors"
            title={darkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Primary CTA */}
          <button
            onClick={() => setIsAskModalOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask Luke</span>
          </button>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden items-center justify-around bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-2 py-2 text-xs">
        <button
          onClick={() => setActiveTab('PLAY')}
          className={`px-3 py-1.5 rounded-lg font-medium ${
            activeTab === 'PLAY' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'text-stone-600'
          }`}
        >
          Spar
        </button>
        <button
          onClick={() => setActiveTab('LESSONS')}
          className={`px-3 py-1.5 rounded-lg font-medium ${
            activeTab === 'LESSONS' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'text-stone-600'
          }`}
        >
          Lessons
        </button>
        <button
          onClick={() => setActiveTab('PUZZLES')}
          className={`px-3 py-1.5 rounded-lg font-medium ${
            activeTab === 'PUZZLES' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'text-stone-600'
          }`}
        >
          Drills
        </button>
        <button
          onClick={() => setActiveTab('LADDER')}
          className={`px-3 py-1.5 rounded-lg font-medium ${
            activeTab === 'LADDER' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'text-stone-600'
          }`}
        >
          Elo Ladder
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: SPAR WITH LUKE */}
        {activeTab === 'PLAY' && (
          <div className="space-y-5">
            {/* Compact Dismissible Welcome Strip for Beginners */}
            {showBeginnerBanner && moveRecords.length === 0 && (
              <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
                  <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>New to chess?</strong> Click any piece to see safe green dots, or open Luke&apos;s 60-second Piece &amp; Rules Guide before playing.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsBeginnerGuideOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Open Piece Guide
                  </button>
                  <button
                    onClick={() => setShowBeginnerBanner(false)}
                    className="p-1 rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-900/40"
                    title="Dismiss tip"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Sparring Control Strip */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-1">
                  <span>Sparring Partner</span>
                  <span aria-hidden="true">·</span>
                  <span>Select Luke&apos;s strength level</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {COACH_LEVELS.map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setSelectedCoachLevel(lvl)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        selectedCoachLevel.id === lvl.id
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
                      }`}
                    >
                      {lvl.name} ({lvl.elo} Elo)
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Piece Guide, Color Flip, New Match, PGN, Review */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setIsBeginnerGuideOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-colors"
                  title="Learn how every piece moves & the 4 Golden Habits"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Piece Guide</span>
                </button>

                <button
                  onClick={handleToggleColor}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
                  title="Switch sides between White and Black"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Play as {playerColor === 'w' ? 'Black' : 'White'}</span>
                </button>

                <button
                  onClick={() => handleStartNewGame()}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>New Match</span>
                </button>

                <button
                  onClick={handleCopyPgn}
                  disabled={moveRecords.length === 0}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors disabled:opacity-40"
                  title="Copy PGN notation"
                >
                  {isCopiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedPgn ? 'Copied' : 'PGN'}</span>
                </button>

                <button
                  onClick={() =>
                    setReviewModalState({
                      isOpen: true,
                      result: getCurrentReviewResult(),
                    })
                  }
                  disabled={moveRecords.length === 0}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Review Game</span>
                </button>
              </div>
            </div>

            {/* 2-Column Board & Coaching Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive Chessboard + Move History Scrubber */}
              <div className="lg:col-span-7 flex flex-col items-center">
                {isViewingHistory && (
                  <div className="w-full max-w-[560px] mb-2 px-3 py-2 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-semibold">
                      Reviewing Move #{(viewMoveIndex ?? 0) + 1} of {moveRecords.length}
                    </span>
                    <button
                      onClick={() => setViewMoveIndex(null)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Jump to Live
                    </button>
                  </div>
                )}

                <ChessBoard
                  game={displayedGame}
                  onMove={handlePlayerMove}
                  isPlayerTurn={isPlayerTurn && !isLukeThinking && !isViewingHistory}
                  interactive={!isViewingHistory}
                  playerColor={playerColor}
                  lastMove={displayedLastMove}
                  coachVisionEnabled={coachVisionEnabled}
                  safetyGuardEnabled={safetyGuardEnabled}
                  onRiskyMoveIntercept={(info) => setPendingRiskyMove(info)}
                  hintHighlight={isViewingHistory ? null : hintHighlight}
                  advantageInfo={advantageInfo}
                />

                {/* Move History Strip with Plain-English Toggle, Quality Badges & Scrubber */}
                <div className="w-full max-w-[560px] mt-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">
                        Move History ({moveRecords.length})
                      </span>
                      <button
                        onClick={() => setShowPlainEnglishMoves(!showPlainEnglishMoves)}
                        className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-semibold transition-colors"
                        title="Switch between plain English descriptions and standard chess notation"
                      >
                        {showPlainEnglishMoves ? 'Plain English' : 'Notation'}
                      </button>
                    </div>

                    {/* History Scrubber Controls */}
                    {moveRecords.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewMoveIndex(0)}
                          disabled={viewMoveIndex === 0}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-35"
                          title="First move"
                        >
                          <ChevronFirst className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setViewMoveIndex((prev) =>
                              prev === null
                                ? Math.max(0, moveRecords.length - 2)
                                : Math.max(0, prev - 1)
                            )
                          }
                          disabled={viewMoveIndex === 0 || moveRecords.length < 2}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-35"
                          title="Previous move"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setViewMoveIndex((prev) => {
                              if (prev === null) return null;
                              if (prev + 1 >= moveRecords.length - 1) return null;
                              return prev + 1;
                            })
                          }
                          disabled={viewMoveIndex === null}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-35"
                          title="Next move"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setViewMoveIndex(null)}
                          disabled={viewMoveIndex === null}
                          className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-35"
                          title="Jump to live board"
                        >
                          <ChevronLast className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="italic">
                        {isLukeThinking
                          ? 'Luke is pondering his response...'
                          : isPlayerTurn
                          ? `Your turn (${playerColor === 'w' ? 'White' : 'Black'})`
                          : `Luke's turn (${playerColor === 'w' ? 'Black' : 'White'})`}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto text-xs">
                    {moveRecords.length === 0 ? (
                      <span className="text-stone-400 dark:text-stone-600 text-xs italic">
                        Moves will appear here in plain English as you play...
                      </span>
                    ) : (
                      moveRecords.map((m, idx) => {
                        const isSelected =
                          viewMoveIndex === idx || (viewMoveIndex === null && idx === moveRecords.length - 1);
                        const badge = getQualityBadge(m.quality);

                        return (
                          <button
                            key={idx}
                            onClick={() =>
                              setViewMoveIndex(idx === moveRecords.length - 1 ? null : idx)
                            }
                            className={`px-2 py-1 rounded-lg text-[11px] flex items-center gap-1.5 transition-colors border ${
                              isSelected
                                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-stone-900 dark:text-stone-100 font-semibold'
                                : idx % 2 === 0
                                ? 'bg-stone-50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100'
                                : 'bg-amber-50/60 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 text-amber-900 dark:text-amber-200 hover:bg-amber-50'
                            }`}
                          >
                            <span className="text-[10px] text-stone-400 font-mono">
                              {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}.` : `${Math.floor(idx / 2) + 1}...`}
                            </span>
                            <span className={showPlainEnglishMoves ? '' : 'font-mono'}>
                              {showPlainEnglishMoves ? m.english : m.san}
                            </span>
                            {badge && (
                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${badge.className}`}>
                                {badge.label}
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Coach Luke Panel */}
              <div className="lg:col-span-5 space-y-4">
                <CoachPanel
                  feedback={coachFeedback}
                  isThinking={isLukeThinking}
                  isPlayerTurn={isPlayerTurn}
                  playerColor={playerColor}
                  coachVisionEnabled={coachVisionEnabled}
                  onToggleCoachVision={() => setCoachVisionEnabled(!coachVisionEnabled)}
                  safetyGuardEnabled={safetyGuardEnabled}
                  onToggleSafetyGuard={() => setSafetyGuardEnabled(!safetyGuardEnabled)}
                  pendingRiskyMove={pendingRiskyMove}
                  onConfirmRiskyMove={handleConfirmRiskyMove}
                  onCancelRiskyMove={() => setPendingRiskyMove(null)}
                  detectedOpening={detectedOpening}
                  onRequestHint={handleRequestHint}
                  onTakeback={handleTakeback}
                  onOpenAskModal={() => setIsAskModalOpen(true)}
                  canTakeback={moveRecords.length >= 2}
                  capturedByUser={capturedByUser}
                  capturedByLuke={capturedByLuke}
                  soundEnabled={soundEnabled}
                  onToggleSound={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    sounds.setEnabled(next);
                  }}
                  coachLevelName={selectedCoachLevel.name}
                  onAnswerChallenge={(isCorrect) => {
                    if (isCorrect) {
                      handleEarnElo(5);
                    }
                  }}
                />

                {/* Pedagogical Principles Card */}
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-xs space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Luke&apos;s Core Strategic Intuition
                    </h4>
                  </div>
                  <div className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    <p>
                      <strong>1. The High Ground:</strong> Control the center squares so your pieces have 360° sightlines.
                    </p>
                    <p>
                      <strong>2. Team on the Field:</strong> Activate knights and bishops before attacking with the Queen alone.
                    </p>
                    <p>
                      <strong>3. The 3-Second Blunder Scan:</strong> Pause 3 seconds to verify: is any piece left without a protector?
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LESSONS ACADEMY */}
        {activeTab === 'LESSONS' && <LessonAcademy onEarnElo={handleEarnElo} />}

        {/* TAB 3: TACTICAL DRILLS */}
        {activeTab === 'PUZZLES' && <PuzzleArena onEarnElo={handleEarnElo} />}

        {/* TAB 4: ELO LADDER & MILESTONES */}
        {activeTab === 'LADDER' && (
          <EloLadder userElo={userElo} onSetUserElo={handleSetUserElo} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 dark:border-stone-800 py-6 px-6 bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 text-xs text-center space-y-1">
        <p>
          Coach Luke Chess Academy · Designed for beginners, improvers, and curious minds.
        </p>
        <p className="text-[11px] text-stone-400 dark:text-stone-500">
          Powered by plain-English analogies, gentle pedagogical safeguards, and Google Gemini AI.
        </p>
      </footer>

      {/* Ask Luke Modal */}
      <AskLukeModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        userElo={userElo}
      />

      {/* Beginner Piece & Rules Guide Modal */}
      <BeginnerGuideModal
        isOpen={isBeginnerGuideOpen}
        onClose={() => setIsBeginnerGuideOpen(false)}
      />

      {/* Game Review Modal */}
      <GameReviewModal
        isOpen={reviewModalState.isOpen}
        onClose={() => setReviewModalState({ isOpen: false, result: 'ongoing' })}
        result={reviewModalState.result}
        moveHistory={moveHistorySans}
        userElo={userElo}
        userColor={playerColor}
        onPlayAgain={() => handleStartNewGame()}
      />
    </div>
  );
}
