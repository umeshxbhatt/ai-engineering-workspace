import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

// 1. Load environment variables from .env
dotenv.config();

// 2. Initialize Express application
const app = express();
// Default to port 5001 on macOS to avoid conflict with macOS ControlCenter/AirPlay Receiver on 5000
const PORT = process.env.PORT || 5001;

// 3. Middlewares
// Enable CORS so our frontend (e.g., http://localhost:5173) can communicate with this API
app.use(cors());

// Parse incoming JSON request bodies (equivalent to body-parser in older Express)
app.use(express.json());

// 4. Initialize Google Gen AI client
// The SDK automatically reads process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({});

// 5. System Prompt: Defining persona, behavior rules, and boundaries
// This conditions the LLM into a context-aware Customer Support Specialist
const SYSTEM_INSTRUCTION = `
You are Nova, an expert AI Customer Support Specialist for "CloudPeak Solutions" (a modern SaaS platform).
Your tone is professional, warm, concise, and solution-oriented.

Guidelines:
- Keep responses focused, concise, and structured (use bullet points when helpful).
- If a user asks about account billing, explain that CloudPeak offers Monthly and Annual plans with a 14-day money-back guarantee.
- Never invent internal company passwords, API credentials, or private user data.
- If an issue requires human assistance (like a database corruption or billing dispute over $100), politely inform them that you can escalate this to Tier-2 Engineering.
`;

/**
 * Formats and bounds the conversation history for Gemini.
 * Enforces a sliding window buffer to prevent token explosion.
 *
 * @param {Array<{role: string, text: string}>} history - Previous messages
 * @param {string} newMessage - The latest user message
 * @param {number} maxTurns - Maximum previous messages to retain (default: 6)
 * @returns {Array<{role: string, parts: Array<{text: string}>}>} Formatted contents for Gemini
 */
function formatConversationHistory(history = [], newMessage, maxTurns = 6) {
  // 1. Sliding Window: Take only the last 'maxTurns' messages
  const recentHistory = Array.isArray(history) ? history.slice(-maxTurns) : [];

  // 2. Map history to Gemini's schema: { role: 'user' | 'model', parts: [{ text }] }
  const formattedContents = recentHistory.map((item) => {
    // Sanitize role: Gemini strictly allows 'user' or 'model'
    const role = item.role === 'model' || item.role === 'assistant' ? 'model' : 'user';
    return {
      role,
      parts: [{ text: item.text || '' }],
    };
  });

  // 3. Append the brand new user message to the very end
  formattedContents.push({
    role: 'user',
    parts: [{ text: newMessage }],
  });

  return formattedContents;
}

/**
 * Health Check Endpoint
 * Standard production pattern: allows load balancers and container orchestrators (Kubernetes/Docker)
 * to verify that the server is alive and accepting traffic.
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'support-bot-backend',
    timestamp: new Date().toISOString()
  });
});

/**
 * Real-Time Streaming Chat Endpoint
 * Uses Server-Sent Events (SSE) over HTTP chunked transfer
 */
app.post('/api/chat/stream', async (req, res) => {
  const { message, history = [] } = req.body;

  // 1. Input Validation: Fail early before invoking external APIs
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'A valid non-empty "message" string is required in the request body.' });
  }

  // 2. Set Server-Sent Events (SSE) HTTP Headers
  // - text/event-stream: Tells the browser not to buffer as standard text/json, but stream event packets
  // - no-cache, no-transform: Prevents reverse proxies (Nginx/Cloudflare) from caching or compressing chunks
  // - keep-alive: Keeps the underlying TCP socket open for subsequent chunks
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  // Flush headers immediately if the environment/framework supports it
  if (res.flushHeaders) {
    res.flushHeaders();
  }

  // 3. Client Abort Tracking:
  // In Node.js HTTP, listen to `res.on('close')`. If the client closes the connection
  // before the response ends (res.writableEnded is false), the client has disconnected.
  let isClientConnected = true;
  res.on('close', () => {
    if (!res.writableEnded) {
      isClientConnected = false;
      console.log('⚠️ Client closed connection prematurely.');
    }
  });

  try {
    // 4. Format contents with sliding window history
    const contents = formatConversationHistory(history, message, 6);

    // 5. Request generation stream from Gemini API
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash-lite',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    // 5. Asynchronous Iterable Consumer:
    // Read tokens as they are emitted by Gemini and forward each chunk to the client via SSE
    for await (const chunk of responseStream) {
      // If client disconnected, break loop early to conserve server resources and avoid socket write errors
      if (!isClientConnected) {
        console.log('⚠️ Client aborted connection. Stopping stream loop.');
        break;
      }

      if (chunk.text) {
        // SSE standard format: "data: <payload>\n\n"
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    // 6. Signal Stream Termination:
    // When the model finishes generating all tokens, send the standard [DONE] sentinel
    if (isClientConnected) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('❌ Error in /api/chat/stream:', error);

    // If headers were not yet sent, respond with standard HTTP 500 JSON
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to process AI chat stream.' });
    }

    // If headers WERE already sent, we cannot call res.status(500).
    // Instead, stream an error packet within the SSE stream and close it cleanly.
    res.write(`data: ${JSON.stringify({ error: error.message || 'Stream generation failed' })}\n\n`);
    res.end();
  }
});

/**
 * Strict JSON Schema for Automated Support Ticket Extraction
 * Constrains Gemini's token generator to emit 100% deterministic JSON
 */
const TICKET_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      enum: ['BILLING', 'TECHNICAL', 'FEATURE_REQUEST', 'ACCOUNT', 'GENERAL'],
      description: 'The primary classification category of the customer issue',
    },
    urgency: {
      type: Type.STRING,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      description: 'Priority level for customer support triaging',
    },
    sentiment: {
      type: Type.NUMBER,
      description: 'Customer sentiment score between -1.0 (extremely angry/frustrated) and 1.0 (delighted)',
    },
    requiresEscalation: {
      type: Type.BOOLEAN,
      description: 'True if a human engineer, manager, or billing specialist must intervene',
    },
    summary: {
      type: Type.STRING,
      description: 'A crisp one-sentence summary of the core issue and resolution status',
    },
  },
  required: ['intent', 'urgency', 'sentiment', 'requiresEscalation', 'summary'],
};

/**
 * Structured Output Endpoint: Automated Ticket Extraction & Sentiment Triaging
 * Takes conversation history and returns guaranteed JSON conforming to TICKET_SCHEMA
 */
app.post('/api/chat/analyze-ticket', async (req, res) => {
  const { conversation } = req.body;

  if (!conversation) {
    return res.status(400).json({ error: 'A "conversation" string or message array is required in the request body.' });
  }

  // Format conversation input into readable transcript for the model
  let transcript = '';
  if (Array.isArray(conversation)) {
    transcript = conversation
      .map((item) => `${item.role === 'model' ? 'Nova (Support)' : 'Customer'}: ${item.text || ''}`)
      .join('\n');
  } else if (typeof conversation === 'string') {
    transcript = conversation;
  } else {
    return res.status(400).json({ error: 'Conversation must be a string or array of messages.' });
  }

  const prompt = `
Analyze the following customer support interaction and extract a structured support ticket.
Ensure the sentiment score, urgency, and escalation flags strictly reflect the customer's emotions and issue severity.

--- TRANSCRIPT ---
${transcript}
`;

  try {
    // Production reliability: Retry transient errors (like 503 high demand spikes) with exponential backoff
    let attempts = 0;
    const maxAttempts = 3;
    let response;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: TICKET_SCHEMA,
          },
        });
        break; // Success!
      } catch (err) {
        if (attempts >= maxAttempts) throw err;
        console.warn(`⚠️ Gemini API retry attempt ${attempts} due to: ${err.message}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }

    // Since Gemini strictly adhered to responseSchema, response.text is guaranteed valid JSON!
    const ticketData = JSON.parse(response.text);

    return res.json({
      success: true,
      ticket: ticketData,
    });
  } catch (error) {
    console.error('❌ Error analyzing support ticket:', error);
    return res.status(500).json({
      error: 'Failed to analyze conversation for structured ticket.',
      details: error.message,
    });
  }
});

// 6. Start Server
app.listen(PORT, () => {
  console.log(`🚀 AI Support Bot Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat Stream: POST http://localhost:${PORT}/api/chat/stream`);
  console.log(`🎫 Analyze Ticket: POST http://localhost:${PORT}/api/chat/analyze-ticket`);
});
