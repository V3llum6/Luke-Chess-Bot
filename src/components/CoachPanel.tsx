import React, { useState } from 'react';
import { Eye, Lightbulb, RotateCcw, MessageSquare, Volume2, VolumeX, Sparkles, CheckCircle2, AlertCircle, HelpCircle, Volume1 } from 'lucide-react';
import { ChessPieceIcon } from './ChessPieces.tsx';
import { CoachFeedback } from '../types.ts';
import { sounds } from '../audio.ts';

interface CoachPanelProps {
  feedback: CoachFeedback;
  isThinking: boolean;
  isPlayerTurn: boolean;
  playerColor: 'w' | 'b';
  coachVisionEnabled: boolean;
  onToggleCoachVision: () => void;
  onRequestHint: () => void;
  onTakeback: () => void;
  onOpenAskModal: () => void;
  canTakeback: boolean;
  capturedByWhite: string[];
  capturedByBlack: string[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  coachLevelName: string;
  onAnswerChallenge?: (isCorrect: boolean) => void;
}

export const CoachPanel: React.FC<CoachPanelProps> = ({
  feedback,
  isThinking,
  isPlayerTurn,
  playerColor,
  coachVisionEnabled,
  onToggleCoachVision,
  onRequestHint,
  onTakeback,
  onOpenAskModal,
  canTakeback,
  capturedByWhite,
  capturedByBlack,
  soundEnabled,
  onToggleSound,
  coachLevelName,
  onAnswerChallenge,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [challengeResult, setChallengeResult] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Reset challenge option state when feedback text changes
  React.useEffect(() => {
    setSelectedOption(null);
    setChallengeResult(null);
  }, [feedback.strategicInsight]);

  const handleSelectOption = (index: number) => {
    setSelectedOption(index);
    const correctIdx = feedback.correctOptionIndex ?? 0;
    const isCorrect = index === correctIdx;

    if (isCorrect) {
      sounds.playVictory();
      setChallengeResult({
        isCorrect: true,
        message: 'Excellent intuition! You answered Luke’s challenge correctly (+5 Elo)!',
      });
    } else {
      sounds.playHint();
      setChallengeResult({
        isCorrect: false,
        message: 'Not quite! Remember to think about controlling the high ground and protecting your team.',
      });
    }

    if (onAnswerChallenge) {
      onAnswerChallenge(isCorrect);
    }
  };

  const handleSpeakAdvice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = `${feedback.theMove}. ${feedback.strategicInsight}. Challenge: ${feedback.microChallenge}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Header: Coach Luke Info & Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-amber-500/40 shrink-0 bg-stone-200 dark:bg-stone-800">
            <img
              src="/src/assets/images/luke_chess_coach_1794055365664.jpg"
              alt="Coach Luke"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                Coach Luke
              </h3>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                {coachLevelName}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isThinking
                ? 'Luke is contemplating his response...'
                : isPlayerTurn
                ? 'Your turn! Take your time to plan.'
                : 'Luke evaluates the board...'}
            </p>
          </div>
        </div>

        {/* Audio & Voice Controls */}
        <div className="flex items-center gap-1">
          {/* Read Aloud Button */}
          <button
            onClick={handleSpeakAdvice}
            className={`p-2 rounded-xl transition-colors ${
              isSpeaking
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 animate-pulse'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title={isSpeaking ? 'Stop voice reading' : 'Read Luke’s advice aloud'}
          >
            <Volume1 className="w-5 h-5" />
          </button>

          {/* Sound FX Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Structured 3-Part Feedback Card */}
      {isThinking ? (
        <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-amber-600 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-amber-600 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-amber-600 animate-bounce [animation-delay:0.4s]" />
          </div>
          <span className="italic">Luke is analyzing the position and framing your insight...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 1. The Move */}
          <div className="bg-stone-50 dark:bg-stone-800/60 rounded-xl p-3 border border-stone-200 dark:border-stone-700/70">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                1. The Move
              </span>
            </div>
            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              {feedback.theMove}
            </p>
          </div>

          {/* 2. The Strategic Insight (One Advice Rule with Analogy) */}
          <div className="bg-amber-50/80 dark:bg-amber-950/20 rounded-xl p-3.5 border border-amber-200/80 dark:border-amber-900/40 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  2. Strategic Insight (The One Rule)
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed">
              {feedback.strategicInsight}
            </p>
          </div>

          {/* 3. Luke's Micro-Challenge (Active Recall) */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl p-3.5 border border-emerald-200/70 dark:border-emerald-900/40 space-y-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                3. Luke&apos;s Micro-Challenge
              </span>
            </div>
            <p className="text-xs font-medium text-stone-800 dark:text-stone-200">
              {feedback.microChallenge}
            </p>

            {/* Micro-Challenge Answer Options */}
            {feedback.challengeOptions && feedback.challengeOptions.length > 0 && (
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {feedback.challengeOptions.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === (feedback.correctOptionIndex ?? 0);

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={selectedOption !== null}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between ${
                        selectedOption === null
                          ? 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-400'
                          : isSelected && isCorrect
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border-emerald-500'
                          : isSelected && !isCorrect
                          ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 border-rose-400'
                          : isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-400/60'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-200 opacity-60'
                      }`}
                    >
                      <span>{opt}</span>
                      {selectedOption !== null && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Challenge Result Message */}
            {challengeResult && (
              <div
                className={`text-[11px] p-2 rounded-lg font-medium animate-fade-in ${
                  challengeResult.isCorrect
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                {challengeResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Captured Pieces Counter */}
      <div className="flex items-center justify-between py-1 text-xs text-stone-500 dark:text-stone-400 border-t border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium mr-1">Captured by You:</span>
          {capturedByWhite.length === 0 ? (
            <span className="text-stone-400 dark:text-stone-600 italic">None yet</span>
          ) : (
            <div className="flex -space-x-1 overflow-x-auto max-w-[140px]">
              {capturedByWhite.map((p, i) => (
                <div key={i} className="w-5 h-5">
                  <ChessPieceIcon type={p.toLowerCase() as any} color={playerColor === 'w' ? 'b' : 'w'} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium mr-1">Captured by Luke:</span>
          {capturedByBlack.length === 0 ? (
            <span className="text-stone-400 dark:text-stone-600 italic">None yet</span>
          ) : (
            <div className="flex -space-x-1 overflow-x-auto max-w-[140px]">
              {capturedByBlack.map((p, i) => (
                <div key={i} className="w-5 h-5">
                  <ChessPieceIcon type={p.toLowerCase() as any} color={playerColor} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <button
          onClick={onToggleCoachVision}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl border transition-colors ${
            coachVisionEnabled
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700/60'
          }`}
          title="Highlight center control & pieces under threat"
        >
          <Eye className="w-4 h-4 shrink-0" />
          <span>{coachVisionEnabled ? 'Vision ON' : 'Coach Vision'}</span>
        </button>

        <button
          onClick={onRequestHint}
          disabled={!isPlayerTurn || isThinking}
          className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl bg-white dark:bg-stone-800 text-amber-700 dark:text-amber-400 border border-stone-200 dark:border-stone-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Get a gentle pedagogical hint (active recall)"
        >
          <Lightbulb className="w-4 h-4 shrink-0" />
          <span>Need a Clue?</span>
        </button>

        <button
          onClick={onTakeback}
          disabled={!canTakeback || isThinking}
          className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Try a different move and test your alternative idea"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>Take Back</span>
        </button>

        <button
          onClick={onOpenAskModal}
          className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl bg-amber-600 hover:bg-amber-700 text-white border border-amber-700 shadow-xs transition-colors"
          title="Ask Luke any beginner chess question in plain English"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>Ask Luke</span>
        </button>
      </div>
    </div>
  );
};
