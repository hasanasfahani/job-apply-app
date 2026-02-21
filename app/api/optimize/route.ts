import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const { cvText, jobTitle, jobDescription, company, fullName, email, phone, linkedinUrl } = await request.json();

  const optimizedCvResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert ATS CV writer. Rewrite this CV to maximize ATS pass rate for this specific job. 

STRICT RULES:
- Maximum 2 pages worth of content (max 600 words)
- Use ONLY these section headers exactly: PROFESSIONAL SUMMARY, AREA OF EXPERTISE, CAREER EXPERIENCE, EDUCATION, TRAINING & CERTIFICATIONS, LANGUAGES
- Mirror exact keywords from the job description naturally
- Use bullet points starting with • for experience items
- Quantify achievements with numbers wherever possible
- Keep all facts true — only reorder, rephrase, emphasize
- Do NOT include the person's name or contact info — those will be added separately
- Return ONLY the CV content starting from PROFESSIONAL SUMMARY

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION: ${jobDescription}

ORIGINAL CV:
${cvText}`,
    }],
  });

  const coverLetterResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Write a professional ATS-optimized cover letter for this job.

STRICT RULES:
- Exactly 3 paragraphs
- Naturally include keywords from the job description
- Paragraph 1: Opening — mention exact job title and company, why excited
- Paragraph 2: Top 2-3 specific achievements from CV that match job requirements with numbers
- Paragraph 3: Brief closing with call to action
- Do NOT include date, address headers or sign-off — just the 3 paragraphs
- Sound human and confident, not robotic
- Max 250 words total
- Return ONLY the 3 paragraphs

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