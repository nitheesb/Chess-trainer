import React from 'react';
import { PIECE_MAP } from '../types';

interface StealthPieceProps {
  type: string; // p, n, b, r, q, k
  color: 'w' | 'b';
}

const StealthPiece: React.FC<StealthPieceProps> = ({ type, color }) => {
  // Terminal Colors: 
  // White (Player) = Green (User/Staff)
  // Black (Opponent) = Red (System/Admin)
  
  const textColor = color === 'w' ? 'text-[#00ff00]' : 'text-[#ff5555]';
  const role = PIECE_MAP[type.toLowerCase()] || 'Unknown';
  
  // Abbreviate roles for stealth/terminal look
  // Intern -> INT, Lead -> LED, Manager -> MGR, VP -> VP, Director -> DIR, CEO -> CEO
  const getAbbr = (role: string) => {
    switch(role) {
        case 'Intern': return 'INT';
        case 'Lead': return 'LED';
        case 'Manager': return 'MGR';
        case 'VP': return 'VP_';
        case 'Director': return 'DIR';
        case 'CEO': return 'CEO';
        default: return 'UNK';
    }
  };

  const label = getAbbr(role);
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
    <div className={`w-full h-full flex flex-col items-start justify-center px-1 font-mono leading-none ${textColor} select-none group relative overflow-hidden`}>
      {/* Tiny logo of piece in top right corner */}
      <div className="absolute top-0.5 right-0.5 opacity-20 text-[10px] pointer-events-none font-serif">
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
      
      {/* Tooltip for learning */}
      <div className="absolute hidden group-hover:flex -top-8 left-1/2 -translate-x-1/2 bg-[#222] text-white text-[10px] px-2 py-1 border border-[#444] z-50 whitespace-nowrap">
          {role} ({type.toUpperCase()})
      </div>
    </div>
  );
};

export default StealthPiece;