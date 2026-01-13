import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess, Square, Move } from 'chess.js';
import StealthPiece from './StealthPiece';
import { getAiMoveAndCommentary, analyzeUserMove } from '../services/geminiService';
import { GameState, PlayerColor } from '../types';

interface BoardProps {
  isStealth: boolean;
  onLogUpdate: (log: string, author: 'Consultant' | 'System') => void;
  gameInstance: Chess;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const Board: React.FC<BoardProps> = ({ 
  isStealth, 
  onLogUpdate, 
  gameInstance, 
  gameState,
  setGameState
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // Use a ref to prevent race conditions in StrictMode
  const isProcessingTurnRef = useRef(false);

  // Memoize last move to avoid recalculating it 64 times per render
  const lastMove = useMemo(() => {
    const history = gameInstance.history({ verbose: true });
    return history.length > 0 ? history[history.length - 1] : null;
  }, [gameState.history, gameInstance]);

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
      // Check turn from gameState, but we will double check gameInstance in execution
      if (gameState.turn !== PlayerColor.BLACK || gameState.isCheckmate) return;
      
      // Prevent double invocation
      if (isProcessingTurnRef.current) return;
      isProcessingTurnRef.current = true;

      setIsAiThinking(true);
      
      // Artificial delay for realism
      await new Promise(r => setTimeout(r, 800));

      // CRITICAL: Check turn again using the LIVE gameInstance. 
      // If the component unmounted or state updated rapidly, we might be in a bad state.
      if (gameInstance.turn() !== 'b') {
         isProcessingTurnRef.current = false;
         setIsAiThinking(false);
         return;
      }

      try {
        const result = await getAiMoveAndCommentary(gameState.fen, gameState.history, isStealth, 650);
        
        let moveMade = false;

        if (result && result.move) {
            try {
              // Stockfish returns "e2e4" or "a7a8q". chess.js move() needs strict handling.
              // Convert LAN to object for chess.js
              const from = result.move.substring(0, 2) as Square;
              const to = result.move.substring(2, 4) as Square;
              const promotion = result.move.length > 4 ? result.move.substring(4, 5) : undefined;
              
              const move = gameInstance.move({ from, to, promotion: promotion || 'q' });
              
              if (move) {
                moveMade = true;
                
                // Opening detection
                if (result.opening && result.opening !== 'Unknown') {
                    onLogUpdate(`pattern_match: ${result.opening.toLowerCase().replace(/ /g, '_')}`, 'System');
                }
                
                // Move commentary
                const san = move.san;
                const isCheck = san.includes('+');
                const isCapture = san.includes('x');
                
                if (isCheck) onLogUpdate("warn: thread_interrupt (check)", "System");
                else if (isCapture) onLogUpdate(`resource_reclaimed [${san}]`, "System");
                else onLogUpdate(`exec: ${san}`, 'System');
              }
            } catch (e) {
              console.warn("Engine move execution failed:", result.move, e);
            }
        } 
        
        // Fallback Random Move
        if (!moveMade) {
             const moves = gameInstance.moves();
             if (moves.length > 0) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                gameInstance.move(randomMove);
                moveMade = true;
                onLogUpdate("executing_fallback_routine", 'System');
             }
        }

        if (moveMade) {
          updateState();
        }
      } catch (err) {
        console.error("AI Error", err);
      } finally {
        setIsAiThinking(false);
        isProcessingTurnRef.current = false;
      }
    };

    if (gameState.turn === PlayerColor.BLACK) {
      makeAiMove();
    }
  }, [gameState.turn, gameState.fen, isStealth, gameInstance, updateState, onLogUpdate, gameState.isCheckmate]);


  const handleSquareClick = async (square: Square) => {
    // Block input if AI is thinking or game over
    if (gameState.turn === PlayerColor.BLACK || isAiThinking || gameState.isCheckmate) return;

    if (selectedSquare) {
      // Trying to move
      const move = possibleMoves.find(m => m.to === square);

      if (move) {
        const fenBefore = gameInstance.fen();
        try {
          gameInstance.move({ from: selectedSquare, to: square, promotion: 'q' });
          
          // Immediate State Update
          updateState();
          
          setSelectedSquare(null);
          setPossibleMoves([]);
          
          // Analyze user move
          const analysis = await analyzeUserMove(fenBefore, move.san, isStealth);
          onLogUpdate(analysis, 'Consultant');
          
        } catch (e) {
          console.error("Move invalid", e);
          setSelectedSquare(null);
        }
      } else {
        // Clicking another square? Select it if it's ours, else deselect
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
      // First click
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
    const isLastMoveSquare = lastMove ? (lastMove.to === squareName || lastMove.from === squareName) : false;
    const isCheckSquare = piece && piece.type === 'k' && piece.color === gameState.turn && gameState.isCheck;

    let bgClass = '';
    let borderClass = 'border-r border-b border-[#333]';

    if (isStealth) {
      // Terminal Look
      bgClass = 'bg-black'; // Strictly black
      
      if (isCheckSquare) {
         bgClass = 'bg-[#330000] animate-pulse'; // Alarm for check
      } else if (isSelected) {
        bgClass = 'bg-[#1a1a1a] shadow-[inset_0_0_0_1px_#00ff00]'; 
      } else if (isPossibleMove) {
        bgClass = 'bg-[#111]'; 
      } else if (isLastMoveSquare) {
        bgClass = 'bg-[#0f1a0f]'; 
      }
    } else {
      // "Graphic" mode
      const isLight = (file + rank) % 2 === 0;
      bgClass = isLight ? 'bg-stone-700' : 'bg-stone-800';
      
      if (isCheckSquare) bgClass = 'bg-red-900';
      else if (isSelected) bgClass = 'bg-yellow-900/50';
      else if (isPossibleMove) bgClass = 'bg-yellow-900/30';
      else if (isLastMoveSquare) bgClass = 'bg-yellow-900/40';
      
      borderClass = '';
    }

    return (
      <div 
        key={squareName} 
        onClick={() => handleSquareClick(squareName)}
        className={`w-full h-full relative flex items-center justify-center cursor-pointer ${bgClass} ${borderClass} font-mono`}
      >
        {!isStealth && file === 0 && (
           <span className="absolute top-0.5 left-0.5 text-[8px] font-bold opacity-50 text-stone-500">{8 - rank}</span>
        )}
        {!isStealth && rank === 7 && (
           <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold opacity-50 text-stone-500">{String.fromCharCode(97 + file)}</span>
        )}

        {piece && (
          isStealth ? (
            <StealthPiece type={piece.type} color={piece.color} />
          ) : (
             <span className={`text-3xl select-none ${piece.color === 'w' ? 'text-stone-200' : 'text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]'}`}>
               {piece.color === 'w' 
                 ? { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' }[piece.type] 
                 : { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' }[piece.type]
               }
             </span>
          )
        )}
        
        {isStealth && isPossibleMove && !piece && (
           <div className="w-1.5 h-3 bg-[#00ff00] opacity-20 animate-pulse"></div>
        )}
         {!isStealth && isPossibleMove && !piece && (
           <div className="w-3 h-3 rounded-full bg-white/10"></div>
        )}
      </div>
    );
  };

  const boardSquares = [];
  for (let i = 0; i < 64; i++) {
    boardSquares.push(renderSquare(i));
  }

  return (
    <div className={`grid grid-cols-8 grid-rows-8 aspect-square w-full max-w-[600px] shadow-2xl ${isStealth ? 'border border-[#333]' : 'border-4 border-stone-700 rounded-sm'}`}>
      {boardSquares}
    </div>
  );
};

export default Board;