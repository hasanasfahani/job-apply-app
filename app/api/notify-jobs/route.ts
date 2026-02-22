import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { sendJobNotificationEmail } from '@/lib/emailService';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: profiles } = await supabase.from('profiles').select('*');
    let totalEmailsSent = 0;

    for (const profile of profiles || []) {
      if (!profile.cv_text) continue;

      const { data: prefs } = await supabase
        .from('job_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (!prefs?.job_titles?.length || !prefs?.cities?.length) continue;

      // Only 1 title and 1 city per run to avoid timeout
      const title = prefs.job_titles[0];
      const city = prefs.cities[0];
      const query = `${title} in ${city}`;
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&page=1`;

      try {
        const response = await fetch(url, {
          headers: {
            'x-rapidapi-host': 'jsearch.p.rapidapi.com',
            'x-rapidapi-key': process.env.RAPIDAPI_KEY!,
          },
        });
        const data = await response.json();
        const jobs = (data.data || []).slice(0, 3); // Max 3 jobs per run

        for (const job of jobs) {
          const externalJobId = job.job_id;

          const { data: alreadySent } = await supabase
            .from('email_notifications')
            .select('id')
            .eq('user_id', profile.id)
            .eq('job_id', externalJobId)
            .single();

          if (alreadySent) continue;

          // Score the job
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

          // Save job
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

          // Send email
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
          });

          totalEmailsSent++;
        }
      } catch (err) {
        console.error('Error fetching jobs:', err);
      }
    }

    return NextResponse.json({ success: true, emailsSent: totalEmailsSent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
