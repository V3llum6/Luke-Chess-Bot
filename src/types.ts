export type EloTier = 'BEGINNER' | 'NOVICE' | 'INTERMEDIATE' | 'MASTER';

export interface EloMilestone {
  id: string;
  tier: EloTier;
  minElo: number;
  maxElo: number;
  title: string;
  subtitle: string;
  description: string;
  coreSkills: string[];
}

export const ELO_MILESTONES: EloMilestone[] = [
  {
    id: 'beginner-bracket',
    tier: 'BEGINNER',
    minElo: 400,
    maxElo: 799,
    title: 'Beginner (< 800 Elo)',
    subtitle: 'Piece Safety & Basic Movement',
    description:
      'Mastering basic piece movements, eliminating hanging pieces (the 3-second safety scan), 1-step captures, and claiming the central high ground.',
    coreSkills: [
      'Basic piece safety: Never leave a piece undefended ("hanging")',
      'The 3-Second Scan before letting go of a piece',
      'Center control as "taking the high ground" (e4/d4)',
      '1-step basic captures and basic King retreats',
    ],
  },
  {
    id: 'novice-bracket',
    tier: 'NOVICE',
    minElo: 800,
    maxElo: 1199,
    title: 'Novice (800 – 1200 Elo)',
    subtitle: 'Tactical Motifs & Opening Discipline',
    description:
      'Spotting basic tactical patterns (forks, pins, skewers), prioritizing early King castling, and opening discipline: never move the same piece twice before developing your team.',
    coreSkills: [
      'Basic tactical motifs: Knight forks, Bishop pins, Rook skewers',
      'King safety: Castle before move 10',
      'Opening rule: "Get your whole team on the field before attacking"',
      'Do not bring the Queen out prematurely',
    ],
  },
  {
    id: 'intermediate-bracket',
    tier: 'INTERMEDIATE',
    minElo: 1200,
    maxElo: 1599,
    title: 'Intermediate (1200 – 1600 Elo)',
    subtitle: 'Pawn Structures & Multi-Move Planning',
    description:
      'Analyzing pawn structures, targeting weak color squares and outposts, planning 2–3 moves ahead, and converting basic endgames (King + Rook checkmate).',
    coreSkills: [
      'Pawn structure integrity (pawn chains vs isolated pawns)',
      'Exploiting outposts and weak backward pawns',
      'Calculating 2–3 moves deep with active recall',
      'Fundamental endgames: King + Rook, King + Pawn conversions',
    ],
  },
  {
    id: 'master-bracket',
    tier: 'MASTER',
    minElo: 1600,
    maxElo: 2300,
    title: 'Advanced / Master (1600+ Elo)',
    subtitle: 'Prophylaxis & Positional Nuance',
    description:
      'Deep positional trade-offs, pawn levers, prophylactic thinking ("What does my opponent plan?"), and converting subtle technical advantages.',
    coreSkills: [
      'Prophylactic defense: Preventing opponent threats before they appear',
      'Pawn levers and file openings at critical junctures',
      'Dynamic piece sacrifices for king attack or space advantage',
      'Deep calculation paths and master-level endgame technique',
    ],
  },
];

export interface CoachLevel {
  id: string;
  name: string;
  elo: number;
  tier: EloTier;
  description: string;
  styleDescription: string;
}

export const COACH_LEVELS: CoachLevel[] = [
  {
    id: 'gentle',
    name: 'Gentle Guide Luke',
    elo: 500,
    tier: 'BEGINNER',
    description: 'Gentle, forgiving pace. Highlights hanging pieces and basic movement.',
    styleDescription: 'Uses simple metaphors like "getting your team on the field" and protects you from blunders.',
  },
  {
    id: 'novice',
    name: 'Novice Coach Luke',
    elo: 950,
    tier: 'NOVICE',
    description: 'Tests basic tactical motifs like forks, pins, and early castling.',
    styleDescription: 'Challenges you to avoid moving the same piece twice and rewards king safety.',
  },
  {
    id: 'intermediate',
    name: 'Strategist Luke',
    elo: 1350,
    tier: 'INTERMEDIATE',
    description: 'Emphasizes pawn chains, outposts, and multi-move planning.',
    styleDescription: 'Pushes you to plan 2-3 moves ahead and spot positional weaknesses.',
  },
  {
    id: 'master',
    name: 'Master Luke',
    elo: 1750,
    tier: 'MASTER',
    description: 'Sharp positional play, prophylactic prevention, and endgame technique.',
    styleDescription: 'Demands tactical precision and deep prophylactic calculation.',
  },
];

export interface VisualArrow {
  from: string;
  to: string;
  color?: 'amber' | 'emerald' | 'rose' | 'sky';
}

export type MoveQuality = 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveRecord {
  san: string;
  english: string;
  fen: string;
  from: string;
  to: string;
  color: 'w' | 'b';
  captured?: string;
  quality?: MoveQuality;
}

export interface OpeningInfo {
  name: string;
  nickname: string;
  summary: string;
  tip: string;
}

export interface CoachFeedback {
  theMove: string;
  strategicInsight: string;
  microChallenge: string;
  challengeOptions?: string[];
  correctOptionIndex?: number;
  visualArrows?: VisualArrow[];
  asciiBoard?: string;
  threatWarning?: string;
  blunderDetected?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  targetElo: string;
  category: string;
  analogy: string;
  introText: string;
  initialFen: string;
  playerColor: 'w' | 'b';
  solutionMoves: string[];
  hints: string[];
  successMessage: string;
  explanation: string;
  visualArrows?: VisualArrow[];
}

export interface TacticalPuzzle {
  id: string;
  title: string;
  elo: number;
  tier: EloTier;
  fen: string;
  playerColor: 'w' | 'b';
  solutionSan: string[];
  theme: string;
  prompt: string;
  lukeClue: string;
  explanation: string;
  visualArrows?: VisualArrow[];
}
