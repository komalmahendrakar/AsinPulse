
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit initialization using server-side environment variables for security.
 * googleAI() automatically reads GOOGLE_GENAI_API_KEY from process.env.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    })
  ],
  model: 'googleai/gemini-2.5-flash',
});
