import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendJobNotificationEmail } from '@/lib/emailService';
import { generateCVPdf, generateCoverLetterPdf } from '@/lib/generatePDF';

const CRON_SECRET = process.env.CRON_SECRET;

const MOCK_JOB = {
  job_title: 'Senior Product Manager',
  employer_name: 'Acme Corp (TEST)',
  job_city: 'Dubai',
  job_country: 'UAE',
  job_is_remote: false,
  job_apply_link: 'https://example.com/jobs/123',
  job_publisher: 'LinkedIn',
  job_min_salary: 25000,
  job_max_salary: 35000,
  job_salary_currency: 'AED',
  job_description: `We are looking for a Senior Product Manager to lead our product team.
Requirements:
- 5+ years of product management experience
- Strong analytical and data-driven mindset
- Experience with agile methodologies
- Excellent stakeholder management skills
- Track record of launching successful products`,
};

const MOCK_FIT_SCORE = 8;
const MOCK_FIT_NOTE = 'Strong product leadership experience aligns well with the role requirements.';

const MOCK_REQUIREMENTS = [
  { requirement: '5+ years PM experience', match: 'Candidate has 7 years leading product teams' },
  { requirement: 'Agile methodologies', match: 'Extensive scrum and kanban experience demonstrated' },
  { requirement: 'Stakeholder management', match: 'Led cross-functional teams across 3 regions' },
];

const MOCK_OPTIMIZED_CV = `PROFESSIONAL SUMMARY
Results-driven Senior Product Manager with 7+ years of experience delivering impactful digital products. Proven track record of launching products that increased revenue by 40% and improved user retention by 25%. Expert in agile methodologies, data-driven decision making, and cross-functional team leadership.

AREA OF EXPERTISE
• Product Strategy & Roadmap Planning
• Agile / Scrum Methodologies
• Stakeholder Management
• Data Analytics & KPI Definition
• User Research & UX Collaboration
• Go-to-Market Execution

CAREER EXPERIENCE
Senior Product Manager — Acme Corp | 2021 – Present
• Led end-to-end product development for flagship mobile app with 500K+ users
• Increased user retention by 25% through data-driven feature prioritisation
• Managed a cross-functional team of 12 across engineering, design and marketing
• Delivered 3 major product launches on time and 10% under budget

Product Manager — Beta Solutions | 2018 – 2021
• Owned the product roadmap for a B2B SaaS platform generating $5M ARR
• Reduced customer churn by 18% by implementing a new onboarding flow
• Collaborated with C-suite stakeholders to align product vision with business goals

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2018

LANGUAGES
English — Fluent
Arabic — Native`;

const MOCK_COVER_LETTER = `I am excited to apply for the Senior Product Manager role at Acme Corp (TEST). With over 7 years of experience driving product strategy and execution across high-growth environments, I am confident in my ability to make an immediate and lasting impact on your team.

Throughout my career, I have a proven track record of delivering measurable results: increasing user retention by 25%, reducing churn by 18%, and consistently launching products on time and under budget. I have led cross-functional teams of up to 12 people and managed roadmaps for products serving 500,000+ users, always anchoring decisions in data and user research.

I would welcome the opportunity to discuss how my background aligns with Acme Corp's product vision. I am available at your earliest convenience and look forward to connecting.`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'No userId provided' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Generate real PDFs using the mock content
  let cvPdfBuffer: Buffer | null = null;
  let coverLetterPdfBuffer: Buffer | null = null;
  try {
    [cvPdfBuffer, coverLetterPdfBuffer] = await Promise.all([
      generateCVPdf(MOCK_OPTIMIZED_CV, profile.full_name, profile.email, profile.phone || '', MOCK_JOB.job_title),
      generateCoverLetterPdf(MOCK_COVER_LETTER, profile.full_name, profile.email, profile.phone || '', MOCK_JOB.employer_name, MOCK_JOB.job_title, `${MOCK_JOB.job_city} ${MOCK_JOB.job_country}`),
    ]);
  } catch (e) {
    console.error('PDF generation error:', e);
  }

  // Send real email
  await sendJobNotificationEmail({
    toEmail: profile.email,
    jobTitle: MOCK_JOB.job_title,
    company: MOCK_JOB.employer_name,
    location: `${MOCK_JOB.job_city} ${MOCK_JOB.job_country}`,
    salary: `${MOCK_JOB.job_min_salary} - ${MOCK_JOB.job_max_salary} ${MOCK_JOB.job_salary_currency}`,
    platform: MOCK_JOB.job_publisher,
    workType: MOCK_JOB.job_is_remote ? 'Remote' : 'On-site',
    fitScore: MOCK_FIT_SCORE,
    fitNote: MOCK_FIT_NOTE,
    jobUrl: MOCK_JOB.job_apply_link,
    requirements: MOCK_REQUIREMENTS,
    candidateName: profile.full_name || 'there',
    cvPdfBuffer,
    coverLetterPdfBuffer,
  });

  return NextResponse.json({ success: true, sentTo: profile.email });
}
