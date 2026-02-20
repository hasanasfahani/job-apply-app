'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ApplyPage() {
  const [user, setUser] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
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

      const { data: jobData } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setJob(jobData);
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>Loading...</p>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif' }}>

      <nav style={{ backgroundColor: 'white', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>🤖 JobApply AI</h1>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{ backgroundColor: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
        >
          Back to Dashboard
        </button>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{job?.title}</h2>
          <p style={{ margin: '0 0 4px 0', color: '#444' }}>{job?.company}</p>
          <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>{job?.location} • {job?.platform}</p>
        </div>

        {optimizing && (
          <div style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', padding: '24px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Claude is optimizing your application...</h3>
            <p style={{ color: '#666', margin: 0 }}>Tailoring your CV and writing a cover letter</p>
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
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Optimized CV</h3>
                <textarea
                  value={optimizedCv}
                  onChange={e => setOptimizedCv(e.target.value)}
                  rows={20}
                  style={{ width: '100%', border: '1px solid #eee', borderRadius: '8px', padding: '12px', fontSize: '13px', lineHeight: '1.6', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>Cover Letter</h3>
                <textarea
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  rows={20}
                  style={{ width: '100%', border: '1px solid #eee', borderRadius: '8px', padding: '12px', fontSize: '13px', lineHeight: '1.6', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>

            {!done && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
                  Review and edit above, then click Apply to save and open the job page.
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
