import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendJobNotificationEmail({
  toEmail,
  jobTitle,
  company,
  location,
  fitScore,
  fitNotes,
  jobUrl,
  cvPdfBuffer,
  coverLetterPdfBuffer,
}: {
  toEmail: string;
  jobTitle: string;
  company: string;
  location: string;
  fitScore: number;
  fitNotes: string;
  jobUrl: string;
  cvPdfBuffer: Buffer;
  coverLetterPdfBuffer: Buffer;
}) {
  const { data, error } = await resend.emails.send({
    from: 'JobApply AI <notifications@yourdomain.com>',
    to: toEmail,
    subject: `🎯 New Job Match: ${jobTitle} at ${company} — ${fitScore}% Fit`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">New Job Match Found!</h2>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 8px;">${jobTitle}</h3>
          <p style="margin: 4px 0; color: #6B7280;">${company} · ${location}</p>
          <div style="margin-top: 12px;">
            <span style="background: #4F46E5; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
              ${fitScore}% Match
            </span>
          </div>
        </div>

        <div style="margin: 20px 0;">
          <h4>Why You're a Good Fit:</h4>
          <p style="color: #374151;">${fitNotes}</p>
        </div>

        <a href="${jobUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          View Job Posting →
        </a>

        <p style="margin-top: 24px; color: #9CA3AF; font-size: 12px;">
          Your optimized CV and cover letter are attached. Good luck! 🚀
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `CV_${company}_${jobTitle}.pdf`.replace(/\s+/g, '_'),
        content: cvPdfBuffer,
      },
      {
        filename: `CoverLetter_${company}_${jobTitle}.pdf`.replace(/\s+/g, '_'),
        content: coverLetterPdfBuffer,
      },
    ],
  });

  if (error) throw new Error(`Email failed: ${error.message}`);
  return data;
}