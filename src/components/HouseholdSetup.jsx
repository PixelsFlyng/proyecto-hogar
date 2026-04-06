import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Home, Plus, LogIn } from 'lucide-react';

export default function HouseholdSetup({ onComplete }) {
  const [mode, setMode] = useState(null); // 'create' o 'join'
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const newCode = generateCode();

    const { data: household, error: hErr } = await supabase
      .from('households')
      .insert({ code: newCode, created_by: user.id })
      .select().single();

    if (hErr) { setError('Error al crear el hogar.'); setLoading(false); return; }

    const { error: mErr } = await supabase
      .from('household_members')
      .insert({ household_id: household.id, user_id: user.id });

    if (mErr) { setError('Error al unirse al hogar.'); setLoading(false); return; }

    setLoading(false);
    onComplete();
  };

  const handleJoin = async () => {
    setLoading(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();

    const { data: household, error: hErr } = await supabase
      .from('households')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (hErr || !household) { setError('Código incorrecto.'); setLoading(false); return; }

    const { error: mErr } = await supabase
      .from('household_members')
      .insert({ household_id: household.id, user_id: user.id });

    if (mErr) { setError('Error al unirse al hogar.'); setLoading(false); return; }

    setLoading(false);
    onComplete();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: '#FAFAF9' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#1C1917', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Home size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1C1917', margin: '0 0 4px' }}>Configurar hogar</h1>
          <p style={{ color: '#78716C', fontSize: '14px', margin: 0 }}>Creá un hogar o unite a uno existente</p>
        </div>

        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setMode('create')}
              style={{ padding: '16px', borderRadius: '16px', border: '1px solid #E7E5E4', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <div style={{ width: '40px', height: '40px', backgroundColor: '#F5F5F4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} color="#1C1917" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontWeight: '500', color: '#1C1917' }}>Crear hogar</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#78716C' }}>Soy el primero en registrarme</p>
              </div>
            </button>

            <button
              onClick={() => setMode('join')}
              style={{ padding: '16px', borderRadius: '16px', border: '1px solid #E7E5E4', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <div style={{ width: '40px', height: '40px', backgroundColor: '#F5F5F4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogIn size={20} color="#1C1917" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontWeight: '500', color: '#1C1917' }}>Unirme a un hogar</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#78716C' }}>Tengo un código de invitación</p>
              </div>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E7E5E4', padding: '24px' }}>
            <p style={{ color: '#44403C', fontSize: '14px', marginTop: 0 }}>
              Se va a crear un hogar y vas a recibir un código para compartir con tu pareja.
            </p>
            {error && <p style={{ color: '#EF4444', fontSize: '13px' }}>{error}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleCreate}
                disabled={loading}
                style={{ padding: '11px', borderRadius: '12px', backgroundColor: loading ? '#A8A29E' : '#1C1917', color: 'white', border: 'none', fontSize: '14px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Creando...' : 'Crear hogar'}
              </button>
              <button onClick={() => setMode(null)} style={{ padding: '11px', borderRadius: '12px', backgroundColor: 'transparent', border: '1px solid #E7E5E4', fontSize: '14px', cursor: 'pointer', color: '#78716C' }}>
                Volver
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E7E5E4', padding: '24px' }}>
            <p style={{ color: '#44403C', fontSize: '14px', marginTop: 0 }}>Ingresá el código que te compartió tu pareja</p>
            <input
              type="text"
              placeholder="Ej: ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E7E5E4', marginBottom: '12px', fontSize: '16px', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }}
            />
            {error && <p style={{ color: '#EF4444', fontSize: '13px' }}>{error}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleJoin}
                disabled={loading || code.length < 6}
                style={{ padding: '11px', borderRadius: '12px', backgroundColor: loading || code.length < 6 ? '#A8A29E' : '#1C1917', color: 'white', border: 'none', fontSize: '14px', fontWeight: '500', cursor: loading || code.length < 6 ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Uniéndome...' : 'Unirme'}
              </button>
              <button onClick={() => setMode(null)} style={{ padding: '11px', borderRadius: '12px', backgroundColor: 'transparent', border: '1px solid #E7E5E4', fontSize: '14px', cursor: 'pointer', color: '#78716C' }}>
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}