import React, { useState } from 'react';
import { X, Send, Sparkles, MessageCircle, HelpCircle } from 'lucide-react';

interface AskLukeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userElo: number;
}

const COMMON_QUESTIONS = [
  'Why do grandmasters always say to control the center?',
  'When is the best time to castle my king?',
  'What is the easiest habit to stop hanging pieces for free?',
  'Why shouldn’t I attack with my queen on move 2?',
  'What does "en passant" mean in plain English?',
  'How do I decide whether to trade pieces or keep them?',
];

export const AskLukeModal: React.FC<AskLukeModalProps> = ({ isOpen, onClose, userElo }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (qToSubmit?: string) => {
    const text = qToSubmit || question;
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/coach/ask-luke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, userElo }),
      });
      const data = await res.json();
      setResponse(data.answer || 'Keep practicing the basics: center control and king safety!');
    } catch {
      setResponse(
        'In chess, keep it simple: control the center squares, castle your king early, and double-check if your pieces are protected!'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-amber-500/40 shrink-0 bg-stone-200 dark:bg-stone-800">
              <img
                src="/src/assets/images/luke_chess_coach_1794055365664.jpg"
                alt="Coach Luke"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-display">
                Ask Coach Luke
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Uncomplicated, jargon-free chess wisdom for everyday players.
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Preset Questions */}
          <div>
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block mb-2">
              Popular Beginner Questions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuestion(q);
                    handleSubmit(q);
                  }}
                  className="text-left text-xs bg-stone-100 dark:bg-stone-800/80 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-stone-700 dark:text-stone-300 p-2 rounded-lg border border-stone-200/80 dark:border-stone-700/80 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Response Box */}
          {isLoading && (
            <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/40 flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-amber-600 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-amber-600 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-amber-600 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span>Luke is writing a simple explanation for you...</span>
            </div>
          )}

          {response && !isLoading && (
            <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/50 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Coach Luke says:</span>
              </div>
              <div className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line">
                {response}
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type any chess question in plain English..."
            className="flex-1 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
