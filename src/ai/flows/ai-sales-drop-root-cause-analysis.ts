'use server';
/**
 * @fileOverview An AI agent that analyzes Amazon ASIN sales drops and identifies probable operational root causes.
 *
 * - aiSalesDropRootCauseAnalysis - A function that handles the AI-powered root cause analysis for sales drops.
 * - AiSalesDropRootCauseAnalysisInput - The input type for the aiSalesDropRootCauseAnalysis function.
 * - AiSalesDropRootCauseAnalysisOutput - The return type for the aiSalesDropRootCauseAnalysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiSalesDropRootCauseAnalysisInputSchema = z.object({
  asin: z.string().describe('The Amazon Standard Identification Number (ASIN) for which the sales drop occurred.'),
  salesDropDetails: z
    .string()
    .describe('A detailed description of the observed sales drop, including magnitude, duration, and specific dates or periods affected.'),
  historicalPerformance: z
    .string()
    .describe(
      'A summary of the ASIN\'s historical performance, including sales rank, pricing history, and sales velocity before and during the drop. Provide this as a structured text.'
    ),
  marketContext: z
    .string()
    .optional()
    .describe(
      'Optional: General market trends, competitive changes, or any external factors that might influence the ASIN\'s performance. Provide this as a structured text.'
    ),
});
export type AiSalesDropRootCauseAnalysisInput = z.infer<typeof AiSalesDropRootCauseAnalysisInputSchema>;

const AiSalesDropRootCauseAnalysisOutputSchema = z.object({
  rootCauseSummary: z
    .string()
    .describe('A concise summary of the most probable operational reasons for the sales drop, based on the provided data.'),
  suggestedActions: z
    .array(z.string())
    .optional()
    .describe('An optional list of actionable steps the seller can take to address the identified root causes.'),
});
export type AiSalesDropRootCauseAnalysisOutput = z.infer<typeof AiSalesDropRootCauseAnalysisOutputSchema>;

export async function aiSalesDropRootCauseAnalysis(input: AiSalesDropRootCauseAnalysisInput):
  Promise<AiSalesDropRootCauseAnalysisOutput> {
  return aiSalesDropRootCauseAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'salesDropRootCauseAnalysisPrompt',
  input: { schema: AiSalesDropRootCauseAnalysisInputSchema },
  output: { schema: AiSalesDropRootCauseAnalysisOutputSchema },
  prompt: `You are an expert Amazon e-commerce analyst specializing in identifying the operational root causes of sales drops for specific ASINs.

Your task is to analyze the provided information about an ASIN's sales drop and determine the most probable operational reasons behind it. Focus on actionable insights that an Amazon seller can use to address the issue. Consider factors such as pricing changes, inventory levels, advertising performance, listing quality, competitor actions, and overall market dynamics.

Input Data:
ASIN: {{{asin}}}
Sales Drop Details: {{{salesDropDetails}}}
Historical Performance: {{{historicalPerformance}}}

{{#if marketContext}}
Market Context: {{{marketContext}}}
{{/if}}

Based on the above data, provide:
1. A concise summary of the most probable operational reasons for the sales drop.
2. Optionally, a list of suggested actions the seller can take.

Your response MUST be a JSON object conforming to the output schema.`, 
});

const aiSalesDropRootCauseAnalysisFlow = ai.defineFlow(
  {
    name: 'aiSalesDropRootCauseAnalysisFlow',
    inputSchema: AiSalesDropRootCauseAnalysisInputSchema,
    outputSchema: AiSalesDropRootCauseAnalysisOutputSchema,
  },
  async (input) => {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const { output } = await prompt(input);
        if (!output) {
          throw new Error('AI did not return an output for root cause analysis.');
        }
        return output;
      } catch (error: any) {
        attempts++;
        const isUnavailable = error.message?.includes('503') || error.message?.includes('UNAVAILABLE');
        
        if (attempts >= maxAttempts || !isUnavailable) {
          throw error;
        }
        
        // Wait 2 seconds before retrying to allow service to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    throw new Error('AI analysis failed after multiple attempts due to high demand.');
  }
);
