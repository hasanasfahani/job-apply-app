import { NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

const CRON_SECRET = process.env.CRON_SECRET;
const client = new Client({ token: process.env.QSTASH_TOKEN! });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all user IDs and queue a separate job for each one
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profiles } = await supabase.from('profiles').select('id');

  for (const profile of profiles || []) {
    await client.publishJSON({
      url: `https://job-apply-app.vercel.app/api/notify-jobs`,
      body: { userId: profile.id, secret: CRON_SECRET },
      retries: 2,
    });
  }

  return NextResponse.json({ success: true, queued: profiles?.length || 0 });
}
