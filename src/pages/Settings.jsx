import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Palette, Users, Link2, Calendar, FileSpreadsheet, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

const THEMES = [
  { value: 'light', label: 'Claro', bg: '#F5F5F4', primary: '#292524', accent: '#FFFFFF' },
  { value: 'dark', label: 'Oscuro', bg: '#1C1917', primary: '#F5F5F4', accent: '#292524' },
  { value: 'coral', label: 'Coral', bg: '#FFF5F3', primary: '#E07A5F', accent: '#FECDD3' },
  { value: 'sage', label: 'Sage', bg: '#F0FDF4', primary: '#81B29A', accent: '#BBF7D0' },
  { value: 'ocean', label: 'Océano', bg: '#EFF6FF', primary: '#3B82F6', accent: '#BFDBFE' },
  { value: 'sunset', label: 'Atardecer', bg: '#FFF7ED', primary: '#F97316', accent: '#FED7AA' },
];

function HouseholdSection({ currentUser }) {
  const [link, setLink] = useState(null);
  const [mode, setMode] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (currentUser) {
      supabase.from('household_links')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle()
        .then(({ data }) => setLink(data));
    }
  }, [currentUser]);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleCreate = async () => {
    setLoading(true);
    const newCode = generateCode();
    const { data, error } = await supabase
      .from('household_links')
      .insert({ user_id: currentUser.id, owner_id: currentUser.id, code: newCode })
      .select().single();
    if (!error) { setLink(data); setCode(newCode); setMessage(''); }
    else setMessage('Error al crear el hogar.');
    setLoading(false);
  };

  const handleJoin = async () => {
    setLoading(true);
    setMessage('');
    const { data: owner } = await supabase
      .from('household_links')
      .select('*')
      .eq('code', joinCode.toUpperCase())
      .maybeSingle();
    if (!owner) { setMessage('Código incorrecto.'); setLoading(false); return; }
    const { error } = await supabase
      .from('household_links')
      .upsert({ user_id: currentUser.id, owner_id: owner.owner_id, code: joinCode.toUpperCase() });
    if (!error) { setMessage('¡Te uniste al hogar! Recargá la app.'); setMode(null); }
    else setMessage('Error al unirse.');
    setLoading(false);
  };

  const handleLeave = async () => {
    await supabase.from('household_links').delete().eq('user_id', currentUser.id);
    setLink(null);
    setMode(null);
    setMessage('Saliste del hogar.');
  };

  if (link && link.owner_id === currentUser?.id) {
    return (
      <div>
        <p className="text-sm text-stone-600 mb-3">Sos el creador del hogar. Compartí este código con tu pareja:</p>
        <div className="bg-stone-50 rounded-xl p-4 text-center mb-3">
          <p className="text-2xl font-bold tracking-widest text-stone-900">{link.code}</p>
          <p className="text-xs text-stone-400 mt-1">Tu pareja lo ingresa en Configuración → Hogar compartido</p>
        </div>
        <button onClick={handleLeave} className="text-xs text-red-400 underline">Disolver hogar</button>
      </div>
    );
  }

  if (link && link.owner_id !== currentUser?.id) {
    return (
      <div>
        <div className="bg-emerald-50 rounded-xl p-3 mb-3 flex items-center gap-2">
          <span className="text-emerald-600 text-lg">✓</span>
          <p className="text-sm text-emerald-700">Estás conectado a un hogar compartido</p>
        </div>
        <button onClick={handleLeave} className="text-xs text-red-400 underline">Salir del hogar</button>
      </div>
    );
  }

  return (
    <div>
      {message && <p className="text-sm text-stone-600 mb-3">{message}</p>}
      {!mode && (
        <div className="flex flex-col gap-2">
          <button onClick={handleCreate} disabled={loading}
            className="w-full p-3 rounded-xl bg-stone-900 text-white text-sm font-medium disabled:opacity-50">
            {loading ? 'Creando...' : 'Crear hogar y obtener código'}
          </button>
          <button onClick={() => setMode('join')}
            className="w-full p-3 rounded-xl border border-stone-200 text-sm text-stone-700">
            Tengo un código, unirme
          </button>
        </div>
      )}
      {mode === 'join' && (
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Ingresá el código"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E7E5E4', fontSize: '16px', boxSizing: 'border-box', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }}
          />
          {message && <p className="text-sm text-red-500">{message}</p>}
          <div className="flex gap-2">
            <button onClick={() => setMode(null)} className="flex-1 p-3 rounded-xl border border-stone-200 text-sm text-stone-700">Cancelar</button>
            <button onClick={handleJoin} disabled={loading || joinCode.length < 6}
              className="flex-1 p-3 rounded-xl bg-stone-900 text-white text-sm font-medium disabled:opacity-50">
              {loading ? 'Uniéndome...' : 'Unirme'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [currentTheme, setCurrentTheme] = useState('light');
  
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const list = await base44.entities.AppSettings.list();
      return list[0] || null;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (settings?.theme) {
      setCurrentTheme(settings.theme);
      applyTheme(settings.theme);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.AppSettings.update(settings.id, data);
      } else {
        return base44.entities.AppSettings.create(data);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-settings'] }),
  });

  const applyTheme = (themeValue) => {
    const theme = THEMES.find(t => t.value === themeValue);
    if (!theme) return;
    
    document.documentElement.style.setProperty('--theme-bg', theme.bg);
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    
    // Apply to body
    if (themeValue === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  const handleThemeChange = (theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    updateSettingsMutation.mutate({ theme });
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="pt-safe mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-stone-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-stone-900">Configuración</h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Theme Section */}
        <section className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-stone-100 rounded-xl">
              <Palette className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <h2 className="font-semibold text-stone-900">Tema</h2>
              <p className="text-sm text-stone-500">Personaliza el aspecto de la app</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme.value}
                onClick={() => handleThemeChange(theme.value)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  currentTheme === theme.value
                    ? 'border-stone-900 bg-stone-50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex gap-1 mb-2 justify-center">
                  <div
                    className="w-4 h-4 rounded-full border border-stone-200"
                    style={{ backgroundColor: theme.bg }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-stone-200"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-stone-200"
                    style={{ backgroundColor: theme.accent }}
                  />
                </div>
                <p className="text-xs font-medium text-stone-700">{theme.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Compartir hogar */}
        <section className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-stone-100 rounded-xl">
              <Users className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <h2 className="font-semibold text-stone-900">Hogar compartido</h2>
              <p className="text-sm text-stone-500">Comparte la app con tu pareja</p>
            </div>
          </div>
          <HouseholdSection currentUser={currentUser} />
        </section>

        {/* Integrations */}
        <section className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-stone-100 rounded-xl">
              <Link2 className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <h2 className="font-semibold text-stone-900">Integraciones</h2>
              <p className="text-sm text-stone-500">Conecta servicios externos</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl opacity-50">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-stone-500" />
                <div>
                  <p className="font-medium text-stone-700">Google Calendar</p>
                  <p className="text-xs text-stone-500">Sincroniza eventos</p>
                </div>
              </div>
              <span className="text-xs text-stone-400 px-2 py-1 bg-stone-200 rounded-full">
                Premium
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl opacity-50">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-stone-500" />
                <div>
                  <p className="font-medium text-stone-700">Google Sheets</p>
                  <p className="text-xs text-stone-500">Exporta gastos</p>
                </div>
              </div>
              <span className="text-xs text-stone-400 px-2 py-1 bg-stone-200 rounded-full">
                Premium
              </span>
            </div>
          </div>

          <p className="text-xs text-stone-400 mt-3 text-center">
            Activa el plan Premium para conectar estas integraciones
          </p>
        </section>
      </div>
    </div>
  );
}