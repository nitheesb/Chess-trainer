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
  Command
} from 'lucide-react';
import Board from './components/Board';
import { GameState, PlayerColor } from './types';

// Mock initial data
const INITIAL_STATS = {
  rating: 650,
  xp: 1240,
  streak: 3,
  completedTasks: 14
};

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
    // Lowercase logging for terminal feel
    setLogs(prev => [...prev, { id: Date.now(), text: text.toLowerCase(), author: author === 'Consultant' ? 'audit' : 'root', time: timeString }]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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
    addLog("reboot sequence initiated. memory cleared.", 'System');
  };

  const appTitle = isStealth ? "term_v2.zsh" : "Chess Trainer";
  
  return (
    <div className={`min-h-screen flex flex-col font-mono selection:bg-[#00ff00] selection:text-black ${isStealth ? 'bg-black text-[#ccc]' : 'bg-stone-900 text-stone-100'}`}>
      
      {/* Top Navigation Bar: Looks like tmux status bar */}
      <nav className={`h-10 border-b flex items-center justify-between px-4 text-xs ${isStealth ? 'bg-[#111] border-[#333]' : 'bg-stone-800 border-stone-700'}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[#00ff00]" />
            <span className="font-bold">{appTitle}</span>
          </div>
          <span className="opacity-50">|</span>
          <span className="opacity-70">uid: 501 (staff)</span>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Stats as system load averages */}
           <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Command size={14} className="opacity-50" />
                <span>load: {(INITIAL_STATS.rating/1000).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Hash size={14} className="opacity-50" />
                <span>uptime: {INITIAL_STATS.xp}s</span>
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
      <main className="container mx-auto p-4 flex-1 flex flex-col lg:flex-row gap-4 max-w-7xl">
        
        {/* Left Panel: Process List (Stats) */}
        <div className={`lg:w-64 flex flex-col gap-4 ${isStealth ? 'text-xs' : ''}`}>
           <div className={`p-4 border ${isStealth ? 'bg-black border-[#333] font-mono' : 'bg-stone-800 border-stone-700 rounded'}`}>
              <h3 className="uppercase font-bold mb-4 flex items-center gap-2 text-[#00ff00]">
                 <Activity size={12} /> STATUS
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="opacity-60">cpu_usage</span>
                  <span>{Math.min(gameState.history.length * 2, 100)}%</span>
                </div>
                {/* ASCII Progress Bar */}
                <div className="w-full text-[#333] bg-[#111] overflow-hidden whitespace-nowrap">
                  {'#'.repeat(Math.min(gameState.history.length, 20))}
                </div>

                <div className="flex justify-between mt-4">
                  <span className="opacity-60">tasks_killed</span>
                  <span>{INITIAL_STATS.completedTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">uptime_streak</span>
                  <span>{INITIAL_STATS.streak}d</span>
                </div>
              </div>
           </div>

           <div className={`p-4 border ${isStealth ? 'bg-black border-[#333]' : 'bg-stone-800 border-stone-700 rounded'}`}>
              <h3 className="uppercase font-bold mb-2 flex items-center gap-2 text-[#ff5555]">
                 <Cpu size={12} /> THREADS
              </h3>
              <div className="flex flex-col gap-1 opacity-80">
                 <div className="flex items-center gap-2">
                    <span className="text-[#00ff00] font-bold">●</span>
                    <span>usr_main (active)</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[#ff5555] font-bold">●</span>
                    <span>sys_daemon (bg)</span>
                 </div>
              </div>
           </div>
           
           <button 
              onClick={resetGame}
              className={`w-full py-2 border text-center uppercase tracking-widest hover:bg-[#111] transition-colors
                ${isStealth 
                  ? 'bg-black border-[#333] text-[#ff5555] text-xs' 
                  : 'bg-stone-700 text-stone-200 border-stone-600 rounded'}`}
           >
              $ sudo reboot
           </button>
        </div>

        {/* Center: The Terminal Board */}
        <div className="flex-1 flex flex-col items-center justify-start pt-4 lg:pt-10">
          <div className="w-full max-w-[600px] mb-2 flex justify-between items-end text-xs font-mono">
             <div className="opacity-50">/usr/bin/workflow_opt --interactive</div>
             {gameState.isCheck && <span className="text-[#ff5555] bg-[#300] px-2 animate-pulse">WARN: DEADLOCK DETECTED</span>}
             {gameState.isCheckmate && <span className="text-[#00ff00] bg-[#030] px-2">SUCCESS: PROCESS COMPLETED</span>}
          </div>
          
          <Board 
            isStealth={isStealth} 
            onLogUpdate={addLog}
            gameInstance={gameInstance}
            gameState={gameState}
            setGameState={setGameState}
          />
        </div>

        {/* Right: The Console Output (Chat) */}
        <div className={`lg:w-80 flex flex-col h-[400px] lg:h-auto border ${isStealth ? 'bg-[#0a0a0a] border-[#333]' : 'bg-stone-800 border-stone-700 rounded'}`}>
           <div className={`p-2 border-b flex items-center gap-2 text-xs ${isStealth ? 'border-[#333] bg-[#111]' : 'border-stone-700'}`}>
              <MessageSquare size={12} className="opacity-60" />
              <span className="font-bold">stdout / stderr</span>
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