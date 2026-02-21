'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ApplyPage() {
  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [optimizedCv, setOptimizedCv] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/'; return; }
      setUser(session.user);

      const jobId = new URLSearchParams(window.location.search).get('jobId');
      if (!jobId) { window.location.href = '/dashboard'; return; }

      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', jobId).single();
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

      setJob(jobData);
      setProfile(profileData);
      setLoading(false);

      if (jobData && profileData) {
        setOptimizing(true);
        const response = await fetch('/api/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvText: profileData.cv_text,
            jobTitle: jobData.title,
            jobDescription: jobData.description,
            company: jobData.company,
            fullName: profileData.full_name,
            email: profileData.email,
            phone: profileData.phone,
            linkedinUrl: profileData.linkedin_url,
          }),
        });
        const data = await response.json();
        setOptimizedCv(data.optimizedCv);
        setCoverLetter(data.coverLetter);
        setOptimizing(false);
      }
    };
    init();
  }, []);

  const handleApply = async () => {
    setApplying(true);
    await supabase.from('applications').insert({
      user_id: user.id,
      job_id: job.id,
      optimized_cv: optimizedCv,
      cover_letter: coverLetter,
      status: 'applied',
      applied_at: new Date().toISOString(),
    });
    await supabase.from('jobs').update({ status: 'applied' }).eq('id', job.id);
    setApplying(false);
    setDone(true);
    window.open(job.url, '_blank');
  };

const downloadCVPDF = async () => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;

  const checkPage = (neededSpace: number) => {
    if (y + neededSpace > 275) { doc.addPage(); y = 20; }
  };

  // Clean markdown and dividers from text
  const cleanText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^•\s*--+\s*$/gm, '')
      .replace(/^--+\s*$/gm, '')
      .trim();
  };

  // Header background
  doc.setFillColor(30, 90, 168);
  doc.rect(0, 0, pageW, 38, 'F');

  // Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(profile?.full_name || '', margin, 16);

  // Job title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(job?.title || '', margin, 25);

  // Contact info on right
  doc.setFontSize(9);
  const contactX = pageW - margin;
  doc.text(profile?.email || '', contactX, 10, { align: 'right' });
  doc.text(profile?.phone || '', contactX, 16, { align: 'right' });
  doc.text('LinkedIn', contactX, 22, { align: 'right' });
  doc.text('Dubai, UAE', contactX, 28, { align: 'right' });

  y = 48;

  const sectionHeaders = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'AREA OF EXPERTISE', 'EXPERTISE',
    'CAREER EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE',
    'EDUCATION', 'SKILLS', 'CERTIFICATIONS', 'TRAINING & CERTIFICATIONS',
    'LANGUAGES', 'VOLUNTEERING', 'REFERENCES',
  ];

  // Clean the full CV text first
  const cleanedCv = cleanText(optimizedCv);
  const lines = cleanedCv.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { y += 2; continue; }

    const isHeader = sectionHeaders.some(h => line.toUpperCase() === h || line.toUpperCase().startsWith(h));
    const isBullet = line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.startsWith('●');

    // Detect job title lines: contain " — " or " | " or " at "
    const isJobTitle = !isHeader && !isBullet &&
      (line.includes(' — ') || line.includes(' | ') || line.includes(' at ')) &&
      line.length < 100;

    if (isHeader) {
      checkPage(14);
      y += 5;
      doc.setTextColor(30, 90, 168);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(line, margin, y);
      y += 2;
      doc.setDrawColor(30, 90, 168);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
      doc.setTextColor(0, 0, 0);

    } else if (isJobTitle) {
      checkPage(8);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      const wrapped = doc.splitTextToSize(line, contentW);
      wrapped.forEach((wl: string) => {
        checkPage(6);
        doc.text(wl, margin, y);
        y += 5.5;
      });
      doc.setTextColor(0, 0, 0);

    } else if (isBullet) {
      checkPage(6);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const bulletText = line.replace(/^[•\-*●]\s*/, '').trim();
      if (!bulletText) continue;
      const wrapped = doc.splitTextToSize(bulletText, contentW - 6);
      wrapped.forEach((wl: string, idx: number) => {
        checkPage(5);
        if (idx === 0) doc.text('•', margin, y);
        doc.text(wl, margin + 5, y);
        y += 5;
      });

    } else {
      checkPage(6);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const wrapped = doc.splitTextToSize(line, contentW);
      wrapped.forEach((wl: string) => {
        checkPage(5);
        doc.text(wl, margin, y);
        y += 5;
      });
      doc.setTextColor(0, 0, 0);
    }
  }

  doc.save(`CV-${profile?.full_name}-${job?.company}.pdf`);
};


  const downloadCoverLetterPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 0;

    // Header
    doc.setFillColor(30, 90, 168);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.full_name || '', margin, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${profile?.email || ''} | ${profile?.phone || ''}`, margin, 21);

    y = 38;

    // Date
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), margin, y);
    y += 10;

    // Company
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(job?.company || '', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(job?.location || '', margin, y);
    y += 12;

    // Subject line
    doc.setTextColor(30, 90, 168);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Re: Application for ${job?.title}`, margin, y);
    y += 10;

    // Body
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const paragraphs = coverLetter.split('\n\n');
    paragraphs.forEach(para => {
      if (!para.trim()) return;
      const wrapped = doc.splitTextToSize(para.trim(), contentW);
      wrapped.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      });
      y += 4;
    });

    // Signature
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Sincerely,', margin, y); y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.full_name || '', margin, y);

    doc.save(`CoverLetter-${profile?.full_name}-${job?.company}.pdf`);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>Loading...</p>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <nav style={{ backgroundColor: 'white', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>🤖 JobApply AI</h1>
        <button onClick={() => window.location.href = '/dashboard'} style={{ backgroundColor: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
          Back to Dashboard
        </button>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{job?.title}</h2>
          <p style={{ margin: '0 0 4px 0', color: '#444' }}>{job?.company}</p>
          <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>{job?.location} • {job?.platform}</p>
        </div>

        {optimizing && (
          <div style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', padding: '32px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Claude is optimizing your application...</h3>
            <p style={{ color: '#666', margin: '0 0 8px 0' }}>Tailoring your CV for ATS and writing a professional cover letter</p>
            <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>This takes about 20-30 seconds</p>
          </div>
        )}

        {!optimizing && optimizedCv && (
          <>
            {done && (
              <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', padding: '16px', borderRadius: '8px', marginBottom: '24px', color: '#16A34A', fontWeight: '600', textAlign: 'center' }}>
                Application saved! The job page has opened in a new tab.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Optimized CV</h3>
                    <p style={{ fontSize: '12px', color: '#16A34A', margin: 0, fontWeight: '600' }}>ATS-optimized • Max 2 pages</p>
                  </div>
                  <button
                    onClick={downloadCVPDF}
                    style={{ backgroundColor: '#4F46E5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    Download PDF
                  </button>
                </div>
                <textarea
                  value={optimizedCv}
                  onChange={e => setOptimizedCv(e.target.value)}
                  rows={22}
                  style={{ width: '100%', border: '1px solid #eee', borderRadius: '8px', padding: '12px', fontSize: '13px', lineHeight: '1.6', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Cover Letter</h3>
                    <p style={{ fontSize: '12px', color: '#16A34A', margin: 0, fontWeight: '600' }}>ATS-optimized • Professional format</p>
                  </div>
                  <button
                    onClick={downloadCoverLetterPDF}
                    style={{ backgroundColor: '#4F46E5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    Download PDF
                  </button>
                </div>
                <textarea
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  rows={22}
                  style={{ width: '100%', border: '1px solid #eee', borderRadius: '8px', padding: '12px', fontSize: '13px', lineHeight: '1.6', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>

            {!done && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
                  Review and edit above, download your PDFs, then click Apply to save and open the job page.
                </p>
                <button
                  onClick={handleApply}
                  disabled={applying}
                  style={{ backgroundColor: '#4F46E5', color: 'white', padding: '14px 40px', fontSize: '16px', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: applying ? 0.7 : 1 }}
                >
                  {applying ? 'Saving...' : 'Apply Now'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}