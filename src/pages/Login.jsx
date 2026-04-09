import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Home } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin;
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/spreadsheets',
      'openid'
    ].join(' ');
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: scopes,
      prompt: localStorage.getItem('google_access_token') ? 'select_account' : 'consent',
    });
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Cuenta creada. Ya podés entrar.');
        setIsRegister(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('Email o contraseña incorrectos.');
      } else {
        window.location.href = '/';
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: '#FAFAF9' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#1C1917', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Home size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1C1917', margin: '0 0 4px' }}>App Hogar</h1>
          <p style={{ color: '#78716C', fontSize: '14px', margin: 0 }}>
            {isRegister ? 'Creá tu cuenta' : 'Bienvenido de vuelta'}
          </p>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E7E5E4', padding: '24px', marginBottom: '16px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E7E5E4', marginBottom: '12px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E7E5E4', marginBottom: '12px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
          />

          {error && <p style={{ color: '#EF4444', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}
          {message && <p style={{ color: '#22C55E', fontSize: '13px', marginBottom: '8px' }}>{message}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            style={{ width: '100%', padding: '11px', borderRadius: '12px', backgroundColor: loading || !email || !password ? '#A8A29E' : '#1C1917', color: 'white', border: 'none', fontSize: '14px', fontWeight: '500', cursor: loading || !email || !password ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Cargando...' : isRegister ? 'Crear cuenta' : 'Entrar'}
          </button>
        </div>

        <button
          onClick={handleGoogleLogin}
          style={{ width: '100%', padding: '11px', borderRadius: '12px', backgroundColor: 'white', border: '1px solid #E7E5E4', fontSize: '14px', cursor: 'pointer', color: '#44403C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          Continuar con Google
        </button>

        <p style={{ textAlign: 'center', fontSize: '14px', color: '#78716C' }}>
          {isRegister ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); setMessage(''); }}
            style={{ color: '#1C1917', fontWeight: '500', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
          >
            {isRegister ? 'Iniciá sesión' : 'Registrate'}
          </button>
        </p>
      </div>
    </div>
  );
}