// REPLACED GEMINI WITH STOCKFISH.JS (Open Source Engine)
// No API Key required. Runs locally in the browser.

const STOCKFISH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js';

let engine: Worker | null = null;
// Removed unused engineStatus

// --- OPENING BOOK (Mini) ---
const OPENINGS: Record<string, string> = {
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq': 'King\'s Pawn Opening',
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq': 'Queen\'s Pawn Opening',
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq': 'English Opening',
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq': 'Réti Opening',
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'Open Game',
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'Sicilian Defense',
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'French Defense',
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'Caro-Kann Defense',
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq': 'Closed Game',
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'Scandinavian Defense',
};

// --- COMMENTARY TEMPLATES ---
const STEALTH_PHRASES = {
  opening: ["initializing protocols...", "loading standard config...", "handshake initiated..."],
  capture: ["garbage collection executed.", "pid terminated.", "freeing memory address.", "process kill -9 sent."],
  check: ["interrupt signal received!", "warning: high latency detected.", "deadlock risk increasing."],
  castle: ["backup routine successful.", "data migration complete.", "secure shell established."],
  good: ["optimization successful.", "efficiency +15%.", "cpu load nominal."],
  bad: ["segfault detected.", "memory leak identified.", "critical error in logic."],
  blunder: ["kernel panic imminent.", "fatal exception.", "system crash risk 99%."]
};

const COACH_PHRASES = {
  opening: ["Let's control the center.", "Develop your pieces early.", "King safety is priority."],
  capture: ["Material advantage gained.", "Good trade.", "Removing the defender."],
  check: ["Keep the pressure on!", "The King is under attack.", "Force a response."],
  castle: ["King is safe now.", "Rooks are connected.", "Good defensive measure."],
  good: ["Solid move.", "Improving position.", "Nice find."],
  bad: ["That leaves you vulnerable.", "Careful, check your diagonals.", "A bit passive."],
  blunder: ["Oh no, you dropped a piece!", "That was a mistake.", "Watch out!"]
};

// Initialize Stockfish Worker with Blob to avoid CORS
const initEngine = async () => {
  if (!engine && typeof Worker !== 'undefined') {
    try {
      const response = await fetch(STOCKFISH_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const script = await response.text();
      const blob = new Blob([script], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      engine = new Worker(workerUrl);
      
      engine.onmessage = (event) => {
        if (event.data === 'uciok') {
          // Engine ready
        }
      };
      engine.postMessage('uci');
      engine.postMessage('isready');
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error);
    }
  }
};

initEngine();

/**
 * Gets the best move from Stockfish.
 */
const getBestMoveFromStockfish = (fen: string, depth: number = 10): Promise<{ bestMove: string, eval: number }> => {
  return new Promise((resolve) => {
    if (!engine) {
      // If engine failed to load, return empty (Board handles fallback)
      resolve({ bestMove: '', eval: 0 });
      return;
    }

    let bestMove = '';
    
    // Listener for this specific request
    const listener = (event: MessageEvent) => {
      const line = event.data;
      if (line.startsWith('bestmove')) {
        bestMove = line.split(' ')[1];
        engine?.removeEventListener('message', listener);
        resolve({ bestMove, eval: 0 }); // Simplify eval for now as parsing info lines is complex
      }
    };

    engine.addEventListener('message', listener);
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage(`go depth ${depth}`);
  });
};

/**
 * Generates commentary based on move properties.
 */
const generateCommentary = (
  moveSan: string, 
  isStealth: boolean, 
  isCheck: boolean, 
  isCapture: boolean,
  isCastle: boolean,
  openingName?: string
): string => {
  const phrases = isStealth ? STEALTH_PHRASES : COACH_PHRASES;
  
  if (openingName) {
     return `${isStealth ? 'pattern match' : 'Opening'}: ${openingName}`;
  }
  
  if (isCheck) return phrases.check[Math.floor(Math.random() * phrases.check.length)];
  if (isCapture) return phrases.capture[Math.floor(Math.random() * phrases.capture.length)];
  if (isCastle) return phrases.castle[Math.floor(Math.random() * phrases.castle.length)];
  
  // Use moveSan to make the commentary slightly more dynamic and avoid unused var error
  const basePhrase = phrases.good[Math.floor(Math.random() * phrases.good.length)];
  return isStealth ? `${basePhrase} [op:${moveSan}]` : `${basePhrase}`;
};


export const getAiMoveAndCommentary = async (
  fen: string,
  _history: string[], // Unused
  isStealth: boolean,
  _playerRating: number // Unused
): Promise<{ move: string; commentary: string; opening?: string } | null> => {
  
  // 1. Check for Opening
  // We use a simplified check by looking up the FEN minus move counters
  const fenParts = fen.split(' ');
  const positionFen = fenParts.slice(0, 4).join(' '); // pieces + turn + castles + enpassant
  let openingName = undefined;
  
  // Simple check for opening in our mini-book (this is very basic, real books use trie structures)
  for (const [key, name] of Object.entries(OPENINGS)) {
     if (fen.includes(key) || key.includes(positionFen)) {
        openingName = name;
        break;
     }
  }

  // 2. Get Best Move from Engine
  const { bestMove } = await getBestMoveFromStockfish(fen, 5); // Depth 5 is fast and beats 650 ELO easily
  
  if (!bestMove) return null;

  // 3. Generate Commentary
  const commentary = isStealth 
    ? `executing_thread: ${bestMove}` 
    : `I recommend ${bestMove}.`;

  return {
    move: bestMove, // Stockfish returns "e2e4" (LAN), chess.js .move() accepts this
    commentary: commentary,
    opening: openingName
  };
};

export const analyzeUserMove = async (
  _fenBefore: string, // Unused
  moveSan: string, // e.g., "Nf3"
  isStealth: boolean
): Promise<string> => {
  // Simple heuristic: If it's a check or capture, acknowledge it.
  const isCheck = moveSan.includes('+') || moveSan.includes('#');
  const isCapture = moveSan.includes('x');
  const isCastle = moveSan.includes('O-O');

  return generateCommentary(moveSan, isStealth, isCheck, isCapture, isCastle);
};