'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [scoreFilter, setScoreFilter] = useState<number>(0);
  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/'; return; }
      setUser(session.user);
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(profileData);
      const { data: prefsData } = await supabase.from('job_preferences').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1);
      setPreferences(prefsData?.[0] || null);
      const { data: existingJobs } = await supabase.from('jobs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (existingJobs) setJobs(existingJobs);
      setLoading(false);
    };
    getData();
  }, []);
  const handleFindJobs = async () => {
    if (!profile?.cv_text) { alert('Please complete your profile first!'); window.location.href = '/onboarding'; return; }
    if (!preferences) { alert('Please set your job preferences first!'); window.location.href = '/onboarding'; return; }
    setSearching(true);
    setMessage('Searching for jobs and calculating fit scores with Claude...');
    const response = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, jobTitles: preferences.job_titles, cities: preferences.cities, workType: preferences.work_type, cvText: profile.cv_text }) });
    const data = await response.json();
    setSearching(false);
    if (data.error) { setMessage('Error: ' + data.error); } else { setJobs(prev => [...data.jobs, ...prev]); setMessage('Found ' + data.total + ' new jobs with fit scores!'); }
  };
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };
  const getFitColor = (score: number) => { if (score >= 8) return { bg: '#DCFCE7', color: '#16A34A', border: '#16A34A' }; if (score >= 6) return { bg: '#FEF9C3', color: '#A16207', border: '#A16207' }; return { bg: '#FEE2E2', color: '#DC2626', border: '#DC2626' }; };
  const getStatusColor = (status: string) => { if (status === 'applied') return { bg: '#DCFCE7', color: '#16A34A' }; if (status === 'interview') return { bg: '#EEF2FF', color: '#4F46E5' }; if (status === 'rejected') return { bg: '#FEE2E2', color: '#DC2626' }; if (status === 'offer') return { bg: '#FEF9C3', color: '#A16207' }; return { bg: '#F3F4F6', color: '#6B7280' }; };
  const formatDate = (dateStr: string) => { if (!dateStr) return null; try { return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return null; } };
  const filteredJobs = jobs.filter(j => (j.fit_score || 0) >= scoreFilter);
  const hasProfile = profile?.full_name && profile?.cv_text;
  const hasPreferences = preferences !== null;
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}><p>Loading...</p></div>;
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif', color: '#111' }}>
      <nav style={{ backgroundColor: 'white', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#111' }}>🤖 JobApply AI</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>{user?.email}</span>
          <button onClick={() => window.location.href = '/onboarding'} style={{ backgroundColor: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#111' }}>Edit Profile</button>
          <button onClick={() => window.location.href = '/history'} style={{ backgroundColor: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#111' }}>Applications</button>
          <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#111' }}>Log Out</button>
        </div>
      </nav>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {(!hasProfile || !hasPreferences) && (
          <div style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', padding: '24px', borderRadius: '12px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#4F46E5' }}>Complete your setup to start finding jobs</h3>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>{hasProfile ? '✅' : '⭕'}</span><span style={{ fontSize: '14px', color: '#111' }}>Profile and CV</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>{hasPreferences ? '✅' : '⭕'}</span><span style={{ fontSize: '14px', color: '#111' }}>Job preferences</span></div>
            </div>
            <button onClick={() => window.location.href = '/onboarding'} style={{ marginTop: '16px', backgroundColor: '#4F46E5', color: 'white', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Complete Setup</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111' }}>{hasProfile ? 'Welcome, ' + profile.full_name + '! 👋' : 'Job Dashboard'}</h2>
            <p style={{ color: '#555', margin: 0 }}>{preferences ? 'Searching for: ' + preferences.job_titles?.join(', ') : 'Set your preferences to start'}</p>
          </div>
          <button onClick={handleFindJobs} disabled={searching} style={{ backgroundColor: '#4F46E5', color: 'white', padding: '12px 24px', fontSize: '15px', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: searching ? 0.7 : 1 }}>{searching ? '🔍 Searching...' : '🔍 Find Jobs'}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[{ label: 'Jobs Found', value: jobs.length, icon: '🔍' }, { label: 'Applied', value: jobs.filter(j => j.status === 'applied').length, icon: '📨' }, { label: 'Interviews', value: jobs.filter(j => j.status === 'interview').length, icon: '🎯' }, { label: 'Offers', value: jobs.filter(j => j.status === 'offer').length, icon: '🏆' }].map(stat => (
            <div key={stat.label} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px', color: '#111' }}>{stat.value}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>{stat.label}</div>
            </div>
          ))}
        </div>
        {message && <div style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', padding: '16px', borderRadius: '8px', marginBottom: '24px', color: '#4F46E5', fontWeight: '600' }}>{message}</div>}
        {jobs.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111' }}>Jobs ({filteredJobs.length} shown of {jobs.length})</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#555', fontWeight: '600' }}>Min Fit Score:</span>
                {[0, 5, 6, 7, 8, 9].map(score => (
                  <button key={score} onClick={() => setScoreFilter(score)} style={{ padding: '6px 14px', borderRadius: '20px', border: '2px solid', borderColor: scoreFilter === score ? '#4F46E5' : '#ddd', backgroundColor: scoreFilter === score ? '#EEF2FF' : 'white', color: scoreFilter === score ? '#4F46E5' : '#555', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    {score === 0 ? 'All' : score + '+'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredJobs.map(job => {
                const fitColors = getFitColor(job.fit_score || 0);
                const statusColors = getStatusColor(job.status);
                return (
                  <div key={job.id} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#111' }}>{job.title}</h4>
                          <span style={{ backgroundColor: job.work_type === 'Remote' ? '#DCFCE7' : '#FEF9C3', color: job.work_type === 'Remote' ? '#16A34A' : '#A16207', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>{job.work_type}</span>
                          <span style={{ backgroundColor: statusColors.bg, color: statusColors.color, padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' as const }}>{job.status}</span>
                        </div>
                        <p style={{ margin: '0 0 2px 0', color: '#333', fontSize: '14px', fontWeight: '600' }}>{job.company}</p>
                        <p style={{ margin: '0 0 6px 0', color: '#777', fontSize: '13px' }}>{job.location} • {job.platform}</p>
                        {job.salary_range && <p style={{ margin: '0 0 6px 0', color: '#4F46E5', fontSize: '13px', fontWeight: '600' }}>{job.salary_range}</p>}
                        {job.date_posted && <p style={{ margin: '0 0 10px 0', color: '#888', fontSize: '12px' }}>📅 Posted: {formatDate(job.date_posted)}</p>}
                        {job.fit_score ? (
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <span style={{ backgroundColor: fitColors.bg, color: fitColors.color, padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>🎯 Fit Score: {job.fit_score}/10</span>
                            </div>
                            {job.fit_note && (
                              <div style={{ backgroundColor: '#f9f9f9', borderLeft: '3px solid ' + fitColors.border, padding: '10px 14px', borderRadius: '6px', fontSize: '13px', color: '#444', lineHeight: '1.6' }}>
                                <span style={{ fontWeight: '700', color: fitColors.color, marginRight: '6px' }}>Why this fits you:</span>{job.fit_note}
                              </div>
                            )}
                          </div>
                        ) : <span style={{ fontSize: '12px', color: '#aaa', fontStyle: 'italic' }}>No fit score yet — click Find Jobs to recalculate</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '20px', minWidth: '140px' }}>
                        <a href={job.url} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', textDecoration: 'none', color: '#333', textAlign: 'center' as const, display: 'block' }}>View Job</a>
                        {job.status === 'found' && <button onClick={() => window.location.href = '/apply?jobId=' + job.id} style={{ backgroundColor: '#4F46E5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Apply with AI</button>}
                        <select value={job.status} onChange={async (e) => { const s = e.target.value; await supabase.from('jobs').update({ status: s }).eq('id', job.id); setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: s } : j)); }} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', cursor: 'pointer', color: '#111' }}>
                          <option value="found">Found</option>
                          <option value="applied">Applied</option>
                          <option value="interview">Interview</option>
                          <option value="rejected">Rejected</option>
                          <option value="offer">Offer</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {jobs.length === 0 && !searching && (
          <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: 'white', borderRadius: '12px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#111' }}>No jobs yet</h3>
            <p style={{ color: '#666' }}>Click Find Jobs to search across LinkedIn, Indeed and Glassdoor</p>
          </div>
        )}
      </div>
    </main>
  );
}
