import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Palette, Users, Link2, Calendar, FileSpreadsheet, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const THEMES = [
  { value: 'light', label: 'Claro', bg: '#F5F5F4', primary: '#292524', accent: '#FFFFFF' },
  { value: 'dark', label: 'Oscuro', bg: '#1C1917', primary: '#F5F5F4', accent: '#292524' },
  { value: 'coral', label: 'Coral', bg: '#FFF5F3', primary: '#E07A5F', accent: '#FECDD3' },
  { value: 'sage', label: 'Sage', bg: '#F0FDF4', primary: '#81B29A', accent: '#BBF7D0' },
  { value: 'ocean', label: 'Océano', bg: '#EFF6FF', primary: '#3B82F6', accent: '#BFDBFE' },
  { value: 'sunset', label: 'Atardecer', bg: '#FFF7ED', primary: '#F97316', accent: '#FED7AA' },
];

export default function Settings() {
  const [inviteEmail, setInviteEmail] = useState('');
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

        {/* Connected Users */}
        <section className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-stone-100 rounded-xl">
              <Users className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <h2 className="font-semibold text-stone-900">Compartir</h2>
              <p className="text-sm text-stone-500">Invita a alguien a usar la app</p>
            </div>
          </div>

          {currentUser && (
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl mb-3">
              <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-stone-500" />
              </div>
              <div>
                <p className="font-medium text-stone-700">{currentUser.full_name || 'Tú'}</p>
                <p className="text-sm text-stone-500">{currentUser.email}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Email..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="rounded-xl flex-1"
            />
            <Button
              onClick={async () => {
                if (inviteEmail) {
                  await base44.users.inviteUser(inviteEmail, 'user');
                  setInviteEmail('');
                }
              }}
              className="rounded-xl bg-stone-900"
            >
              Invitar
            </Button>
          </div>
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