export enum PlayerColor {
  WHITE = 'w',
  BLACK = 'b'
}

export interface GameState {
  fen: string;
  turn: PlayerColor;
  isCheck: boolean;
  isCheckmate: boolean;
  history: string[];
  captured: string[];
}

export interface Puzzle {
  id: string;
  fen: string;
  solution: string[]; // LAN or SAN
  description: string;
  difficulty: 'Junior' | 'Senior' | 'Executive';
}

export interface UserStats {
  rating: number; // The "Efficiency Score"
  xp: number; // "Productivity Points"
  streak: number;
  completedTasks: number;
}

export type StealthPieceType = 'Intern' | 'Lead' | 'Manager' | 'VP' | 'Director' | 'CEO';

export const PIECE_MAP: Record<string, StealthPieceType> = {
  'p': 'Intern',
  'n': 'Lead',
  'b': 'Manager',
  'r': 'VP',
  'q': 'Director',
  'k': 'CEO'
};