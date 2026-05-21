import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, TrendingUp, TrendingDown, Receipt, ChevronLeft,
  ExternalLink, RefreshCw, Loader2, X, BarChart3, ArrowUpDown
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/common/PageHeader';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import AddExpenseModal from '@/components/economy/AddExpenseModal';
import AddIncomeModal from '@/components/economy/AddIncomeModal';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';

const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1ydoIpAzJrPUQ-wiYHiqRLSzF5wltilDrloY_iu34Nj8/edit';
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#a855f7'];
const CURRENT_YEAR = new Date().getFullYear();

const pn = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/[$,]/g, '')) || 0;
};

const parseAnual = (rows) => {
  if (!rows || rows.length < 22) return null;
  const ingresosAnual = pn(rows[2]?.[13]);
  const ingresosMes = MESES_CORTOS.map((_, j) => pn(rows[2]?.[j + 1]));
  const balanceAnual = pn(rows[6]?.[13]);
  const balanceMes = MESES_CORTOS.map((_, j) => pn(rows[6]?.[j + 1]));
  const cats = rows.slice(10, 21).map(row => ({
    categoria: row?.[0] || '',
    meses: MESES_CORTOS.map((_, j) => pn(row?.[j + 1])),
    total: pn(row?.[13]),
  })).filter(c => c.categoria);
  const totalesMes = MESES_CORTOS.map((_, j) => pn(rows[21]?.[j + 1]));
  const totalAnual = pn(rows[21]?.[13]);
  const medios = rows.slice(25, 31).map(row => ({
    medio: row?.[0] || '',
    meses: MESES_CORTOS.map((_, j) => pn(row?.[j + 1])),
    total: pn(row?.[13]),
  })).filter(m => m.medio);
  return { ingresosAnual, ingresosMes, balanceAnual, balanceMes, cats, totalesMes, totalAnual, medios };
};

const parseComparacion = (rows) => {
  if (!rows || rows.length < 22) return null;
  const year1 = pn(rows[0]?.[1]);
  const year2 = pn(rows[0]?.[2]);
  const mes1 = rows[1]?.[7] || '';
  const mes2 = rows[1]?.[8] || '';
  const ingAnual1 = pn(rows[3]?.[1]); const ingAnual2 = pn(rows[3]?.[2]);
  const ingMes1 = pn(rows[3]?.[7]); const ingMes2 = pn(rows[3]?.[8]);
  const balAnual1 = pn(rows[7]?.[1]); const balAnual2 = pn(rows[7]?.[2]);
  const balMes1 = pn(rows[7]?.[7]); const balMes2 = pn(rows[7]?.[8]);
  const catsAnual = rows.slice(11, 22).map(row => ({
    categoria: row?.[0] || '', val1: pn(row?.[1]), val2: pn(row?.[2]),
  })).filter(c => c.categoria);
  const catsMes = rows.slice(11, 22).map(row => ({
    categoria: row?.[0] || '', val1: pn(row?.[7]), val2: pn(row?.[8]),
  })).filter(c => c.categoria);
  const totGastoAnual1 = pn(rows[22]?.[1]); const totGastoAnual2 = pn(rows[22]?.[2]);
  const totGastoMes1 = pn(rows[22]?.[7]); const totGastoMes2 = pn(rows[22]?.[8]);
  const mediosAnual = rows.slice(26, 32).map(row => ({
    medio: row?.[0] || '', val1: pn(row?.[1]), val2: pn(row?.[2]),
  })).filter(m => m.medio);
  const mediosMes = rows.slice(26, 32).map(row => ({
    medio: row?.[0] || '', val1: pn(row?.[7]), val2: pn(row?.[8]),
  })).filter(m => m.medio);
  return {
    year1, year2, mes1, mes2,
    ingAnual1, ingAnual2, ingMes1, ingMes2,
    balAnual1, balAnual2, balMes1, balMes2,
    catsAnual, catsMes, totGastoAnual1, totGastoAnual2, totGastoMes1, totGastoMes2,
    mediosAnual, mediosMes,
  };
};

const fmt = (v) => `$${Math.abs(v).toLocaleString('es-AR')}`;
const fmtSigned = (v) => v < 0 ? `-$${Math.abs(v).toLocaleString('es-AR')}` : `$${v.toLocaleString('es-AR')}`;

const ListPicker = ({ title, selected, onSelect, onClose, items }) => (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={onClose} />
    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
      className="fixed left-0 right-0 bg-white rounded-t-3xl z-[60] flex flex-col" style={{ bottom: 'calc(50px + env(safe-area-inset-bottom, 0px))', maxHeight: '55vh' }}>
      <div className="flex-shrink-0 px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {items.map((item, i) => (
          <button key={i} onClick={() => { onSelect(item); onClose(); }}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
              selected === item ? 'bg-stone-900 text-white font-medium' : 'hover:bg-stone-50 text-stone-700'
            }`}>
            {item}
          </button>
        ))}
      </div>
    </motion.div>
  </>
);

export default function Economy() {
  const { isConnected, reconnect, getHojaAnual, getComparacion, setComparacionMeses } = useGoogleSheets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('mensual');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [availableYears, setAvailableYears] = useState([CURRENT_YEAR]);
  const [anualData, setAnualData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [compareMes1, setCompareMes1] = useState('Enero');
  const [compareMes2, setCompareMes2] = useState('Abril');
  const [showCmp1Picker, setShowCmp1Picker] = useState(false);
  const [showCmp2Picker, setShowCmp2Picker] = useState(false);
  const [updatingMeses, setUpdatingMeses] = useState(false);
  const [compareMode, setCompareMode] = useState('anual');

  useRealtimeQuery('expenses', 'expenses');
  useRealtimeQuery('income', 'incomes');

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.entities.Expense.list('-date'),
  });

  const { data: incomes = [], isLoading: loadingIncomes } = useQuery({
    queryKey: ['incomes'],
    queryFn: () => api.entities.Income.list('-date'),
  });

  useEffect(() => {
    if (isConnected) loadAvailableYears();
  }, [isConnected]);

  useEffect(() => { if (isConnected && activeTab === 'anual') loadAnual(); }, [isConnected, activeTab, selectedYear]);
  useEffect(() => { if (isConnected && activeTab === 'comparar') loadComparar(); }, [isConnected, activeTab]);

  const loadAvailableYears = async () => {
    try {
      const token = localStorage.getItem('google_access_token');
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/1ydoIpAzJrPUQ-wiYHiqRLSzF5wltilDrloY_iu34Nj8?fields=sheets.properties.title`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const years = (data.sheets || [])
        .map(s => s.properties.title)
        .filter(t => t.startsWith('Año '))
        .map(t => parseInt(t.replace('Año ', '')))
        .filter(y => !isNaN(y))
        .sort((a, b) => b - a);
      if (years.length > 0) setAvailableYears(years);
    } catch (e) { console.error(e); }
  };

  const loadAnual = async () => {
    setLoadingData(true);
    try { setAnualData(parseAnual(await getHojaAnual(selectedYear))); }
    catch (e) { console.error(e); }
    finally { setLoadingData(false); }
  };

  const loadComparar = async () => {
    setLoadingData(true);
    try { setCompareData(parseComparacion(await getComparacion())); }
    catch (e) { console.error(e); }
    finally { setLoadingData(false); }
  };

  const handleUpdateMeses = async (m1, m2) => {
    setUpdatingMeses(true);
    try {
      const rows = await setComparacionMeses(m1, m2);
      setCompareData(parseComparacion(rows));
    } catch (e) { console.error(e); }
    finally { setUpdatingMeses(false); }
  };

  const availableMonths = useMemo(() => {
    const seen = new Set();
    const months = [];

    [...expenses, ...incomes].forEach(item => {
      const d = item.date ? parseISO(item.date) : null;
      if (d) {
        const key = format(d, 'yyyy-MM');
        if (!seen.has(key)) { seen.add(key); months.push(new Date(d.getFullYear(), d.getMonth(), 1)); }
      }
    });

    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      if (!seen.has(key)) { seen.add(key); months.push(new Date(d.getFullYear(), d.getMonth(), 1)); }
    }

    months.sort((a, b) => b.getTime() - a.getTime());
    return months;
  }, [expenses, incomes]);

  const periodExpenses = expenses.filter(e => {
    const d = e.date ? parseISO(e.date) : null;
    if (!d) return false;
    try { return isWithinInterval(d, { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) }); }
    catch { return false; }
  });

  const periodIncomes = incomes.filter(i => {
    const d = i.date ? parseISO(i.date) : null;
    if (!d) return false;
    try { return isWithinInterval(d, { start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) }); }
    catch { return false; }
  });

  const periodMovimientos = useMemo(() => [
    ...periodExpenses.map(e => ({ id: e.id, tipo: 'Gasto', fecha: e.date, monto: e.amount || 0, descripcion: e.description, categoria: e.category, medio: e.payment_method })),
    ...periodIncomes.map(i => ({ id: i.id, tipo: 'Ingreso', fecha: i.date, monto: i.amount || 0, descripcion: i.description, categoria: i.category, medio: null })),
  ].sort((a, b) => {
    const da = a.fecha ? new Date(a.fecha).getTime() : 0;
    const db = b.fecha ? new Date(b.fecha).getTime() : 0;
    return db - da;
  }), [periodExpenses, periodIncomes]);

  const totalGastos = periodExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalIngresos = periodIncomes.reduce((s, i) => s + (i.amount || 0), 0);
  const balance = totalIngresos - totalGastos;

  const SummaryCards = ({ gastos, ingresos, bal }) => (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className={`rounded-2xl p-3 border ${bal >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
        <p className={`text-xs mb-1 ${bal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Balance</p>
        <p className={`text-sm font-bold ${bal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtSigned(bal)}</p>
      </div>
      <div className="rounded-2xl p-3 border bg-white border-stone-100">
        <p className="text-xs mb-1 text-stone-500">Ingresos</p>
        <p className="text-sm font-bold text-emerald-600">+{fmt(ingresos)}</p>
      </div>
      <div className="rounded-2xl p-3 border bg-white border-stone-100">
        <p className="text-xs mb-1 text-stone-500">Gastos</p>
        <p className="text-sm font-bold text-red-600">-{fmt(gastos)}</p>
      </div>
    </div>
  );

  const Tabs = () => (
    <div className="flex gap-1 mb-4 p-1 bg-stone-100 rounded-2xl">
      {[{ key: 'mensual', label: 'Mensual', icon: Receipt }, { key: 'anual', label: 'Anual', icon: BarChart3 }, { key: 'comparar', label: 'Comparar', icon: ArrowUpDown }]
        .map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
    </div>
  );

  return (
    <div className="pb-24">
      <PageHeader title="Economía" subtitle="Gastos e ingresos" />

      {/* Fila de acciones */}
      <div className="flex gap-2 mb-4">
        {isConnected ? (
          <>
            <a href={SHEETS_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100">
              <ExternalLink className="w-4 h-4" /> Abrir Sheets
            </a>
            <button onClick={() => { if (activeTab === 'anual') loadAnual(); if (activeTab === 'comparar') loadComparar(); }}
              className="flex items-center gap-2 px-3 py-2 bg-stone-50 text-stone-600 rounded-xl text-sm border border-stone-100">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
          </>
        ) : (
          <button onClick={reconnect}
            className="flex items-center gap-2 px-3 py-2 bg-stone-50 text-stone-600 rounded-xl text-sm border border-stone-100">
            <svg width="14" height="14" viewBox="0 0 18 18">
              <path fill="currentColor" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="currentColor" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="currentColor" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
              <path fill="currentColor" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Conectar Google (gráficos)
          </button>
        )}
      </div>

      {/* Selector de período */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {activeTab === 'mensual' && (
          <>
            <button onClick={() => setSelectedMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; })} className="p-2 rounded-xl hover:bg-stone-100">
              <ChevronLeft className="w-5 h-5 text-stone-600" />
            </button>
            <button onClick={() => setShowMonthPicker(true)}
              className="px-4 py-2 rounded-xl border border-stone-200 bg-white min-w-44 text-center hover:bg-stone-50">
              <span className="font-medium text-stone-900 capitalize">{format(selectedMonth, 'MMMM yyyy', { locale: es })}</span>
            </button>
            <button onClick={() => setSelectedMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; })} className="p-2 rounded-xl hover:bg-stone-100">
              <ChevronLeft className="w-5 h-5 text-stone-600 rotate-180" />
            </button>
          </>
        )}
        {activeTab === 'anual' && (
          <>
            <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 rounded-xl hover:bg-stone-100">
              <ChevronLeft className="w-5 h-5 text-stone-600" />
            </button>
            <button onClick={() => setShowYearPicker(true)}
              className="px-4 py-2 rounded-xl border border-stone-200 bg-white min-w-32 text-center hover:bg-stone-50">
              <span className="font-medium text-stone-900">{selectedYear}</span>
            </button>
            <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 rounded-xl hover:bg-stone-100">
              <ChevronLeft className="w-5 h-5 text-stone-600 rotate-180" />
            </button>
          </>
        )}
        {activeTab === 'comparar' && compareData && (
          <div className="flex items-center gap-2 w-full">
            {compareMode === 'anual' ? (
              <>
                <div className="flex-1 text-center">
                  <p className="text-xs text-stone-400 mb-1">Año 1</p>
                  <div className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-900">{compareData.year1}</div>
                </div>
                <span className="text-stone-400 text-xs">vs</span>
                <div className="flex-1 text-center">
                  <p className="text-xs text-stone-400 mb-1">Año 2</p>
                  <div className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-900">{compareData.year2}</div>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-xs text-stone-400 mb-1">Mes 1</p>
                  <button onClick={() => setShowCmp1Picker(true)}
                    className="w-full py-2 rounded-xl border border-stone-200 bg-white text-center text-sm font-medium text-stone-900 hover:bg-stone-50">
                    {compareData.mes1 || compareMes1}
                  </button>
                </div>
                <span className="text-stone-400 text-xs mt-4">vs</span>
                <div className="flex-1">
                  <p className="text-xs text-stone-400 mb-1">Mes 2</p>
                  <button onClick={() => setShowCmp2Picker(true)}
                    className="w-full py-2 rounded-xl border border-stone-200 bg-white text-center text-sm font-medium text-stone-900 hover:bg-stone-50">
                    {compareData.mes2 || compareMes2}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      {activeTab === 'mensual' && (
        <SummaryCards gastos={totalGastos} ingresos={totalIngresos} bal={balance} />
      )}
      {activeTab === 'anual' && anualData && (
        <SummaryCards gastos={anualData.totalAnual} ingresos={anualData.ingresosAnual} bal={anualData.balanceAnual} />
      )}

      <Tabs />

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        {activeTab === 'mensual' && (
          <motion.div key="mensual" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {(loadingExpenses || loadingIncomes) ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-stone-400 animate-spin" /></div>
            ) : periodMovimientos.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Sin movimientos este mes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {periodMovimientos.map((m, i) => (
                  <div key={m.id || i} className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${m.tipo === 'Ingreso' ? 'bg-emerald-100' : 'bg-stone-100'}`}>
                          {m.tipo === 'Ingreso' ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-stone-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 text-sm truncate">{m.descripcion || m.categoria || m.tipo}</p>
                          <p className="text-xs text-stone-400 truncate">
                            {m.fecha}{m.categoria && ` • ${m.categoria}`}{m.medio && ` • ${m.medio}`}
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold text-sm flex-shrink-0 ml-2 ${m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.tipo === 'Ingreso' ? '+' : '-'}${Math.abs(m.monto).toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'anual' && (
          <motion.div key="anual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {!isConnected ? (
              <div className="text-center py-12 text-stone-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm mb-3">Conectá con Google para ver los gráficos anuales</p>
                <button onClick={reconnect} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm">Conectar</button>
              </div>
            ) : loadingData ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-stone-400 animate-spin" /></div>
            ) : !anualData ? (
              <div className="text-center py-12 text-stone-400"><BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">Sin datos para {selectedYear}</p></div>
            ) : (
              <>
                <div className="bg-white rounded-2xl p-4 border border-stone-100">
                  <h3 className="font-semibold text-stone-900 mb-4 text-sm">Gastos e ingresos por mes</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={MESES_CORTOS.map((mes, i) => ({
                      mes,
                      Gastos: anualData.totalesMes[i],
                      Ingresos: anualData.ingresosMes[i],
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => [fmt(v), '']} />
                      <Legend />
                      <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-stone-100">
                  <h3 className="font-semibold text-stone-900 mb-4 text-sm">Gastos por categoría</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={[...anualData.cats].sort((a, b) => b.total - a.total).map(c => ({ name: c.categoria, total: c.total }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={85} />
                      <Tooltip formatter={v => [fmt(v), 'Total']} />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                        {anualData.cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {anualData.medios.filter(m => m.total > 0).length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-stone-100">
                    <h3 className="font-semibold text-stone-900 mb-4 text-sm">Por medio de pago</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={[...anualData.medios].filter(m => m.total > 0).sort((a, b) => b.total - a.total).map(m => ({ name: m.medio, total: m.total }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                        <Tooltip formatter={v => [fmt(v), 'Total']} />
                        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                          {anualData.medios.filter(m => m.total > 0).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="bg-white rounded-2xl p-4 border border-stone-100">
                  <h3 className="font-semibold text-stone-900 mb-4 text-sm">Evolución por categoría</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={MESES_CORTOS.map((mes, i) => {
                      const obj = { mes };
                      anualData.cats.forEach(c => { if (c.meses[i] > 0) obj[c.categoria] = c.meses[i]; });
                      return obj;
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => [fmt(v), '']} />
                      {anualData.cats.map((c, i) => <Bar key={c.categoria} dataKey={c.categoria} stackId="a" fill={COLORS[i % COLORS.length]} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'comparar' && (
          <motion.div key="comparar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {!isConnected ? (
              <div className="text-center py-12 text-stone-400">
                <ArrowUpDown className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm mb-3">Conectá con Google para comparar períodos</p>
                <button onClick={reconnect} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm">Conectar</button>
              </div>
            ) : (
              <>
                <div className="flex gap-1 p-1 bg-stone-100 rounded-xl">
                  <button onClick={() => setCompareMode('anual')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${compareMode === 'anual' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
                    Por año
                  </button>
                  <button onClick={() => setCompareMode('meses')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${compareMode === 'meses' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
                    Por mes
                  </button>
                </div>

                {loadingData ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-stone-400 animate-spin" /></div>
                ) : (
                  <>
                    {compareMode === 'anual' && compareData && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 text-center">
                            <p className="text-xs text-indigo-500 mb-1">{compareData.year1}</p>
                            <p className="text-lg font-bold text-indigo-700">-{fmt(compareData.totGastoAnual1)}</p>
                          </div>
                          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-center">
                            <p className="text-xs text-amber-500 mb-1">{compareData.year2}</p>
                            <p className="text-lg font-bold text-amber-700">-{fmt(compareData.totGastoAnual2)}</p>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-stone-100">
                          <h3 className="font-semibold text-stone-900 mb-4 text-sm">Por categoría</h3>
                          <ResponsiveContainer width="100%" height={260}>
                            <BarChart layout="vertical" data={compareData.catsAnual.map(c => ({ name: c.categoria, [compareData.year1]: c.val1, [compareData.year2]: c.val2 }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={85} />
                              <Tooltip formatter={v => [fmt(v), '']} />
                              <Legend />
                              <Bar dataKey={String(compareData.year1)} fill="#6366f1" radius={[0, 4, 4, 0]} />
                              <Bar dataKey={String(compareData.year2)} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-stone-100">
                          <h3 className="font-semibold text-stone-900 mb-4 text-sm">Por medio de pago</h3>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart layout="vertical" data={compareData.mediosAnual.map(m => ({ name: m.medio, [compareData.year1]: m.val1, [compareData.year2]: m.val2 }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                              <Tooltip formatter={v => [fmt(v), '']} />
                              <Legend />
                              <Bar dataKey={String(compareData.year1)} fill="#6366f1" radius={[0, 4, 4, 0]} />
                              <Bar dataKey={String(compareData.year2)} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}

                    {compareMode === 'meses' && compareData && (
                      <>
                        {updatingMeses ? (
                          <div className="flex items-center justify-center gap-2 py-8 text-stone-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Actualizando...
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 text-center">
                                <p className="text-xs text-indigo-500 mb-1">{compareData.mes1}</p>
                                <p className="text-lg font-bold text-indigo-700">-{fmt(compareData.totGastoMes1)}</p>
                              </div>
                              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-center">
                                <p className="text-xs text-amber-500 mb-1">{compareData.mes2}</p>
                                <p className="text-lg font-bold text-amber-700">-{fmt(compareData.totGastoMes2)}</p>
                              </div>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-stone-100">
                              <h3 className="font-semibold text-stone-900 mb-4 text-sm">Por categoría</h3>
                              <ResponsiveContainer width="100%" height={260}>
                                <BarChart layout="vertical" data={compareData.catsMes.map(c => ({ name: c.categoria, [compareData.mes1]: c.val1, [compareData.mes2]: c.val2 }))}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={85} />
                                  <Tooltip formatter={v => [fmt(v), '']} />
                                  <Legend />
                                  <Bar dataKey={compareData.mes1} fill="#6366f1" radius={[0, 4, 4, 0]} />
                                  <Bar dataKey={compareData.mes2} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-stone-100">
                              <h3 className="font-semibold text-stone-900 mb-4 text-sm">Por medio de pago</h3>
                              <ResponsiveContainer width="100%" height={200}>
                                <BarChart layout="vertical" data={compareData.mediosMes.map(m => ({ name: m.medio, [compareData.mes1]: m.val1, [compareData.mes2]: m.val2 }))}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                                  <Tooltip formatter={v => [fmt(v), '']} />
                                  <Legend />
                                  <Bar dataKey={compareData.mes1} fill="#6366f1" radius={[0, 4, 4, 0]} />
                                  <Bar dataKey={compareData.mes2} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB con speed-dial */}
      {activeTab === 'mensual' && (
        <>
          <AnimatePresence>
            {showFabMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-30"
                  onClick={() => setShowFabMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="fixed right-4 flex flex-col items-end gap-2 z-40"
                  style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 160px)' }}>
                  <button
                    onClick={() => { setShowFabMenu(false); setShowAddIncome(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-full shadow-lg text-sm font-medium">
                    <TrendingUp className="w-4 h-4" /> Ingreso
                  </button>
                  <button
                    onClick={() => { setShowFabMenu(false); setShowAddExpense(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-full shadow-lg text-sm font-medium">
                    <TrendingDown className="w-4 h-4" /> Gasto
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFabMenu(v => !v)}
            className="fixed right-4 w-14 h-14 bg-stone-900 text-white rounded-full shadow-lg flex items-center justify-center z-40"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)' }}>
            <motion.div animate={{ rotate: showFabMenu ? 45 : 0 }} transition={{ duration: 0.2 }}>
              <Plus className="w-6 h-6" />
            </motion.div>
          </motion.button>
        </>
      )}

      {/* Pickers */}
      <AnimatePresence>
        {showMonthPicker && (
          <ListPicker title="Elegir mes" selected={format(selectedMonth, 'MMMM yyyy', { locale: es })}
            items={availableMonths.map(d => format(d, 'MMMM yyyy', { locale: es }))}
            onSelect={(label) => {
              const found = availableMonths.find(d => format(d, 'MMMM yyyy', { locale: es }) === label);
              if (found) setSelectedMonth(found);
            }}
            onClose={() => setShowMonthPicker(false)} />
        )}
        {showYearPicker && (
          <ListPicker title="Elegir año" selected={String(selectedYear)}
            items={availableYears.map(String)}
            onSelect={(y) => { setSelectedYear(parseInt(y)); }}
            onClose={() => setShowYearPicker(false)} />
        )}
        {showCmp1Picker && (
          <ListPicker title="Mes 1" selected={compareMes1} items={MESES_LARGOS}
            onSelect={(m) => { setCompareMes1(m); handleUpdateMeses(m, compareMes2); }}
            onClose={() => setShowCmp1Picker(false)} />
        )}
        {showCmp2Picker && (
          <ListPicker title="Mes 2" selected={compareMes2} items={MESES_LARGOS}
            onSelect={(m) => { setCompareMes2(m); handleUpdateMeses(compareMes1, m); }}
            onClose={() => setShowCmp2Picker(false)} />
        )}
      </AnimatePresence>

      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSave={() => {}}
      />
      <AddIncomeModal
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        onSave={() => {}}
      />
    </div>
  );
}
