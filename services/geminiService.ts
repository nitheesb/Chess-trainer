import { GoogleGenAI, Type } from "@google/genai";

// Initialize securely - assumes process.env.API_KEY is available and valid per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_ID = 'gemini-3-flash-preview';

/**
 * Generates a response from the "Senior Consultant" (AI Tutor).
 * It adapts the persona based on stealth mode.
 */
export const getAiMoveAndCommentary = async (
  fen: string,
  history: string[],
  isStealth: boolean,
  playerRating: number
): Promise<{ move: string; commentary: string } | null> => {
  const persona = isStealth
    ? "You are a Linux Kernel Log. Output concise system messages. Refer to pieces as processes, threads, sockets, etc. Lowercase only. No punctuation if possible. Be cryptic but logical."
    : "You are a Grandmaster Chess Coach. Be encouraging but strict. Focus on fundamentals for a 650 ELO player.";

  const prompt = `
    ${persona}
    
    Current Game State (FEN): ${fen}
    Move History: ${history.join(', ')}
    Opponent Rating: ${playerRating} (Approx 650-800)
    
    Your goal:
    1. Analyze the position.
    2. Determine the best move for the side to play next.
    3. Explain the move briefly (max 1 sentence).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bestMove: {
              type: Type.STRING,
              description: "Standard Algebraic Notation (e.g., Nf3, O-O)",
            },
            explanation: {
              type: Type.STRING,
              description: "Brief explanation of the move.",
            },
          },
          propertyOrdering: ["bestMove", "explanation"],
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const data = JSON.parse(text);
    return {
      move: data.bestMove,
      commentary: data.explanation
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { move: '', commentary: "err: connection timeout." };
  }
};

/**
 * Asks Gemini to explain the user's last move (Validation/Tutoring).
 */
export const analyzeUserMove = async (
  fenBefore: string,
  moveSan: string,
  isStealth: boolean
): Promise<string> => {
  const persona = isStealth
    ? "System Audit Log. Validate the efficiency of the last operation. Use terms like 'optimization', 'memory leak', 'latency'. Short lowercase output."
    : "Chess coach. Simple terms.";

  const prompt = `
    ${persona}
    The player just played: ${moveSan}
    Position was: ${fenBefore}
    
    Was this a good move (Good, Inaccuracy, Blunder)? Why? Keep it short.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
    });
    return response.text || "processing...";
  } catch (e) {
    return "err: analysis failed.";
  }
};