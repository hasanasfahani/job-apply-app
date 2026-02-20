import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const { cvText, jobTitle, jobDescription, company } = await request.json();

  const optimizedCvResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert CV writer. Optimize the CV below for this specific job. 
Keep all facts true — only reorder, rephrase, and emphasize relevant experience.
Return ONLY the optimized CV text, nothing else.

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION: ${jobDescription}

ORIGINAL CV:
${cvText}`,
    }],
  });

  const coverLetterResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `Write a compelling, personalized cover letter for this job application.
Sound human, enthusiastic and specific. Keep it to 3 paragraphs.
Return ONLY the cover letter text, nothing else.

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION: ${jobDescription}

CANDIDATE CV:
${cvText}`,
    }],
  });

  const optimizedCv = (optimizedCvResponse.content[0] as { text: string }).text;
  const coverLetter = (coverLetterResponse.content[0] as { text: string }).text;

  return Response.json({ optimizedCv, coverLetter });
}