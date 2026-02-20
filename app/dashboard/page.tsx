'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/'; return; }
      setUser(session.user);

      const { data: prefsData } = await supabase
  .from('job_preferences')
  .select('*')
  .eq('user_id', session.user.id)
  .order('created_at', { ascending: false })
  .limit(1);
const prefs = prefsData?.[0] || null;
      setPreferences(prefs);

      const { data: existingJobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (existingJobs) setJobs(existingJobs);

      setLoading(false);
    };
    getData();
  }, []);

  const handleFindJobs = async () => {
    if (!preferences) {
      alert('Please set your job preferences first!');
      window.location.href = '/onboarding';
      return;
    }
    setSearching(true);
    setMessage('Searching for jobs across LinkedIn, Indeed and Glassdoor...');

    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        jobTitles: preferences.job_titles,
        cities: preferences.cities,
        workType: preferences.work_type,
      }),
    });

    const data = await response.json();
    setSearching(false);

    if (data.error) {
      setMessage('Error: ' + data.error);
    } else {
      setJobs(prev => [...data.jobs, ...prev]);
      setMessage(`Found ${data.total} new jobs!`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p>Loading...</p>
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif' }}>

      {/* Nav */}
      <nav style={{ backgroundColor: 'white', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>🤖 JobApply AI</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>{user?.email}</span>
          <button onClick={() => window.location.href = '/onboarding'} style={{ backgroundColor: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
            Edit Profile
          </button>
          <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
            Log Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Job Dashboard</h2>
            <p style={{ color: '#666', margin: 0 }}>
              {preferences
                ? `Searching for: ${preferences.job_titles?.join(', ')}`
                : 'Set your preferences to start finding jobs'}
            </p>
          </div>
          <button
            onClick={handleFindJobs}
            disabled={searching}
            style={{ backgroundColor: '#4F46E5', color: 'white', padding: '12px 24px', fontSize: '15px', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: searching ? 0.7 : 1 }}
          >
            {searching ? 'Searching...' : '🔍 Find Jobs'}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Jobs Found', value: jobs.length, icon: '🔍' },
            { label: 'Applications Sent', value: jobs.filter(j => j.status === 'applied').length, icon: '📨' },
            { label: 'Pending Review', value: jobs.filter(j => j.status === 'found').length, icon: '⏳' },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Message */}
        {message && (
          <div style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', padding: '16px', borderRadius: '8px', marginBottom: '24px', color: '#4F46E5', fontWeight: '600' }}>
            {message}
          </div>
        )}

        {/* Jobs List */}
        {jobs.length > 0 && (
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Jobs Found ({jobs.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {jobs.map(job => (
                <div key={job.id} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{job.title}</h4>
                      <span style={{ backgroundColor: job.work_type === 'Remote' ? '#DCFCE7' : '#FEF9C3', color: job.work_type === 'Remote' ? '#16A34A' : '#A16207', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                        {job.work_type}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 4px 0', color: '#444', fontSize: '14px' }}>{job.company}</p>
                    <p style={{ margin: '0 0 8px 0', color: '#888', fontSize: '13px' }}>{job.location} • {job.platform}</p>
                    {job.salary_range && (
                      <p style={{ margin: '0', color: '#4F46E5', fontSize: '13px', fontWeight: '600' }}>{job.salary_range}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <a href={job.url} target="_blank" rel="noopener noreferrer"
                      style={{ backgroundColor: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', textDecoration: 'none', color: '#333' }}>
                      View Job
                    </a>
                    <button
                        onClick={() => window.location.href = `/apply?jobId=${job.id}`}
                        style={{ backgroundColor: '#4F46E5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        Apply with AI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && !searching && (
          <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: 'white', borderRadius: '12px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>No jobs yet</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>Click "Find Jobs" to search across LinkedIn, Indeed and Glassdoor</p>
          </div>
        )}

      </div>
    </main>
  );
}