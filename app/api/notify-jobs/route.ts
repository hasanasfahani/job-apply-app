import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { sendJobNotificationEmail } from '@/lib/emailService';
import { generateCVPdf, generateCoverLetterPdf } from '@/lib/generatePDF';

export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const anthropic = new Anthropic();

async function calculateFitScore(cvText: string, jobTitle: string, jobDescription: string, company: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are a recruitment expert. Return a JSON object with exactly two fields:
- "score": a number from 1 to 10
- "note": a single sentence (max 20 words) explaining the fit
Return ONLY valid JSON. Example: {"score": 8, "note": "Strong backend experience matches Node.js and AWS skills."}
JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION: ${jobDescription?.slice(0, 800)}
CANDIDATE CV: ${cvText?.slice(0, 1000)}`,
    }],
  });
  const text = (response.content[0] as { text: string }).text;
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return { score: parsed.score, note: parsed.note };
}

async function extractJobRequirements(cvText: string, jobTitle: string, jobDescription: string, company: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Return a JSON object with one field:
- "requirements": array of 3 objects, each with "requirement" (max 8 words) and "match" (max 15 words)
Return ONLY valid JSON.
JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION: ${jobDescription?.slice(0, 800)}
CANDIDATE CV: ${cvText?.slice(0, 1000)}`,
    }],
  });
  const text = (response.content[0] as { text: string }).text;
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return parsed.requirements;
}

async function generateOptimizedCV(cvText: string, jobTitle: string, jobDescription: string, company: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are an expert ATS CV writer. Rewrite this CV to maximize ATS pass rate for this specific job.
STRICT RULES:
- Maximum 2 pages worth of content (max 600 words)
- Use ONLY these section headers: PROFESSIONAL SUMMARY, AREA OF EXPERTISE, CAREER EXPERIENCE, EDUCATION, TRAINING & CERTIFICATIONS, LANGUAGES
- Mirror exact keywords from the job description naturally
- Use bullet points starting with • for experience items
- Quantify achievements with numbers wherever possible
- Keep all facts true — only reorder, rephrase, emphasize
- Do NOT include the person's name or contact info
- Return ONLY the CV content starting from PROFESSIONAL SUMMARY
JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION: ${jobDescription?.slice(0, 1000)}
ORIGINAL CV: ${cvText?.slice(0, 1500)}`,
    }],
  });
  return (response.content[0] as { text: string }).text;
}

async function generateCoverLetter(cvText: string, jobTitle: string, jobDescription: string, company: string): Promise<string> {
  const response = await anthropic.messages.create({
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
JOB DESCRIPTION: ${jobDescription?.slice(0, 1000)}
CANDIDATE CV: ${cvText?.slice(0, 1500)}`,
    }],
  });
  return (response.content[0] as { text: string }).text;
}

export async function POST(request: Request) {
  const body = await request.json();
  const secret = body.secret || new URL(request.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = body.userId;
  if (!userId) return NextResponse.json({ error: 'No userId provided' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!profile?.cv_text) return NextResponse.json({ skipped: 'No CV' });

  const { data: prefs } = await supabase.from('job_preferences').select('*').eq('user_id', userId).single();
  if (!prefs?.job_titles?.length || !prefs?.cities?.length) return NextResponse.json({ skipped: 'No preferences' });

  const title = prefs.job_titles[0];
  const city = prefs.cities[0];
  const query = `${title} in ${city}`;
  const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&page=1`;

  let totalEmailsSent = 0;

  try {
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
      },
    });
    const data = await response.json();

    // Only process jobs posted in the last 7 days, or with no date (include them)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentJobs = (data.data || []).filter((job: any) => {
      if (!job.job_posted_at_datetime_utc) return true;
      return new Date(job.job_posted_at_datetime_utc) >= sevenDaysAgo;
    }).slice(0, 3);

    for (const job of recentJobs) {
      const externalJobId = job.job_id;

      const { data: alreadySent } = await supabase
        .from('email_notifications')
        .select('id')
        .eq('user_id', profile.id)
        .eq('job_id', externalJobId)
        .single();

      if (alreadySent) continue;

      // Calculate fit score
      let fitScore = null;
      let fitNote = null;
      try {
        const fit = await calculateFitScore(profile.cv_text, job.job_title, job.job_description, job.employer_name);
        fitScore = fit.score;
        fitNote = fit.note;
      } catch (e) {
        console.error('Fit score error:', e);
      }

      // Always record to avoid reprocessing
      await supabase.from('email_notifications').insert({
        user_id: profile.id,
        job_id: externalJobId,
        fit_score: fitScore,
      });

      if (!fitScore || fitScore < 7) continue;

      // Extract requirements
      let requirements = [];
      try {
        requirements = await extractJobRequirements(profile.cv_text, job.job_title, job.job_description, job.employer_name);
      } catch (e) {
        console.error('Requirements error:', e);
      }

      // Generate optimized CV and cover letter
      let optimizedCv = '';
      let coverLetter = '';
      try {
        [optimizedCv, coverLetter] = await Promise.all([
          generateOptimizedCV(profile.cv_text, job.job_title, job.job_description, job.employer_name),
          generateCoverLetter(profile.cv_text, job.job_title, job.job_description, job.employer_name),
        ]);
      } catch (e) {
        console.error('Document generation error:', e);
      }

      // Generate PDFs
      let cvPdfBuffer: Buffer | null = null;
      let coverLetterPdfBuffer: Buffer | null = null;
      try {
        [cvPdfBuffer, coverLetterPdfBuffer] = await Promise.all([
          generateCVPdf(optimizedCv, profile.full_name, profile.email, profile.phone || '', job.job_title),
          generateCoverLetterPdf(coverLetter, profile.full_name, profile.email, profile.phone || '', job.employer_name, job.job_title, `${job.job_city || ''} ${job.job_country || ''}`.trim()),
        ]);
      } catch (e) {
        console.error('PDF generation error:', e);
      }

      // Save job to database
      await supabase.from('jobs').upsert({
        user_id: profile.id,
        external_job_id: externalJobId,
        title: job.job_title,
        company: job.employer_name,
        location: `${job.job_city || ''} ${job.job_country || ''}`.trim(),
        work_type: job.job_is_remote ? 'Remote' : 'On-site',
        description: job.job_description?.slice(0, 2000),
        url: job.job_apply_link,
        platform: job.job_publisher,
        salary_range: job.job_min_salary ? `${job.job_min_salary} - ${job.job_max_salary} ${job.job_salary_currency}` : null,
        date_posted: job.job_posted_at_datetime_utc,
        easy_apply: job.job_apply_is_direct,
        status: 'found',
        fit_score: fitScore,
        fit_note: fitNote,
      }, { onConflict: 'user_id,external_job_id' });

      // Send email with PDF attachments
      await sendJobNotificationEmail({
        toEmail: profile.email,
        jobTitle: job.job_title,
        company: job.employer_name,
        location: `${job.job_city || ''} ${job.job_country || ''}`.trim(),
        salary: job.job_min_salary ? `${job.job_min_salary} - ${job.job_max_salary} ${job.job_salary_currency}` : 'Not specified',
        platform: job.job_publisher,
        workType: job.job_is_remote ? 'Remote' : 'On-site',
        fitScore,
        fitNote: fitNote || '',
        jobUrl: job.job_apply_link,
        requirements,
        candidateName: profile.full_name || 'there',
        cvPdfBuffer,
        coverLetterPdfBuffer,
      });

      totalEmailsSent++;
    }
  } catch (err) {
    console.error('Error fetching jobs:', err);
  }

  return NextResponse.json({ success: true, emailsSent: totalEmailsSent });
}
