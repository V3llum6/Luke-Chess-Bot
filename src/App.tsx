import React, { useState, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from './components/ChessBoard.tsx';
import { CoachPanel } from './components/CoachPanel.tsx';
import { EloLadder } from './components/EloLadder.tsx';
import { LessonAcademy } from './components/LessonAcademy.tsx';
import { PuzzleArena } from './components/PuzzleArena.tsx';
import { AskLukeModal } from './components/AskLukeModal.tsx';
import { GameReviewModal } from './components/GameReviewModal.tsx';
import { COACH_LEVELS, CoachLevel, EloTier, CoachFeedback } from './types.ts';
import { pickLukeMove } from './engine/lukeEngine.ts';
import { sounds } from './audio.ts';
import {
  TrendingUp,
  RotateCcw,
  Sun,
  Moon,
  MessageSquare,
  Award,
  ShieldCheck,
} from 'lucide-react';

type TabView = 'PLAY' | 'LESSONS' | 'PUZZLES' | 'LADDER';

const INITIAL_COACH_FEEDBACK: CoachFeedback = {
  theMove: 'Ready to Play (White to move)',
  strategicInsight:
    'Controlling the high ground! In the opening, claiming the four center squares (e4, d4, e5, d5) lets your pieces coordinate easily across the entire board.',
  microChallenge: 'Which move claims the central high ground right on move 1?',
  challengeOptions: ['e4 (King pawn forward two squares)', 'd4 (Queen pawn forward two squares)', 'h4 (Edge pawn move)'],
  correctOptionIndex: 0,
  visualArrows: [
    { from: 'e2', to: 'e4', color: 'emerald' },
    { from: 'd2', to: 'd4', color: 'emerald' },
  ],
};

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
  const [playerColor] = useState<'w' | 'b'>('w');
  const [selectedCoachLevel, setSelectedCoachLevel] = useState<CoachLevel>(COACH_LEVELS[0]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [isLukeThinking, setIsLukeThinking] = useState(false);
  const [coachVisionEnabled, setCoachVisionEnabled] = useState(false);
  const [hintHighlight, setHintHighlight] = useState<{ from: Square; to?: Square } | null>(null);

  // Structured 3-Part Feedback from Luke
  const [coachFeedback, setCoachFeedback] = useState<CoachFeedback>(INITIAL_COACH_FEEDBACK);

  // Modals
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [reviewModalState, setReviewModalState] = useState<{
    isOpen: boolean;
    result: 'win' | 'loss' | 'draw';
  }>({
    isOpen: false,
    result: 'win',
  });

  // Track captured pieces
  const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]);

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

  const isPlayerTurn = game.turn() === playerColor && !game.isGameOver();

  // Reset or start new game
  const handleStartNewGame = () => {
    const newG = new Chess();
    setGame(newG);
    setLastMove(null);
    setMoveHistory([]);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setHintHighlight(null);
    setIsLukeThinking(false);
    setCoachFeedback(INITIAL_COACH_FEEDBACK);
  };

  // Check Game Over status
  const checkGameOverStatus = (currentGame: Chess) => {
    if (currentGame.isCheckmate()) {
      const isUserWin = currentGame.turn() === 'b';
      setCoachFeedback({
        theMove: isUserWin ? 'Checkmate (Victory!)' : 'Checkmate (Game Concluded)',
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

  // Request Coach Feedback from API with strict 3-part layout
  const requestCoachFeedback = async (
    fen: string,
    moveSan: string,
    isUser: boolean,
    captured?: string,
    isCheck?: boolean
  ) => {
    try {
      // Check for simple blunder: does opponent have an immediate capture on the moved piece?
      const res = await fetch('/api/coach/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen,
          move: moveSan,
          moveHistory,
          userElo,
          coachLevel: selectedCoachLevel.id,
          isUserMove: isUser,
          capturedPiece: captured,
          isCheck,
        }),
      });
      const data: CoachFeedback = await res.json();
      if (data.theMove) {
        setCoachFeedback(data);
      }
    } catch {
      // Graceful fallback
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

    const newHistory = [...moveHistory, san];
    setMoveHistory(newHistory);

    if (captured) {
      setCapturedByWhite((prev) => [...prev, captured]);
    }

    const nextGame = new Chess(game.fen());
    setGame(nextGame);

    const isGameOver = checkGameOverStatus(nextGame);

    requestCoachFeedback(nextGame.fen(), san, true, captured, nextGame.inCheck());

    if (!isGameOver && nextGame.turn() !== playerColor) {
      setIsLukeThinking(true);
      setTimeout(() => {
        executeLukeMove(nextGame);
      }, 700);
    }
  };

  // Luke plays his move
  const executeLukeMove = (currentGame: Chess) => {
    try {
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

        if (moveObj.captured) {
          setCapturedByBlack((prev) => [...prev, moveObj.captured!]);
        }

        setLastMove({ from: moveObj.from, to: moveObj.to });
        setMoveHistory((prev) => [...prev, moveObj.san]);

        const nextGame = new Chess(currentGame.fen());
        setGame(nextGame);
        setIsLukeThinking(false);

        const isOver = checkGameOverStatus(nextGame);
        if (!isOver) {
          requestCoachFeedback(
            nextGame.fen(),
            moveObj.san,
            false,
            moveObj.captured,
            nextGame.inCheck()
          );
        }
      }
    } catch (e) {
      console.error('Luke move failed:', e);
      setIsLukeThinking(false);
    }
  };

  // Pedagogical Safeguard: "No Direct Answers First" hint
  const handleRequestHint = async () => {
    if (!isPlayerTurn || isLukeThinking) return;
    sounds.playHint();

    try {
      const legalMoves = game.moves({ verbose: true });
      if (legalMoves.length === 0) return;

      const candidate = legalMoves[0];
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
        strategicInsight: data.strategicInsight || data.hintText || 'Look at your teammates that haven’t stepped onto the field yet!',
        microChallenge: data.microChallenge || 'Which piece is best positioned to claim the high ground?',
        challengeOptions: data.challengeOptions || ['Center Knight / Pawn', 'Solo Queen move', 'Rook on edge'],
        correctOptionIndex: data.correctOptionIndex ?? 0,
        visualArrows: [{ from: candidate.from, to: candidate.to, color: 'amber' }],
      });
    } catch {
      setCoachFeedback({
        theMove: 'Hint Requested',
        strategicInsight: 'Always look to activate your pieces toward the central high ground before launching an attack.',
        microChallenge: 'Which piece can safely step forward onto the field?',
        challengeOptions: ['Minor piece (Knight/Bishop)', 'King alone', 'Corner pawn'],
        correctOptionIndex: 0,
      });
    }
  };

  // Takeback move
  const handleTakeback = () => {
    if (moveHistory.length < 2 || isLukeThinking) return;
    try {
      game.undo();
      game.undo();
      const freshGame = new Chess(game.fen());
      setGame(freshGame);
      setMoveHistory((prev) => prev.slice(0, -2));
      setLastMove(null);
      setHintHighlight(null);
      setCoachFeedback({
        theMove: 'Takeback Accepted',
        strategicInsight: 'Trying again is how masters are made! Take a 3-second breath, scan the board, and find a safer, more active square.',
        microChallenge: 'What was the risk with your previous choice?',
        challengeOptions: ['Undefended piece / lost tempo', 'It was perfectly safe', 'No reason'],
        correctOptionIndex: 0,
      });
      sounds.playMove();
    } catch (e) {
      console.error('Takeback error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Contract: Brand Wordmark - 4 concise nav links - 1 Primary Action */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-40 shadow-xs">
        {/* Brand Wordmark (Single text element) */}
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
          <div className="space-y-6">
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

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={handleStartNewGame}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>New Match</span>
                </button>
                <button
                  onClick={() =>
                    setReviewModalState({
                      isOpen: true,
                      result: 'draw',
                    })
                  }
                  disabled={moveHistory.length === 0}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Review Game</span>
                </button>
              </div>
            </div>

            {/* 2-Column Board & Coaching Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive Chessboard */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <ChessBoard
                  game={game}
                  onMove={handlePlayerMove}
                  isPlayerTurn={isPlayerTurn && !isLukeThinking}
                  playerColor={playerColor}
                  lastMove={lastMove}
                  coachVisionEnabled={coachVisionEnabled}
                  hintHighlight={hintHighlight}
                  visualArrows={coachFeedback.visualArrows}
                />

                {/* Move History Strip */}
                <div className="w-full max-w-[560px] mt-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      Move History ({moveHistory.length} moves)
                    </span>
                    <span className="italic">
                      {isLukeThinking
                        ? "Luke is pondering his response..."
                        : isPlayerTurn
                        ? "Your turn (White)"
                        : "Luke's turn (Black)"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto text-xs font-mono">
                    {moveHistory.length === 0 ? (
                      <span className="text-stone-400 dark:text-stone-600 text-xs italic">
                        Moves will appear here as you play...
                      </span>
                    ) : (
                      moveHistory.map((m, idx) => (
                        <span
                          key={idx}
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            idx % 2 === 0
                              ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}
                          {m}
                        </span>
                      ))
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
                  onRequestHint={handleRequestHint}
                  onTakeback={handleTakeback}
                  onOpenAskModal={() => setIsAskModalOpen(true)}
                  canTakeback={moveHistory.length >= 2}
                  capturedByWhite={capturedByWhite}
                  capturedByBlack={capturedByBlack}
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

      {/* Game Review Modal */}
      <GameReviewModal
        isOpen={reviewModalState.isOpen}
        onClose={() => setReviewModalState({ isOpen: false, result: 'win' })}
        result={reviewModalState.result}
        moveHistory={moveHistory}
        userElo={userElo}
        userColor={playerColor}
        onPlayAgain={handleStartNewGame}
      />
    </div>
  );
}
