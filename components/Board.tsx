import React, { useState, useEffect, useCallback } from 'react';
import { Chess, Square, Move } from 'chess.js';
import StealthPiece from './StealthPiece';
import { getAiMoveAndCommentary, analyzeUserMove } from '../services/geminiService';
import { GameState, PlayerColor } from '../types';

interface BoardProps {
  isStealth: boolean;
  onLogUpdate: (log: string, author: 'Consultant' | 'System') => void;
  gameInstance: Chess;
  setGameInstance: React.Dispatch<React.SetStateAction<Chess>>;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const Board: React.FC<BoardProps> = ({ 
  isStealth, 
  onLogUpdate, 
  gameInstance, 
  setGameInstance,
  gameState,
  setGameState
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const updateState = useCallback(() => {
    setGameState({
      fen: gameInstance.fen(),
      turn: gameInstance.turn() as PlayerColor,
      isCheck: gameInstance.isCheck(),
      isCheckmate: gameInstance.isCheckmate(),
      history: gameInstance.history(),
      captured: []
    });
  }, [gameInstance, setGameState]);

  useEffect(() => {
    const makeAiMove = async () => {
      if (gameState.turn === PlayerColor.BLACK && !gameState.isCheckmate) {
        setIsAiThinking(true);
        const result = await getAiMoveAndCommentary(gameState.fen, gameState.history, isStealth, 650);
        
        if (result && result.move) {
            try {
              gameInstance.move(result.move);
              updateState();
              if (result.opening && result.opening !== 'Unknown') {
                  onLogUpdate(`detecting pattern: ${result.opening}`, 'System');
              }
              onLogUpdate(result.commentary, 'Consultant');
            } catch (e) {
              const moves = gameInstance.moves();
              if (moves.length > 0) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                gameInstance.move(randomMove);
                updateState();
                onLogUpdate("executing fallback protocol.", 'Consultant');
              }
            }
        }
        setIsAiThinking(false);
      }
    };

    if (gameState.turn === PlayerColor.BLACK) {
      makeAiMove();
    }
  }, [gameState.turn, gameState.fen, isStealth, gameInstance, updateState, onLogUpdate, gameState.history, gameState.isCheckmate]);


  const handleSquareClick = async (square: Square) => {
    if (gameState.turn === PlayerColor.BLACK || isAiThinking || gameState.isCheckmate) return;

    if (selectedSquare) {
      const move = possibleMoves.find(m => m.to === square);

      if (move) {
        const fenBefore = gameInstance.fen();
        gameInstance.move({ from: selectedSquare, to: square, promotion: 'q' });
        updateState();
        setSelectedSquare(null);
        setPossibleMoves([]);
        
        const analysis = await analyzeUserMove(fenBefore, move.san, isStealth);
        onLogUpdate(analysis, 'Consultant');
      } else {
        const piece = gameInstance.get(square);
        if (piece && piece.color === gameState.turn) {
          setSelectedSquare(square);
          setPossibleMoves(gameInstance.moves({ square, verbose: true }));
        } else {
          setSelectedSquare(null);
          setPossibleMoves([]);
        }
      }
    } else {
      const piece = gameInstance.get(square);
      if (piece && piece.color === gameState.turn) {
        setSelectedSquare(square);
        setPossibleMoves(gameInstance.moves({ square, verbose: true }));
      }
    }
  };

  const renderSquare = (i: number) => {
    const file = i % 8;
    const rank = Math.floor(i / 8);
    const squareName = String.fromCharCode(97 + file) + (8 - rank) as Square;
    
    const piece = gameInstance.get(squareName);
    const isSelected = selectedSquare === squareName;
    const isPossibleMove = possibleMoves.some(m => m.to === squareName);
    const isLastMove = gameInstance.history({ verbose: true }).pop()?.to === squareName || 
                       gameInstance.history({ verbose: true }).pop()?.from === squareName;

    let bgClass = '';
    let borderClass = 'border-r border-b border-[#333]';

    if (isStealth) {
      // Terminal Look
      bgClass = 'bg-black'; // Strictly black
      
      if (isSelected) {
        bgClass = 'bg-[#1a1a1a] shadow-[inset_0_0_0_1px_#00ff00]'; // Green highlight border
      } else if (isPossibleMove) {
        bgClass = 'bg-[#111]'; // Slight lift
      } else if (isLastMove) {
        bgClass = 'bg-[#111]'; // Slight lift
      }
    } else {
      // Keep a dark "graphic" mode instead of cream/green to fit the theme
      const isLight = (file + rank) % 2 === 0;
      bgClass = isLight ? 'bg-stone-600' : 'bg-stone-700';
      if (isSelected) bgClass = 'bg-yellow-600';
      else if (isPossibleMove) bgClass = 'bg-yellow-600/50';
      if (isLastMove) bgClass = 'bg-yellow-500';
      borderClass = '';
    }

    return (
      <div 
        key={squareName} 
        onClick={() => handleSquareClick(squareName)}
        className={`w-full h-full relative flex items-center justify-center cursor-pointer ${bgClass} ${borderClass} font-mono`}
      >
        {/* Stealth Mode: Coordinates are hidden or very subtle */}
        {!isStealth && file === 0 && (
           <span className="absolute top-0.5 left-0.5 text-[8px] font-bold opacity-50 text-white">{8 - rank}</span>
        )}
        {!isStealth && rank === 7 && (
           <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold opacity-50 text-white">{String.fromCharCode(97 + file)}</span>
        )}

        {piece && (
          isStealth ? (
            <StealthPiece type={piece.type} color={piece.color} />
          ) : (
             <span className={`text-3xl select-none ${piece.color === 'w' ? 'text-white' : 'text-black'}`}>
               {/* Use icons or text for normal mode, but since user wants ambiguity, maybe keep text? 
                   Let's use Unicode for normal mode but styled for dark theme */}
               {piece.color === 'w' 
                 ? { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' }[piece.type] 
                 : { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' }[piece.type]
               }
             </span>
          )
        )}
        
        {/* Stealth Hint: A small cursor block */}
        {isStealth && isPossibleMove && !piece && (
           <div className="w-2 h-4 bg-[#00ff00] opacity-20 animate-pulse"></div>
        )}
         {!isStealth && isPossibleMove && !piece && (
           <div className="w-3 h-3 rounded-full bg-white opacity-20"></div>
        )}
      </div>
    );
  };

  const boardSquares = [];
  for (let i = 0; i < 64; i++) {
    boardSquares.push(renderSquare(i));
  }

  return (
    <div className={`grid grid-cols-8 grid-rows-8 aspect-square w-full max-w-[600px] ${isStealth ? 'border border-[#333]' : 'border-4 border-stone-600'}`}>
      {boardSquares}
    </div>
  );
};

export default Board;