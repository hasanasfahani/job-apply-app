'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const JOB_TITLE_SUGGESTIONS = [
  'Software Engineer', 'Senior Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Mobile Developer', 'DevOps Engineer', 'Data Engineer',
  'Data Scientist', 'Machine Learning Engineer', 'AI Engineer', 'Cloud Architect',
  'Product Manager', 'Senior Product Manager', 'Product Owner', 'Project Manager',
  'Program Manager', 'Scrum Master', 'Business Analyst', 'Systems Analyst',
  'UX Designer', 'UI Designer', 'UX/UI Designer', 'Graphic Designer', 'Creative Director',
  'Marketing Manager', 'Digital Marketing Manager', 'SEO Specialist', 'Content Manager',
  'Social Media Manager', 'Brand Manager', 'Growth Hacker', 'Performance Marketing Manager',
  'Sales Manager', 'Account Executive', 'Business Development Manager', 'Sales Director',
  'Financial Analyst', 'Finance Manager', 'CFO', 'Accountant', 'Investment Analyst',
  'Risk Manager', 'Compliance Officer', 'Audit Manager',
  'HR Manager', 'Talent Acquisition Specialist', 'Recruiter', 'HR Business Partner',
  'Operations Manager', 'Supply Chain Manager', 'Logistics Manager',
  'Customer Success Manager', 'Customer Support Manager',
  'Consultant', 'Management Consultant', 'Strategy Consultant',
  'Civil Engineer', 'Mechanical Engineer', 'Electrical Engineer', 'Structural Engineer',
  'Doctor', 'Nurse', 'Healthcare Manager', 'Pharmacist',
  'Teacher', 'Professor', 'Training Manager', 'E-Learning Specialist',
  'Hotel Manager', 'F&B Manager', 'Restaurant Manager', 'Event Manager',
];

const CITIES = [
  'Dubai', 'Abu Dhabi', 'Sharjah', 'Riyadh', 'Jeddah',
  'Dammam', 'Doha', 'Kuwait City', 'Muscat', 'Manama',
  'Cairo', 'Beirut', 'London', 'Manchester', 'New York',
  'San Francisco', 'Los Angeles', 'Chicago', 'Toronto',
  'Vancouver', 'Sydney', 'Melbourne', 'Singapore',
  'Hong Kong', 'Mumbai', 'Bangalore',
  'Remote - Worldwide', 'Remote - MENA', 'Remote - Europe', 'Remote - US',
];

const INDUSTRIES = [
  'Technology', 'Engineering', 'Marketing & Sales',
  'Finance & Banking', 'Healthcare', 'Education',
  'Hospitality', 'Consulting',
];

export default function Onboarding() {
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [cvText, setCvText] = useState('');
  const [jobTitles, setJobTitles] = useState<string[]>([]);
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [workType, setWorkType] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) window.location.href = '/';
      else setUser(session.user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredSuggestions = JOB_TITLE_SUGGESTIONS.filter(title =>
    title.toLowerCase().includes(jobTitleInput.toLowerCase()) &&
    !jobTitles.includes(title) &&
    jobTitleInput.length > 0
  ).slice(0, 6);

  const addJobTitle = (title: string) => {
    if (!jobTitles.includes(title)) setJobTitles(prev => [...prev, title]);
    setJobTitleInput('');
    setShowSuggestions(false);
  };

  const removeJobTitle = (title: string) => setJobTitles(prev => prev.filter(t => t !== title));
  const toggleCity = (city: string) => setCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  const toggleWorkType = (type: string) => setWorkType(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  const toggleIndustry = (industry: string) => setIndustries(prev => prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry]);

  const handleSaveProfile = async () => {
    setLoading(true);
    console.log('Saving profile for user:', user?.id);
    console.log('fullName:', fullName);
    console.log('cvText length:', cvText.length);
    const { data, error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      phone,
      linkedin_url: linkedinUrl,
      cv_text: cvText,
      email: user.email,
    }).select();
    setLoading(false);
    console.log('Result:', data, 'Error:', error);
    if (error) alert('Error: ' + error.message + ' | Code: ' + error.code);
    else setStep(2);
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    const { error } = await supabase.from('job_preferences').upsert({
      user_id: user.id,
      job_titles: jobTitles,
      cities,
      work_type: workType,
      experience_level: experienceLevel,
      min_salary: minSalary ? parseInt(minSalary) : null,
      industries,
    });
    setLoading(false);
    if (error) alert('Error saving preferences: ' + error.message);
    else window.location.href = '/dashboard';
  };

  const inputStyle = {
    width: '100%', padding: '12px', marginTop: '6px', marginBottom: '20px',
    borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px',
    boxSizing: 'border-box' as const,
  };
  const labelStyle = { fontSize: '14px', fontWeight: '600' as const, color: '#333' };
  const tagStyle = {
    display: 'inline-flex' as const, alignItems: 'center', gap: '6px',
    backgroundColor: '#EEF2FF', color: '#4F46E5', padding: '6px 12px',
    borderRadius: '20px', fontSize: '13px', fontWeight: '600' as const,
  };
  const chipStyle = (selected: boolean) => ({
    padding: '8px 16px', borderRadius: '20px', border: '2px solid',
    borderColor: selected ? '#4F46E5' : '#ddd',
    backgroundColor: selected ? '#EEF2FF' : 'white',
    color: selected ? '#4F46E5' : '#666',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600' as const,
    margin: '4px',
  });

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>🤖 JobApply AI</h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>Let's set up your profile in 2 quick steps.</p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ flex: 1, height: '6px', borderRadius: '4px', backgroundColor: s <= step ? '#4F46E5' : '#ddd' }} />
          ))}
        </div>

        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

          {step === 1 && (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Step 1: Your Profile and CV</h2>

              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                style={inputStyle}
              />

              <label style={labelStyle}>Phone Number</label>
              <input
                type="text"
                placeholder="+971 50 123 4567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={inputStyle}
              />

              <label style={labelStyle}>LinkedIn Profile URL</label>
              <input
                type="text"
                placeholder="https://linkedin.com/in/yourname"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                style={inputStyle}
              />

              <label style={labelStyle}>Paste Your CV</label>
              <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', marginBottom: '8px' }}>
                Copy all text from your CV and paste it below.
              </p>
              <textarea
                rows={10}
                placeholder="Paste your full CV text here..."
                value={cvText}
                onChange={e => setCvText(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />

              <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
                Debug: fullName="{fullName}" | cvText length={cvText.length}
              </p>

              <button
                onClick={handleSaveProfile}
                disabled={loading}
                style={{
                  width: '100%', backgroundColor: '#4F46E5', color: 'white',
                  padding: '14px', fontSize: '16px', fontWeight: '600',
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Step 2: Job Preferences</h2>

              <label style={labelStyle}>Job Titles You are Looking For</label>
              <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', marginBottom: '8px' }}>Type to search and select multiple titles</p>
              <div style={{ position: 'relative' }} ref={suggestionsRef}>
                <input
                  type="text"
                  placeholder="e.g. Product Manager..."
                  value={jobTitleInput}
                  onChange={e => { setJobTitleInput(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  style={{ ...inputStyle, marginBottom: '8px' }}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '48px', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100 }}>
                    {filteredSuggestions.map(title => (
                      <div
                        key={title}
                        onClick={() => addJobTitle(title)}
                        style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f5f5f5' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
                      >
                        {title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {jobTitles.map(title => (
                  <span key={title} style={tagStyle}>
                    {title}
                    <span onClick={() => removeJobTitle(title)} style={{ cursor: 'pointer', fontSize: '16px', lineHeight: '1' }}>x</span>
                  </span>
                ))}
              </div>

              <label style={labelStyle}>Preferred Cities</label>
              <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', marginBottom: '8px' }}>Select all that apply</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px' }}>
                {CITIES.map(city => (
                  <button key={city} onClick={() => toggleCity(city)} style={chipStyle(cities.includes(city))}>{city}</button>
                ))}
              </div>

              <label style={labelStyle}>Work Type</label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px', marginBottom: '20px' }}>
                {['Remote', 'Hybrid', 'On-site'].map(type => (
                  <button key={type} onClick={() => toggleWorkType(type)} style={chipStyle(workType.includes(type))}>{type}</button>
                ))}
              </div>

              <label style={labelStyle}>Industries</label>
              <p style={{ fontSize: '13px', color: '#888', marginTop: '4px', marginBottom: '8px' }}>Select all that apply</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px' }}>
                {INDUSTRIES.map(industry => (
                  <button key={industry} onClick={() => toggleIndustry(industry)} style={chipStyle(industries.includes(industry))}>{industry}</button>
                ))}
              </div>

              <label style={labelStyle}>Experience Level</label>
              <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} style={inputStyle}>
                <option value="">Select level...</option>
                <option value="entry">Entry Level (0-2 years)</option>
                <option value="mid">Mid Level (2-5 years)</option>
                <option value="senior">Senior Level (5-10 years)</option>
                <option value="executive">Executive (10+ years)</option>
              </select>

              <label style={labelStyle}>Minimum Salary (USD/year)</label>
              <input
                type="number"
                placeholder="50000"
                value={minSalary}
                onChange={e => setMinSalary(e.target.value)}
                style={inputStyle}
              />

              <button
                onClick={handleSavePreferences}
                disabled={loading || jobTitles.length === 0 || cities.length === 0 || workType.length === 0}
                style={{
                  width: '100%', backgroundColor: '#4F46E5', color: 'white',
                  padding: '14px', fontSize: '16px', fontWeight: '600',
                  borderRadius: '8px', border: 'none', cursor: 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            </>
          )}

        </div>
      </div>
    </main>
  );
}