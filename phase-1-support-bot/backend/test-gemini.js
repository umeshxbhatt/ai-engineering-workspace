import { GenerateContentResponse, GoogleGenAI } from '@google/genai';
import dotenv from "dotenv";

// load .env variables
dotenv.config();

// initialise genai client
const ai = new GoogleGenAI({});

// create async fun
async function runTest() {
  try {
    console.log('📡 Contacting Gemini API...');

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash-lite',
      contents: 'In 3 bullet points, explain why real-time streaming is critical for AI user experience.',
    })

    console.log('\n--- 🚀 STREAMING TOKENS IN REAL TIME ---');

    for await (const chunk of responseStream) {
      process.stdout.write(chunk.text);
    }

    console.log('\n--- ✅ DONE ---');
  } catch (error) {
    console.error('❌ Error during AI generation:', error);
  }
}

runTest();