'use server';

/**
 * @fileOverview Generates a unique user avatar using AI based on the user's name.
 *
 * - generateUserAvatar - A function that generates a user avatar.
 * - GenerateUserAvatarInput - The input type for the generateUserAvatar function.
 * - GenerateUserAvatarOutput - The return type for the generateUserAvatar function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateUserAvatarInputSchema = z.object({
  userName: z.string().describe('The name of the user.'),
});
export type GenerateUserAvatarInput = z.infer<typeof GenerateUserAvatarInputSchema>;

const GenerateUserAvatarOutputSchema = z.object({
  avatarDataUri: z
    .string()
    .describe(
      'A data URI containing the generated avatar image, must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Documentation requirement.
    ),
});
export type GenerateUserAvatarOutput = z.infer<typeof GenerateUserAvatarOutputSchema>;

export async function generateUserAvatar(input: GenerateUserAvatarInput): Promise<GenerateUserAvatarOutput> {
  return generateUserAvatarFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateUserAvatarPrompt',
  input: {schema: GenerateUserAvatarInputSchema},
  output: {schema: GenerateUserAvatarOutputSchema},
  prompt: `Generate a unique avatar image for a user named {{userName}}. The avatar should be a professional-looking profile picture suitable for a web application.  The image must be returned as a data URI.

Include a solid background of saturated blue (#4285F4).`,
});

const generateUserAvatarFlow = ai.defineFlow(
  {
    name: 'generateUserAvatarFlow',
    inputSchema: GenerateUserAvatarInputSchema,
    outputSchema: GenerateUserAvatarOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt.prompt(input),
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('No avatar was generated.');
    }

    return {avatarDataUri: media.url};
  }
);
