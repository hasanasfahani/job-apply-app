import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendJobNotificationEmail } from '@/lib/email';

// This secret prevents random people from triggering your notifications
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Security check
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side
  );

  try {
    // 1. Get all users with their preferences
    const { data: profiles } = await supabase
      .from('profiles') // adjust to your actual table name
      .select('*');

    for (const profile of profiles || []) {
      // 2. Get recent jobs that match this user (your existing logic)
      const { data: newJobs } = await supabase
        .from('jobs') // adjust to your actual table name
        .select('*')
        .eq('user_id', profile.user_id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // last 24 hours
        .gte('fit_score', profile.min_fit_score || 70); // only good matches

      for (const job of newJobs || []) {
        // 3. Check if we already notified about this job
        const { data: alreadySent } = await supabase
          .from('email_notifications')
          .select('id')
          .eq('user_id', profile.user_id)
          .eq('job_id', job.id)
          .single();

        if (alreadySent) continue; // skip, already emailed

        // 4. Get the generated CV and cover letter PDFs
        // (These should already exist from your CV generation step)
        const { data: cvFile } = await supabase.storage
          .from('documents')
          .download(`${profile.user_id}/${job.id}/cv.pdf`);

        const { data: clFile } = await supabase.storage
          .from('documents')
          .download(`${profile.user_id}/${job.id}/cover_letter.pdf`);

        if (!cvFile || !clFile) continue; // skip if PDFs not generated yet

        const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
        const clBuffer = Buffer.from(await clFile.arrayBuffer());

        // 5. Send the email
        await sendJobNotificationEmail({
          toEmail: profile.email,
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          fitScore: job.fit_score,
          fitNotes: job.fit_notes,
          jobUrl: job.url,
          cvPdfBuffer: cvBuffer,
          coverLetterPdfBuffer: clBuffer,
        });

        // 6. Record that we sent this notification
        await supabase.from('email_notifications').insert({
          user_id: profile.user_id,
          job_id: job.id,
          fit_score: job.fit_score,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}