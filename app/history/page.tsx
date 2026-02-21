'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function HistoryPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/'; return; }

      const { data } = await supabase
        .from('applications')
        .select('*, jobs(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data) setApplications(data);
      setLoading(false);
    };
    getData();
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'applied') return { bg: '#DCFCE7', color: '#16A34A' };
    if (status === 'interview') return { bg: '#EEF2FF', color: '#4F46E5' };
    if (status === 'rejected') return { bg: '#FEE2E2', color: '#DC2626' };
    if (status === 'offer') return { bg: '#FEF9C3', color: '#A16207' };
    return { bg: '#F3F4F6', color: '#6B7280' };
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

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Application History</h2>
        <p style={{ color: '#666', marginBottom: '32px' }}>All jobs you have applied to with the CV and cover letter used.</p>

        {applications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: 'white', borderRadius: '12px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>No applications yet</h3>
            <p style={{ color: '#666' }}>Go to the dashboard and click Apply with AI on any job!</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '24px' }}>

          {/* Applications List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {applications.map(app => {
              const statusColors = getStatusColor(app.status);
              return (
                <div
                  key={app.id}
                  onClick={() => setSelected(app)}
                  style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', cursor: 'pointer', border: selected?.id === app.id ? '2px solid #4F46E5' : '2px solid transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{app.jobs?.title}</h4>
                      <p style={{ margin: '0 0 4px 0', color: '#444', fontSize: '14px' }}>{app.jobs?.company}</p>
                      <p style={{ margin: '0', color: '#888', fontSize: '13px' }}>{app.jobs?.location} • {app.jobs?.platform}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <span style={{ backgroundColor: statusColors.bg, color: statusColors.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                        {app.status}
                      </span>
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div style={{ marginTop: '12px' }}>
                    <select
                      value={app.status}
                      onClick={e => e.stopPropagation()}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        await supabase.from('applications').update({ status: newStatus }).eq('id', app.id);
                        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
                      }}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', cursor: 'pointer' }}
                    >
                      <option value="applied">Applied</option>
                      <option value="interview">Interview</option>
                      <option value="rejected">Rejected</option>
                      <option value="offer">Offer</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Application Detail */}
          {selected && (
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'sticky', top: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Application Details</h3>
                <button onClick={() => setSelected(null)} style={{ backgroundColor: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>×</button>
              </div>

              <h4 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px' }}>{selected.jobs?.title}</h4>
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>{selected.jobs?.company} • {selected.jobs?.location}</p>

              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#4F46E5' }}>Optimized CV</h5>
                <div style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
                  {selected.optimized_cv}
                </div>
              </div>

              <div>
                <h5 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#4F46E5' }}>Cover Letter</h5>
                <div style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
                  {selected.cover_letter}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}