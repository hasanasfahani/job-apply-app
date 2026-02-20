import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const { userId, jobTitles, cities, workType } = await request.json();

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
        console.log('RapidAPI response for:', query, '| Jobs found:', data.data?.length || 0);

        if (data.data && data.data.length > 0) {
          for (const job of data.data.slice(0, 5)) {
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
            });
          }
        }
      } catch (err) {
        console.error('Error fetching jobs for:', query, err);
      }
    }
  }

  if (allJobs.length === 0) {
    return Response.json({ error: 'No jobs found or API request failed. Check your RapidAPI key.' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert(allJobs)
    .select();

  if (error) {
    console.error('Supabase error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ jobs: data, total: data.length });
}