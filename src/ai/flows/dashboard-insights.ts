'use server';

/**
 * @fileOverview Generates personalized insights and summaries for the user dashboard.
 *
 * - generateDashboardInsights - A function that generates dashboard insights based on user profile data.
 * - DashboardInsightsInput - The input type for the generateDashboardInsights function.
 * - DashboardInsightsOutput - The return type for the generateDashboardInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DashboardInsightsInputSchema = z.object({
  firstName: z.string().describe('The first name of the user.'),
  lastName: z.string().describe('The last name of the user.'),
  email: z.string().email().describe('The email address of the user.'),
  phoneNumber: z.string().describe('The phone number of the user.'),
  dob: z.string().describe('The date of birth of the user (YYYY-MM-DD).'),
});
export type DashboardInsightsInput = z.infer<typeof DashboardInsightsInputSchema>;

const DashboardInsightsOutputSchema = z.object({
  summary: z.string().describe('A personalized summary of the user profile.'),
  keyInsights: z.array(z.string()).describe('Key insights derived from the user profile data.'),
});
export type DashboardInsightsOutput = z.infer<typeof DashboardInsightsOutputSchema>;

export async function generateDashboardInsights(input: DashboardInsightsInput): Promise<DashboardInsightsOutput> {
  return dashboardInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dashboardInsightsPrompt',
  input: {schema: DashboardInsightsInputSchema},
  output: {schema: DashboardInsightsOutputSchema},
  prompt: `You are an AI assistant that generates personalized insights and summaries for user dashboards.

  Based on the following user profile data, generate a concise summary and a list of key insights.

  First Name: {{{firstName}}}
  Last Name: {{{lastName}}}
  Email: {{{email}}}
  Phone Number: {{{phoneNumber}}}
  Date of Birth: {{{dob}}}

  Summary: A brief, engaging summary of the user, highlighting key aspects of their profile.
  Key Insights: A list of bullet-point insights derived from the user's profile data, focusing on potentially relevant information.
  `,
});

const dashboardInsightsFlow = ai.defineFlow(
  {
    name: 'dashboardInsightsFlow',
    inputSchema: DashboardInsightsInputSchema,
    outputSchema: DashboardInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
