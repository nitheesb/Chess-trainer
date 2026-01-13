
import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { 
  Terminal,
  Activity, 
  Cpu, 
  MessageSquare, 
  Eye, 
  EyeOff,
  Hash,
  Command,
  Ticket,
  Play,
  CheckCircle2
} from 'lucide-react';
import Board from './components/Board';
import { GameState, PlayerColor, Mission, UserStats } from './types';
import { getHint } from './services/geminiService';

// Initial Training Missions
const INITIAL_MISSIONS: Mission[] = [
  { id: 'm1', title: 'Init Protocol', description: 'Move Pawn to e4 or d4 to claim center memory.', condition: 'control_center', xpReward: 50, completed: false },
  { id: 'm2', title: 'Deploy Assets', description: 'Develop a Knight (Lead) to f3 or c3.', condition: 'move_piece', targetPiece: 'n', xpReward: 75, completed: false },
  { id: 'm3', title: 'Secure Kernel', description: 'Castle (O-O) to protect the CEO.', condition: 'castle', xpReward: 100, completed: false }
];

const App: React.FC = () => {
  const [isStealth, setIsStealth] = useState(true);
  const [gameInstance, setGameInstance] = useState(new Chess());
  const [gameState, setGameState] = useState<GameState>({
    fen: gameInstance.fen(),
    turn: PlayerColor.WHITE,
    isCheck: false,
    isCheckmate: false,
    history: [],
    captured: []
  });
  
  const [stats, setStats] = useState<UserStats>({
    level: 'Intern',
    xp: 0,
    streak: 4,
    ticketsClosed: 0
  });

  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [hintArrow, setHintArrow] = useState<{from: string, to: string} | null>(null);

  const [logs, setLogs] = useState<{ id: number, text: string, author: string, time: string }[]>([
    { id: 1, text: "booting kernel v5.15.0-generic...", author: "sys", time: "09:00:00" },
    { id: 2, text: "mounting file systems... done.", author: "sys", time: "09:00:01" },
    { id: 3, text: "starting workflow_optimizer_pro service...", author: "sys", time: "09:00:02" },
    { id: 4, text: "ready. waiting for user input.", author: "sys", time: "09:00:03" }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addLog = (text: string, author: 'Consultant' | 'System') => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, { id: Date.now(), text: text, author: author === 'Consultant' ? 'audit' : 'root', time: timeString }]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Leveling Logic
  useEffect(() => {
    if (stats.xp > 500 && stats.level === 'Intern') setStats(s => ({ ...s, level: 'Junior Dev' }));
    if (stats.xp > 1500 && stats.level === 'Junior Dev') setStats(s => ({ ...s, level: 'Senior Dev' }));
  }, [stats.xp, stats.level]);

  // Mission Check Logic
  useEffect(() => {
    if (gameState.turn === PlayerColor.BLACK && gameState.lastMoveSan) {
      // User just moved (now it's black's turn)
      const move = gameState.lastMoveSan;
      const history = gameInstance.history({ verbose: true });
      const lastMoveObj = history[history.length - 1];

      setMissions(prevMissions => prevMissions.map(mission => {
        if (mission.completed) return mission;

        let completed = false;

        // Check conditions
        if (mission.condition === 'control_center') {
            if (['e4', 'd4'].includes(lastMoveObj.to)) completed = true;
        }
        if (mission.condition === 'move_piece' && mission.targetPiece) {
            if (lastMoveObj.piece === mission.targetPiece) completed = true;
        }
        if (mission.condition === 'castle') {
            if (move.includes('O-O')) completed = true;
        }

        if (completed) {
           addLog(`TICKET_CLOSED: ${mission.title} (+${mission.xpReward} uptime)`, 'System');
           setStats(s => ({ 
             ...s, 
             xp: s.xp + mission.xpReward, 
             ticketsClosed: s.ticketsClosed + 1 
           }));
           return { ...mission, completed: true };
        }
        return mission;
      }));
    }
  }, [gameState.turn, gameState.lastMoveSan, gameInstance]);

  const requestHint = async () => {
    addLog("running_diagnostics...", "System");
    const hint = await getHint(gameState.fen);
    if (hint) {
      setHintArrow({ from: hint.from, to: hint.to });
      addLog(hint.log, "System");
    } else {
      addLog("diagnostics_failed: engine_busy", "System");
    }
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGameInstance(newGame);
    setGameState({
      fen: newGame.fen(),
      turn: PlayerColor.WHITE,
      isCheck: false,
      isCheckmate: false,
      history: [],
      captured: []
    });
    setMissions(INITIAL_MISSIONS.map(m => ({...m, completed: false})));
    setHintArrow(null);
    addLog("reboot sequence initiated. memory cleared.", 'System');
  };

  const appTitle = isStealth ? "term_v2.zsh" : "Chess Trainer";
  
  return (
    <div className={`min-h-screen flex flex-col font-mono selection:bg-[#00ff00] selection:text-black ${isStealth ? 'bg-black text-[#ccc]' : 'bg-stone-900 text-stone-100'}`}>
      
      {/* Top Navigation Bar */}
      <nav className={`h-10 border-b flex items-center justify-between px-4 text-xs ${isStealth ? 'bg-[#111] border-[#333]' : 'bg-stone-800 border-stone-700'}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[#00ff00]" />
            <span className="font-bold">{appTitle}</span>
          </div>
          <span className="opacity-50">|</span>
          <span className={`font-bold ${stats.level === 'Intern' ? 'text-gray-400' : 'text-[#00ff00]'}`}>
             role: {stats.level}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Command size={14} className="opacity-50" />
                <span>tickets: {stats.ticketsClosed}</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash size={14} className="opacity-50" />
                <span>uptime: {stats.xp}ms</span>
              </div>
           </div>

           <button 
             onClick={() => setIsStealth(!isStealth)}
             className={`p-1 hover:text-white transition-colors ${isStealth ? 'text-gray-500' : 'text-stone-300'}`}
             title="Toggle View Mode"
           >
             {isStealth ? <EyeOff size={14} /> : <Eye size={14} />}
           </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="container mx-auto p-2 md:p-4 flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl h-full">
        
        {/* Left Panel: Missions (Tickets) */}
        <div className={`lg:w-64 flex flex-col gap-4 ${isStealth ? 'text-xs' : ''}`}>
           <div className={`p-4 border flex-1 ${isStealth ? 'bg-black border-[#333] font-mono' : 'bg-stone-800 border-stone-700 rounded'}`}>
              <h3 className="uppercase font-bold mb-4 flex items-center gap-2 text-[#00ff00]">
                 <Ticket size={12} /> OPEN_TICKETS
              </h3>
              
              <div className="space-y-4">
                {missions.map(m => (
                  <div key={m.id} className={`p-2 border ${m.completed ? 'border-[#00ff00] bg-[#001100]' : 'border-[#333]'} relative group`}>
                     <div className="flex justify-between items-start mb-1">
                        <span className={`font-bold ${m.completed ? 'text-[#00ff00]' : 'text-gray-400'}`}>{m.title}</span>
                        {m.completed && <CheckCircle2 size={12} className="text-[#00ff00]" />}
                     </div>
                     <p className="opacity-60 text-[10px] leading-tight">{m.description}</p>
                     <div className="mt-2 text-[9px] opacity-40 text-right">reward: {m.xpReward}xp</div>
                  </div>
                ))}
                
                {missions.every(m => m.completed) && (
                   <div className="text-center opacity-50 italic py-4">All tickets resolved. Good work.</div>
                )}
              </div>
           </div>

           <div className={`p-4 border ${isStealth ? 'bg-black border-[#333]' : 'bg-stone-800 border-stone-700 rounded'}`}>
              <h3 className="uppercase font-bold mb-2 flex items-center gap-2 text-[#ff5555]">
                 <Cpu size={12} /> CONTROLS
              </h3>
              <div className="flex flex-col gap-2">
                 <button 
                    onClick={requestHint}
                    className="flex items-center gap-2 hover:bg-[#111] p-1 text-left text-xs text-[#00ff00]"
                 >
                    <Play size={10} />
                    <span>run_diagnostics()</span>
                 </button>
                 <button 
                    onClick={resetGame}
                    className="flex items-center gap-2 hover:bg-[#111] p-1 text-left text-xs text-[#ff5555]"
                 >
                    <Activity size={10} />
                    <span>sudo_reboot</span>
                 </button>
              </div>
           </div>
        </div>

        {/* Center: The Terminal Board */}
        <div className="flex-1 flex flex-col items-center justify-start pt-2 lg:pt-10">
          <div className="w-full max-w-[600px] mb-2 flex justify-between items-end text-xs font-mono">
             <div className="opacity-50">/usr/bin/chess_trainer --stealth</div>
             {gameState.isCheck && <span className="text-[#ff5555] bg-[#300] px-2 animate-pulse">WARN: DEADLOCK DETECTED</span>}
             {gameState.isCheckmate && <span className="text-[#00ff00] bg-[#030] px-2">SUCCESS: PROCESS COMPLETED</span>}
          </div>
          
          <Board 
            isStealth={isStealth} 
            onLogUpdate={addLog}
            gameInstance={gameInstance}
            gameState={gameState}
            setGameState={setGameState}
            hintArrow={hintArrow}
            clearHint={() => setHintArrow(null)}
          />
        </div>

        {/* Right: The Console Output (Chat) */}
        <div className={`lg:w-80 flex flex-col h-[200px] lg:h-auto border ${isStealth ? 'bg-[#0a0a0a] border-[#333]' : 'bg-stone-800 border-stone-700 rounded'}`}>
           <div className={`p-2 border-b flex items-center gap-2 text-xs ${isStealth ? 'border-[#333] bg-[#111]' : 'border-stone-700'}`}>
              <MessageSquare size={12} className="opacity-60" />
              <span className="font-bold">system_logs</span>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2 font-mono">
                   <span className="opacity-30 select-none">[{log.time}]</span>
                   <span className={`${log.author === 'root' ? 'text-[#ff5555]' : 'text-[#00ff00]'} w-12 shrink-0 select-none`}>
                     {log.author}:
                   </span>
                   <span className="opacity-90 break-words">{log.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
           </div>

           <div className="p-2 border-t border-[#333] text-[10px] opacity-40 bg-black">
              <span className="animate-pulse">_</span>
           </div>
        </div>

      </main>
    </div>
  );
};

export default App;
