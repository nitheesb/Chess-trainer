
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
  lastMoveSan?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string; // The "Stealth" description
  xpReward: number;
  condition: 'move_piece' | 'control_center' | 'castle' | 'capture' | 'check';
  targetPiece?: string; // 'n', 'p', etc.
  completed: boolean;
}

export interface UserStats {
  level: 'Intern' | 'Junior Dev' | 'Senior Dev' | 'Lead Architect';
  xp: number; 
  streak: number;
  ticketsClosed: number;
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
