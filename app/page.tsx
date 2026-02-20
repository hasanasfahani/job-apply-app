'use client';

import { useState } from 'react';
import { supabase } from './lib/supabase';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else window.location.href = '/dashboard';
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage('Check your email for a confirmation link!');
    }

    setLoading(false);
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '48px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px' }}>
        
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>🤖 JobApply AI</h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
          {isLogin ? 'Welcome back! Log in to your account.' : 'Create an account to get started.'}
        </p>

        <label style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>Email</label>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '12px', marginTop: '6px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
        />

        <label style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '12px', marginTop: '6px', marginBottom: '24px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
        />

        {message && (
          <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#0369a1' }}>
            {message}
          </div>
        )}

        <button
          onClick={handleAuth}
          disabled={loading || !email || !password}
          style={{ width: '100%', backgroundColor: '#4F46E5', color: 'white', padding: '14px', fontSize: '16px', fontWeight: '600', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#666' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span
            onClick={() => setIsLogin(!isLogin)}
            style={{ color: '#4F46E5', cursor: 'pointer', fontWeight: '600' }}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </span>
        </p>

      </div>
    </main>
  );
}
