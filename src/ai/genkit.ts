import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit initialization using server-side environment variables for security.
 * googleAI() is configured to use GOOGLE_API_KEY from process.env as requested.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    })
  ],
  model: 'googleai/gemini-2.5-flash',
});