// REPLACED GEMINI WITH STOCKFISH.JS (Open Source Engine)
// No API Key required. Runs locally in the browser.

const STOCKFISH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js';

let engine: Worker | null = null;

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

// --- COMMENTARY LOGIC ---
// We want "Stealth" logs that actually teach chess concepts.
// Format: "system_msg: <concept>"

const CONCEPT_LOGS = {
  opening: [
    "init: control_center", 
    "init: develop_knights", 
    "init: develop_bishops", 
    "protocol: castle_early"
  ],
  capture: [
    "material_acquired", 
    "threat_eliminated", 
    "exchange_complete", 
    "unit_captured"
  ],
  check: [
    "alert: king_exposed", 
    "priority: defend_king", 
    "threat: immediate"
  ],
  castle: [
    "security_patch: king_safety", 
    "network: rooks_connected", 
    "defense_matrix: enabled"
  ],
  good: [
    "strategy: space_advantage", 
    "tactic: pin_created", 
    "tactic: fork_opportunity", 
    "position: improved",
    "structure: solid"
  ],
  blunder: [
    "error: material_hang", 
    "critical: defense_breach"
  ]
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
const generateCommentary = (
  moveSan: string, 
  isStealth: boolean, 
  isCheck: boolean, 
  isCapture: boolean, 
  isCastle: boolean,
  openingName?: string
): string => {
  
  if (openingName) {
     return `protocol_match: ${openingName.toLowerCase().replace(/ /g, '_')}`;
  }
  
  let basePhrase = "";
  if (isCheck) basePhrase = CONCEPT_LOGS.check[Math.floor(Math.random() * CONCEPT_LOGS.check.length)];
  else if (isCapture) basePhrase = CONCEPT_LOGS.capture[Math.floor(Math.random() * CONCEPT_LOGS.capture.length)];
  else if (isCastle) basePhrase = CONCEPT_LOGS.castle[Math.floor(Math.random() * CONCEPT_LOGS.castle.length)];
  else basePhrase = CONCEPT_LOGS.good[Math.floor(Math.random() * CONCEPT_LOGS.good.length)];
  
  // Combine concept with the move for clarity
  return `${basePhrase} [mv:${moveSan}]`;
};


export const getAiMoveAndCommentary = async (
  fen: string,
  _history: string[], 
  isStealth: boolean,
  _playerRating: number 
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

  // Lower depth for quicker, more human-like "650 elo" errors sometimes, 
  // but Stockfish at depth 1 is still strong. Depth 5 is fine.
  const { bestMove } = await getBestMoveFromStockfish(fen, 5);
  
  if (!bestMove) return null;

  // We don't have the SAN for the engine move yet (Board calculates it), 
  // so we return a placeholder in commentary or just the LAN.
  // The Board component will generate the final commentary with the correct SAN.
  const commentary = `calc_complete: ${bestMove}`;

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

  return generateCommentary(moveSan, isStealth, isCheck, isCapture, isCastle);
};