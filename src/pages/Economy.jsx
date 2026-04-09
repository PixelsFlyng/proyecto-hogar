import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, TrendingUp, TrendingDown, Receipt, BarChart3,
  ChevronLeft, ChevronRight, ExternalLink, Camera,
  RefreshCw, Table, GitCompare, Loader2, X, Check
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/common/PageHeader';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';

const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1ydoIpAzJrPUQ-wiYHiqRLSzF5wltilDrloY_iu34Nj8/edit';
const CATEGORIAS = ['Super', 'Cine', 'Comida Hecha', 'Panadería', 'Bazar', 'Transporte', 'Grido', 'Farmacia', 'Limpieza', 'Juegos', 'Otros'];
const MEDIOS = ['Visa', 'Mastercard', 'Naranja', 'Transferencia Lean', 'Transferencia Yami', 'Efectivo'];
const emptyForm = {
  fecha: format(new Date(), 'yyyy-MM-dd'),
  tipo: 'Gasto',
  categoria: 'Super',
  monto: '',
  medio: 'Visa',
  cuotas: '',
  moneda: 'Pesos',
  descripcion: '',
};

export default function Economy() {
  const { isConnected, loading, getMovimientos, getHojaAnual, getComparacion, agregarMovimiento, analizarTicket } = useGoogleSheets();
  const [activeTab, setActiveTab] = useState('movimientos');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [movimientos, setMovimientos] = useState([]);
  const [hojaAnual, setHojaAnual] = useState([]);
  const [comparacion, setComparacion] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [scanningTicket, setScanningTicket] = useState(false);
  const [ticketText, setTicketText] = useState('');
  const fileInputRef = useRef(null);

  const isGoogleUser = !!localStorage.getItem('google_access_token');

  useEffect(() => {
    if (isConnected) loadMovimientos();
  }, [isConnected, selectedMonth]);

  useEffect(() => {
    if (isConnected && activeTab === 'anual') loadAnual();
    if (isConnected && activeTab === 'comparacion') loadComparacion();
  }, [isConnected, activeTab, selectedMonth]);

  const loadMovimientos = async () => {
    setLoadingData(true);
    try {
      const data = await getMovimientos();
      setMovimientos(data);
    } catch (e) { console.error(e); }
    finally { setLoadingData(false); }
  };

  const loadAnual = async () => {
    setLoadingData(true);
    try {
      const año = format(selectedMonth, 'yyyy');
      const data = await getHojaAnual(año);
      setHojaAnual(data);
    } catch (e) { console.error(e); }
    finally { setLoadingData(false); }
  };

  const loadComparacion = async () => {
    setLoadingData(true);
    try {
      const data = await getComparacion();
      setComparacion(data);
    } catch (e) { console.error(e); }
    finally { setLoadingData(false); }
  };

  const periodMovimientos = movimientos.filter(m => {
    if (!m.fecha) return false;
    try {
      const d = parseISO(m.fecha.includes('/') ? m.fecha.split('/').reverse().join('-') : m.fecha);
      return isWithinInterval(d, { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) });
    } catch { return false; }
  });

  const gastos = periodMovimientos.filter(m => m.tipo === 'Gasto');
  const ingresos = periodMovimientos.filter(m => m.tipo === 'Ingreso');
  const totalGastos = gastos.reduce((s, m) => s + m.monto, 0);
  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0);
  const balance = totalIngresos - totalGastos;

  const changePeriod = (dir) => {
    setSelectedMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const handleSave = async () => {
    if (!formData.monto || !formData.fecha) return;
    setSaving(true);
    try {
      await agregarMovimiento(formData);
      setShowAddModal(false);
      setFormData(emptyForm);
      setTicketText('');
      await loadMovimientos();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleTicketScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanningTicket(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const texto = await analizarTicket(base64);
      setTicketText(texto);
      const montoMatch = texto.match(/\$?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g);
      if (montoMatch) {
        const montos = montoMatch.map(m => parseFloat(m.replace(/[$.]/g, '').replace(',', '.'))).filter(m => m > 10);
        if (montos.length > 0) {
          setFormData(f => ({ ...f, monto: Math.max(...montos).toString() }));
        }
      }
    } catch (e) { console.error(e); }
    finally { setScanningTicket(false); }
  };

  if (!isGoogleUser) {
    return (
      <div>
        <PageHeader title="Economía" subtitle="Google Sheets" />
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-stone-400" />
          </div>
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Iniciá sesión con Google</h2>
          <p className="text-sm text-stone-500">Para acceder a tus finanzas necesitás iniciar sesión con tu cuenta de Google.</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div>
        <PageHeader title="Economía" subtitle="Google Sheets" />
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-stone-400" />
          </div>
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Token expirado</h2>
          <p className="text-sm text-stone-500">Cerrá sesión y volvé a entrar con Google.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Economía" subtitle="Google Sheets" />

      <div className="flex gap-2 mb-4">
        <a href={SHEETS_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100">
          <ExternalLink className="w-4 h-4" />
          Abrir Sheets
        </a>
        <button onClick={loadMovimientos}
          className="flex items-center gap-2 px-3 py-2 bg-stone-50 text-stone-600 rounded-xl text-sm border border-stone-100">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <button onClick={() => changePeriod(-1)} className="p-2 rounded-xl hover:bg-stone-100">
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div className="px-4 py-2 rounded-xl border border-stone-200 bg-white min-w-40 text-center">
          <span className="font-medium text-stone-900 capitalize">
            {format(selectedMonth, 'MMMM yyyy', { locale: es })}
          </span>
        </div>
        <button onClick={() => changePeriod(1)} className="p-2 rounded-xl hover:bg-stone-100">
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className={`rounded-2xl p-3 border ${balance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-xs mb-1 ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Balance</p>
          <p className={`text-base font-bold ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            ${Math.abs(balance).toLocaleString('es-AR')}
          </p>
        </div>
        <div className="rounded-2xl p-3 border bg-white border-stone-100">
          <p className="text-xs mb-1 text-stone-500">Ingresos</p>
          <p className="text-base font-bold text-emerald-600">${totalIngresos.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-2xl p-3 border bg-white border-stone-100">
          <p className="text-xs mb-1 text-stone-500">Gastos</p>
          <p className="text-base font-bold text-stone-900">${totalGastos.toLocaleString('es-AR')}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-stone-100 rounded-2xl">
        {[
          { key: 'movimientos', label: 'Movimientos', icon: Receipt },
          { key: 'anual', label: 'Anual', icon: Table },
          { key: 'comparacion', label: 'Comparar', icon: GitCompare },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'movimientos' && (
            <motion.div key="movimientos" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {periodMovimientos.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sin movimientos este mes</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {periodMovimientos.map((m, i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${m.tipo === 'Ingreso' ? 'bg-emerald-100' : 'bg-stone-100'}`}>
                            {m.tipo === 'Ingreso'
                              ? <TrendingUp className="w-4 h-4 text-emerald-600" />
                              : <TrendingDown className="w-4 h-4 text-stone-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-stone-900 text-sm">{m.descripcion !== '-' ? m.descripcion : m.categoria}</p>
                            <p className="text-xs text-stone-400">
                              {m.fecha}{m.categoria !== '-' && m.descripcion !== '-' && ` • ${m.categoria}`}{m.medio !== '-' && ` • ${m.medio}`}{m.cuota !== '-' && ` • ${m.cuota}`}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold text-sm ${m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-stone-900'}`}>
                          {m.tipo === 'Ingreso' ? '+' : '-'}${m.monto.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'anual' && (
            <motion.div key="anual" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {hojaAnual.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Table className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sin datos para {format(selectedMonth, 'yyyy')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-stone-100">
                  <table className="w-full text-xs">
                    <tbody>
                      {hojaAnual.map((row, i) => (
                        <tr key={i} className={i === 0 ? 'bg-stone-900 text-white' : i % 2 === 0 ? 'bg-stone-50' : 'bg-white'}>
                          {row.map((cell, j) => (
                            <td key={j} className={`px-2 py-1.5 border-b border-stone-100 whitespace-nowrap ${j === 0 ? 'font-medium' : ''}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'comparacion' && (
            <motion.div key="comparacion" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {comparacion.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <GitCompare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sin datos de comparación</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-stone-100">
                  <table className="w-full text-xs">
                    <tbody>
                      {comparacion.map((row, i) => (
                        <tr key={i} className={i === 0 ? 'bg-stone-900 text-white' : i % 2 === 0 ? 'bg-stone-50' : 'bg-white'}>
                          {row.map((cell, j) => (
                            <td key={j} className={`px-2 py-1.5 border-b border-stone-100 whitespace-nowrap ${j === 0 ? 'font-medium' : ''}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {activeTab === 'movimientos' && (
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)}
          className="fixed right-4 w-14 h-14 bg-stone-900 text-white rounded-full shadow-lg flex items-center justify-center z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)' }}>
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-6 py-4 border-b border-stone-100 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-stone-900">Nuevo movimiento</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-stone-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4 mb-8">
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} disabled={scanningTicket}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700">
                    {scanningTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {scanningTicket ? 'Leyendo...' : 'Escanear ticket'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleTicketScan} />
                  {ticketText && (
                    <div className="flex-1 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
                      ✓ Ticket leído
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-700">Tipo *</label>
                  <div className="flex gap-2">
                    {['Gasto', 'Ingreso'].map(t => (
                      <button key={t} type="button" onClick={() => setFormData(f => ({ ...f, tipo: t }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium ${formData.tipo === t ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-700">Fecha *</label>
                  <input type="date" value={formData.fecha}
                    onChange={e => setFormData(f => ({ ...f, fecha: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-700">Monto *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                    <input type="number" value={formData.monto}
                      onChange={e => setFormData(f => ({ ...f, monto: e.target.value }))}
                      placeholder="0.00" className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm" />
                  </div>
                </div>

                {formData.tipo === 'Gasto' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-stone-700">Categoría *</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIAS.map(c => (
                        <button key={c} type="button" onClick={() => setFormData(f => ({ ...f, categoria: c }))}
                          className={`px-3 py-1.5 rounded-xl text-xs ${formData.categoria === c ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.tipo === 'Gasto' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-stone-700">Medio de pago *</label>
                    <div className="flex flex-wrap gap-2">
                      {MEDIOS.map(m => (
                        <button key={m} type="button" onClick={() => setFormData(f => ({ ...f, medio: m }))}
                          className={`px-3 py-1.5 rounded-xl text-xs ${formData.medio === m ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.tipo === 'Gasto' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-stone-700">Cuotas (opcional)</label>
                    <input type="number" min="1" value={formData.cuotas}
                      onChange={e => setFormData(f => ({ ...f, cuotas: e.target.value }))}
                      placeholder="1" className="w-24 px-4 py-2.5 rounded-xl border border-stone-200 text-sm" />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-700">Moneda</label>
                  <div className="flex gap-2">
                    {['Pesos', 'Dolares'].map(m => (
                      <button key={m} type="button" onClick={() => setFormData(f => ({ ...f, moneda: m }))}
                        className={`px-4 py-2 rounded-xl text-sm ${formData.moneda === m ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-stone-700">Descripción (opcional)</label>
                  <input type="text" value={formData.descripcion}
                    onChange={e => setFormData(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Ej: Supermercado Día" className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm" />
                </div>

                <button onClick={handleSave} disabled={saving || !formData.monto || !formData.fecha}
                  className="w-full py-3 rounded-xl bg-stone-900 text-white font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Guardando...' : 'Agregar movimiento'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}