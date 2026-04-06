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