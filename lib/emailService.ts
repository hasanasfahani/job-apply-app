import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendJobNotificationEmail({
  toEmail, jobTitle, company, location, salary, platform, workType,
  fitScore, fitNote, jobUrl, requirements, candidateName,
  cvPdfBuffer, coverLetterPdfBuffer,
}: {
  toEmail: string;
  jobTitle: string;
  company: string;
  location: string;
  salary: string;
  platform: string;
  workType: string;
  fitScore: number;
  fitNote: string;
  jobUrl: string;
  requirements: { requirement: string; match: string }[];
  candidateName: string;
  cvPdfBuffer: Buffer | null;
  coverLetterPdfBuffer: Buffer | null;
}) {
  const scoreColor = fitScore >= 9 ? '#16a34a' : '#d97706';
  const scoreEmoji = fitScore >= 9 ? '🟢' : '🟡';

  const requirementsHTML = requirements.map((r) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">
        <div style="font-weight: 600; color: #111827; font-size: 14px;">✅ ${r.requirement}</div>
        <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">${r.match}</div>
      </td>
    </tr>
  `).join('');

  const attachments = [];
  if (cvPdfBuffer) {
    attachments.push({
      filename: `CV_${company}_${jobTitle}.pdf`.replace(/\s+/g, '_'),
      content: cvPdfBuffer,
    });
  }
  if (coverLetterPdfBuffer) {
    attachments.push({
      filename: `CoverLetter_${company}_${jobTitle}.pdf`.replace(/\s+/g, '_'),
      content: coverLetterPdfBuffer,
    });
  }

  const { data, error } = await resend.emails.send({
    from: 'JobApply AI <onboarding@resend.dev>',
    to: toEmail,
    subject: `${scoreEmoji} ${fitScore}/10 Match: ${jobTitle} at ${company}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 28px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🎯 New Job Match Found!</h1>
            <p style="color: #c7d2fe; margin: 8px 0 0;">Hi ${candidateName}, a great opportunity just appeared</p>
          </div>
          <div style="background: white; padding: 20px; border-left: 4px solid ${scoreColor}; border-right: 1px solid #e5e7eb;">
            <span style="font-size: 32px; font-weight: 800; color: ${scoreColor};">${fitScore}/10</span>
            <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">Fit Score</span>
            <p style="color: #374151; font-size: 14px; margin: 8px 0 0; font-style: italic;">"${fitNote}"</p>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="margin: 0 0 4px; color: #111827; font-size: 20px;">${jobTitle}</h2>
            <p style="margin: 0 0 16px; color: #4F46E5; font-size: 16px; font-weight: 600;">${company}</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 40%;">📍 Location</td><td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${location}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">💼 Work Type</td><td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${workType}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">💰 Salary</td><td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${salary}</td></tr>
              <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">🌐 Platform</td><td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${platform}</td></tr>
            </table>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
            <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px;">📋 Key Requirements & Your Match</h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
              ${requirementsHTML}
            </table>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Your optimized CV and cover letter are attached 📎</p>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">Apply now before others do!</p>
            <a href="${jobUrl}" style="background: #4F46E5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">Apply Now →</a>
            <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0;">You're receiving this because you set up job alerts on JobApply AI.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments,
  });

  if (error) throw new Error(`Email failed: ${error.message}`);
  return data;
}
