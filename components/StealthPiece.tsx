import React from 'react';

interface StealthPieceProps {
  type: string; // p, n, b, r, q, k
  color: 'w' | 'b';
}

const StealthPiece: React.FC<StealthPieceProps> = ({ type, color }) => {
  // Terminal Colors: 
  // White (Player) = Green (User Process)
  // Black (Opponent) = Red (System/Root Process)
  
  const textColor = color === 'w' ? 'text-[#00ff00]' : 'text-[#ff5555]';
  
  // Naming convention: IT/System processes
  const getLabel = () => {
    switch (type.toLowerCase()) {
      case 'p': return 'proc';   // Process (Pawn)
      case 'n': return 'thrd';   // Thread (Knight - jumps)
      case 'b': return 'sock';   // Socket (Bishop - diagonals/networking)
      case 'r': return 'disk';   // Disk (Rook - heavy storage)
      case 'q': return 'kern';   // Kernel (Queen - powerful)
      case 'k': return 'root';   // Root (King - critical)
      default: return 'unk';
    }
  };

  const label = getLabel();
  // Add some random ID generation simulation for extra stealth
  const pid = React.useMemo(() => Math.floor(Math.random() * 9000) + 1000, []);

  // Unicode icons for visual reference
  const getIcon = () => {
     switch (type.toLowerCase()) {
      case 'p': return '♟';
      case 'n': return '♞';
      case 'b': return '♝';
      case 'r': return '♜';
      case 'q': return '♛';
      case 'k': return '♚';
      default: return '';
    }
  };

  return (
    <div className={`w-full h-full flex flex-col items-start justify-center px-1 font-mono leading-none ${textColor} select-none group relative`}>
      {/* Tiny logo of piece in top right corner */}
      <div className="absolute top-0.5 right-0.5 opacity-30 text-[10px] pointer-events-none font-serif">
        {getIcon()}
      </div>

      <div className="flex items-center gap-1 w-full justify-between opacity-80 group-hover:opacity-100 z-10">
        <span className="text-[10px] font-bold tracking-tighter uppercase">
          {color === 'w' ? 'usr' : 'sys'}:{label}
        </span>
      </div>
      <span className="text-[8px] opacity-40 group-hover:hidden">
        PID:{pid}
      </span>
    </div>
  );
};

export default StealthPiece;