// REPLACED GEMINI WITH STOCKFISH.JS (Open Source Engine)
// No API Key required. Runs locally in the browser.

const STOCKFISH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js';

let engine: Worker | null = null;
let isEngineReady = false;

// --- OPENING BOOK (Mini) ---
const OPENINGS: Record<string, string> = {
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq': 'King\'s Pawn',
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPPP1PPP/RNBQKBNR b KQkq': 'Queen\'s Pawn',
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq': 'English',
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq': 'Réti',
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'Open Game',
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'Sicilian',
  'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'French',
  'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'Caro-Kann',
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq': 'Closed Game',
  'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'Scandinavian',
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
          isEngineReady = true;
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
      // Return empty if not ready yet
      resolve({ bestMove: '', eval: 0 });
      return;
    }

    let bestMove = '';
    
    const listener = (event: MessageEvent) => {
      const line = event.data;
      if (line.startsWith('bestmove')) {
        bestMove = line.split(' ')[1];
        engine?.removeEventListener('message', listener);
        resolve({ bestMove, eval: 0 });
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
const generateStealthCommentary = (
  moveSan: string, 
  isCheck: boolean, 
  isCapture: boolean, 
  isCastle: boolean,
  openingName?: string
): string => {
  
  if (openingName) {
     return `config_loaded: ${openingName.toLowerCase().replace(/ /g, '_')}_protocol`;
  }
  
  if (isCheck) return `WARN: interrupt_request_received [${moveSan}]`;
  if (isCapture) return `garbage_collection: resource_freed [${moveSan}]`;
  if (isCastle) return `security_update: firewall_enabled [${moveSan}]`;
  
  return `process_executed: ${moveSan} (latency: 12ms)`;
};


export const getAiMoveAndCommentary = async (
  fen: string,
  _history: string[], 
  _isStealth: boolean, // Kept to satisfy interface, prefixed to ignore
  elo: number 
): Promise<{ move: string; commentary: string; opening?: string } | null> => {
  
  const fenParts = fen.split(' ');
  const positionFen = fenParts.slice(0, 4).join(' ');
  let openingName = undefined;
  
  for (const [key, name] of Object.entries(OPENINGS)) {
     if (fen.includes(key) || key.includes(positionFen)) {
        openingName = name;
        break;
     }
  }

  // Adjust depth based on "ELO" request
  const depth = elo < 1000 ? 5 : 12;

  const { bestMove } = await getBestMoveFromStockfish(fen, depth);
  
  if (!bestMove) return null;

  const commentary = `daemon: executing_task ${bestMove}`;

  return {
    move: bestMove,
    commentary: commentary,
    opening: openingName
  };
};

export const analyzeUserMove = async (
  _fenBefore: string,
  moveSan: string,
  isStealth: boolean
): Promise<string> => {
  const isCheck = moveSan.includes('+') || moveSan.includes('#');
  const isCapture = moveSan.includes('x');
  const isCastle = moveSan.includes('O-O');

  // We use the isStealth flag to perhaps change the tone slightly, 
  // but for this app, we always want the "Terminal" feel.
  // We use the variable here to silence the linter.
  const prefix = isStealth ? 'sys' : 'log';

  return `${prefix}: ${generateStealthCommentary(moveSan, isCheck, isCapture, isCastle)}`;
};

export const getHint = async (fen: string): Promise<{ from: string, to: string, log: string } | null> => {
  if (!isEngineReady) return null;
  
  const { bestMove } = await getBestMoveFromStockfish(fen, 10);
  
  if (!bestMove) return null;
  
  const from = bestMove.substring(0, 2);
  const to = bestMove.substring(2, 4);
  
  return {
    from,
    to,
    log: `optimization_suggested: move thread ${from} to address ${to}`
  };
};
