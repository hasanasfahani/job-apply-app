import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const anthropic = new Anthropic();

async function calculateFitScore(cvText: string, jobTitle: string, jobDescription: string, company: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are a recruitment expert. Based on the candidate's CV and the job description, return a JSON object with exactly two fields:
- "score": a number from 1 to 10 indicating how well the candidate fits the job
- "note": a single sentence (max 20 words) explaining why they fit or don't fit

Return ONLY valid JSON, nothing else. Example: {"score": 8, "note": "Strong backend experience matches well with the required Node.js and AWS skills."}

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION: ${jobDescription?.slice(0, 1000)}

CANDIDATE CV:
${cvText?.slice(0, 1500)}`,
    }],
  });

  const text = (response.content[0] as { text: string }).text;
const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
const parsed = JSON.parse(cleaned);
return { score: parsed.score, note: parsed.note };
}

export async function POST(request: NextRequest) {
  const { userId, jobTitles, cities, workType, cvText } = await request.json();

  const allJobs: any[] = [];

  for (const title of jobTitles.slice(0, 2)) {
    for (const city of cities.slice(0, 2)) {
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

        if (data.data && data.data.length > 0) {
          for (const job of data.data.slice(0, 5)) {
            let fitScore = null;
            let fitNote = null;

            try {
              const fit = await calculateFitScore(
                cvText,
                job.job_title,
                job.job_description,
                job.employer_name
              );
              fitScore = fit.score;
              fitNote = fit.note;
            } catch (e: any) {
  console.error('Fit score error:', e?.message || e);
  fitScore = null;
  fitNote = 'Score unavailable';
}
            allJobs.push({
              user_id: userId,
              title: job.job_title,
              company: job.employer_name,
              location: `${job.job_city || ''} ${job.job_country || ''}`.trim(),
              work_type: job.job_is_remote ? 'Remote' : 'On-site',
              description: job.job_description?.slice(0, 2000),
              url: job.job_apply_link,
              platform: job.job_publisher,
              salary_range: job.job_min_salary
                ? `${job.job_min_salary} - ${job.job_max_salary} ${job.job_salary_currency}`
                : null,
              date_posted: job.job_posted_at_datetime_utc,
              easy_apply: job.job_apply_is_direct,
              status: 'found',
              fit_score: fitScore,
              fit_note: fitNote,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching jobs for:', query, err);
      }
    }
  }

  if (allJobs.length === 0) {
    return Response.json({ error: 'No jobs found or API request failed.' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert(allJobs)
    .select();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ jobs: data, total: data.length });
}