
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
  hintArrow: { from: string, to: string } | null;
  clearHint: () => void;
}

const Board: React.FC<BoardProps> = ({ 
  isStealth, 
  onLogUpdate, 
  gameInstance, 
  gameState,
  setGameState,
  hintArrow,
  clearHint
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // Lock to prevent StrictMode double-fire
  const isProcessingTurnRef = useRef(false);

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
      captured: [],
      lastMoveSan: gameInstance.history().pop()
    });
  }, [gameInstance, setGameState]);

  // AI Move Effect
  useEffect(() => {
    const makeAiMove = async () => {
      if (gameState.turn !== PlayerColor.BLACK || gameState.isCheckmate) return;
      if (isProcessingTurnRef.current) return;
      
      isProcessingTurnRef.current = true;
      setIsAiThinking(true);
      
      // Delay for "Processing" feel
      await new Promise(r => setTimeout(r, 1000));

      // Safety check if game reset happened during delay
      if (gameInstance.turn() !== 'b') {
         isProcessingTurnRef.current = false;
         setIsAiThinking(false);
         return;
      }

      try {
        // Difficulty 650 ELO
        const result = await getAiMoveAndCommentary(gameState.fen, gameState.history, isStealth, 650);
        
        if (result && result.move) {
            try {
              const from = result.move.substring(0, 2) as Square;
              const to = result.move.substring(2, 4) as Square;
              const promotion = result.move.length > 4 ? result.move.substring(4, 5) : undefined;
              
              const move = gameInstance.move({ from, to, promotion: promotion || 'q' });
              
              if (move) {
                if (result.opening) {
                    onLogUpdate(`init_protocol: ${result.opening}`, 'System');
                }
                
                const isCheck = move.san.includes('+');
                const isCapture = move.san.includes('x');
                
                if (isCheck) onLogUpdate("CRITICAL: DEADLOCK_RISK (check)", "System");
                else if (isCapture) onLogUpdate(`gc_collect: ${move.san}`, "System");
                else onLogUpdate(`exec_pid: ${move.san}`, 'System');
                
                updateState();
              }
            } catch (e) {
              console.warn("Engine move failed:", result.move, e);
              // Fallback random
              const moves = gameInstance.moves();
              if (moves.length > 0) {
                 gameInstance.move(moves[Math.floor(Math.random() * moves.length)]);
                 updateState();
              }
            }
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
    if (gameState.turn === PlayerColor.BLACK || isAiThinking || gameState.isCheckmate) return;

    // Clear hint on interaction
    if (hintArrow) clearHint();

    if (selectedSquare) {
      const move = possibleMoves.find(m => m.to === square);

      if (move) {
        const fenBefore = gameInstance.fen();
        try {
          gameInstance.move({ from: selectedSquare, to: square, promotion: 'q' });
          updateState();
          setSelectedSquare(null);
          setPossibleMoves([]);
          
          const analysis = await analyzeUserMove(fenBefore, move.san, isStealth);
          onLogUpdate(analysis, 'Consultant');
          
        } catch (e) {
          console.error("Invalid move", e);
          setSelectedSquare(null);
        }
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
    const isLastMoveSquare = lastMove ? (lastMove.to === squareName || lastMove.from === squareName) : false;
    const isCheckSquare = piece && piece.type === 'k' && piece.color === gameState.turn && gameState.isCheck;
    
    // Hint Logic
    const isHintSource = hintArrow?.from === squareName;
    const isHintTarget = hintArrow?.to === squareName;

    // Stealth Theme Styles
    let bgClass = 'bg-black';
    
    if (isCheckSquare) {
         bgClass = 'bg-[#330000] animate-pulse'; 
    } else if (isSelected) {
        bgClass = 'bg-[#1a1a1a] shadow-[inset_0_0_0_1px_#00ff00]'; 
    } else if (isPossibleMove) {
        bgClass = 'bg-[#0a110a]'; 
    } else if (isLastMoveSquare) {
        bgClass = 'bg-[#0f1a0f]'; 
    } else if (isHintSource) {
        bgClass = 'bg-[#003300] animate-pulse'; // Hint source
    } else if (isHintTarget) {
        bgClass = 'bg-[#003300] border-2 border-dashed border-[#00ff00] box-border'; // Hint target
    }

    // Border grid for terminal look
    const borderClass = 'border-r border-b border-[#222]';

    return (
      <div 
        key={squareName} 
        onClick={() => handleSquareClick(squareName)}
        className={`w-full h-full relative flex items-center justify-center cursor-pointer ${bgClass} ${borderClass} font-mono transition-colors duration-150`}
      >
        {piece && (
            <StealthPiece type={piece.type} color={piece.color} />
        )}
        
        {/* Possible Move Marker */}
        {isPossibleMove && !piece && (
           <div className="w-1 h-1 bg-[#00ff00] opacity-30"></div>
        )}
      </div>
    );
  };

  const boardSquares = [];
  for (let i = 0; i < 64; i++) {
    boardSquares.push(renderSquare(i));
  }

  return (
    <div className="relative">
      <div className={`grid grid-cols-8 grid-rows-8 aspect-square w-full max-w-[600px] border border-[#333] shadow-[0_0_15px_rgba(0,255,0,0.05)]`}>
        {boardSquares}
      </div>
    </div>
  );
};

export default Board;
