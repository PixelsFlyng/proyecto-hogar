import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, TrendingUp, TrendingDown, Receipt, ChevronLeft,
  ExternalLink, Loader2, X, BarChart3, ArrowUpDown, Pencil, Trash2
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
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#a855f7'];
const CURRENT_YEAR = new Date().getFullYear();

const fmt = (v) => `$${Math.abs(v).toLocaleString('es-AR')}`;
const fmtSigned = (v) => v < 0 ? `-$${Math.abs(v).toLocaleString('es-AR')}` : `$${v.toLocaleString('es-AR')}`;

const computeAnualData = (/** @type {any[]} */ expenses, /** @type {any[]} */ incomes, /** @type {number} */ year) => {
  const yExp = expenses.filter(/** @type {(e: any) => boolean} */ e => e.date && new Date(e.date).getFullYear() === year);
  const yInc = incomes.filter(/** @type {(i: any) => boolean} */ i => i.date && new Date(i.date).getFullYear() === year);
  const totalesMes = Array(12).fill(0);
  const ingresosMes = Array(12).fill(0);
  const catMap = /** @type {Record<string, {categoria: string, meses: number[], total: number}>} */ ({});
  const medioMap = /** @type {Record<string, {medio: string, meses: number[], total: number}>} */ ({});

  yExp.forEach((/** @type {any} */ e) => {
    const m = new Date(e.date).getMonth();
    const a = e.amount || 0;
    totalesMes[m] += a;
    const cat = e.category || 'Sin Categoría';
    if (!catMap[cat]) catMap[cat] = { categoria: cat, meses: Array(12).fill(0), total: 0 };
    catMap[cat].meses[m] += a;
    catMap[cat].total += a;
    const medio = e.payment_method || 'Otro';
    if (!medioMap[medio]) medioMap[medio] = { medio, meses: Array(12).fill(0), total: 0 };
    medioMap[medio].meses[m] += a;
    medioMap[medio].total += a;
  });

  yInc.forEach((/** @type {any} */ i) => {
    const m = new Date(i.date).getMonth();
    ingresosMes[m] += i.amount || 0;
  });

  const totalAnual = totalesMes.reduce((s, v) => s + v, 0);
  const ingresosAnual = ingresosMes.reduce((s, v) => s + v, 0);
  return {
    ingresosAnual, ingresosMes,
    balanceAnual: ingresosAnual - totalAnual,
    cats: Object.values(catMap).sort((a, b) => b.total - a.total),
    totalesMes, totalAnual,
    medios: Object.values(medioMap).sort((a, b) => b.total - a.total),
  };
};

const computeComparison = (/** @type {any[]} */ expenses, /** @type {any[]} */ incomes, /** @type {(e: any) => boolean} */ filter1, /** @type {(e: any) => boolean} */ filter2, /** @type {string} */ label1, /** @type {string} */ label2) => {
  const summarize = (/** @type {(e: any) => boolean} */ filterFn) => {
    const pExp = expenses.filter(e => e.date && filterFn(e));
    const pInc = incomes.filter(i => i.date && filterFn(i));
    const catMap = /** @type {Record<string, {categoria: string, val: number}>} */ ({});
    const medioMap = /** @type {Record<string, {medio: string, val: number}>} */ ({});
    let totalGasto = 0, totalIngreso = 0;
    pExp.forEach((/** @type {any} */ e) => {
      const a = e.amount || 0;
      totalGasto += a;
      const cat = e.category || 'Sin Categoría';
      if (!catMap[cat]) catMap[cat] = { categoria: cat, val: 0 };
      catMap[cat].val += a;
      const medio = e.payment_method || 'Otro';
      if (!medioMap[medio]) medioMap[medio] = { medio, val: 0 };
      medioMap[medio].val += a;
    });
    pInc.forEach((/** @type {any} */ i) => { totalIngreso += i.amount || 0; });
    return { totalGasto, totalIngreso, cats: Object.values(catMap), medios: Object.values(medioMap) };
  };

  const s1 = summarize(filter1);
  const s2 = summarize(filter2);

  const allCats = [...new Set([...s1.cats.map(c => c.categoria), ...s2.cats.map(c => c.categoria)])];
  const allMedios = [...new Set([...s1.medios.map(m => m.medio), ...s2.medios.map(m => m.medio)])];

  return {
    label1, label2,
    totGasto1: s1.totalGasto, totGasto2: s2.totalGasto,
    bal1: s1.totalIngreso - s1.totalGasto, bal2: s2.totalIngreso - s2.totalGasto,
    cats: allCats.map(cat => ({
      categoria: cat,
      val1: s1.cats.find(c => c.categoria === cat)?.val || 0,
      val2: s2.cats.find(c => c.categoria === cat)?.val || 0,
    })).sort((a, b) => (b.val1 + b.val2) - (a.val1 + a.val2)),
    medios: allMedios.map(medio => ({
      medio,
      val1: s1.medios.find(m => m.medio === medio)?.val || 0,
      val2: s2.medios.find(m => m.medio === medio)?.val || 0,
    })).sort((a, b) => (b.val1 + b.val2) - (a.val1 + a.val2)),
  };
};

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
  const { isConnected, reconnect, agregarMovimiento, actualizarMovimiento, eliminarMovimiento } = useGoogleSheets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('mensual');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [compareMode, setCompareMode] = useState('anual');
  const [compareYear1, setCompareYear1] = useState(CURRENT_YEAR);
  const [compareYear2, setCompareYear2] = useState(CURRENT_YEAR - 1);
  const [comparePeriod1, setComparePeriod1] = useState(subMonths(new Date(), 1));
  const [comparePeriod2, setComparePeriod2] = useState(subMonths(new Date(), 2));
  const [showCmp1Picker, setShowCmp1Picker] = useState(false);
  const [showCmp2Picker, setShowCmp2Picker] = useState(false);
  const [editingItem, setEditingItem] = useState(/** @type {null|{tipo:'Gasto'|'Ingreso', data: any}} */ (null));
  const [deletingId, setDeletingId] = useState(/** @type {string|null} */ (null));

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

  const availableYears = useMemo(() => {
    const years = new Set([CURRENT_YEAR, CURRENT_YEAR - 1]);
    [...expenses, ...incomes].forEach(item => {
      if (item.date) years.add(new Date(item.date).getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [expenses, incomes]);

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

  const anualData = useMemo(
    () => computeAnualData(expenses, incomes, selectedYear),
    [expenses, incomes, selectedYear]
  );

  const compareData = useMemo(() => {
    if (compareMode === 'anual') {
      return computeComparison(
        expenses, incomes,
        e => new Date(e.date).getFullYear() === compareYear1,
        e => new Date(e.date).getFullYear() === compareYear2,
        String(compareYear1), String(compareYear2)
      );
    }
    const inInterval = (date, period) => {
      try { return isWithinInterval(parseISO(date), { start: startOfMonth(period), end: endOfMonth(period) }); }
      catch { return false; }
    };
    return computeComparison(
      expenses, incomes,
      e => inInterval(e.date, comparePeriod1),
      e => inInterval(e.date, comparePeriod2),
      format(comparePeriod1, 'MMM yyyy', { locale: es }),
      format(comparePeriod2, 'MMM yyyy', { locale: es })
    );
  }, [expenses, incomes, compareMode, compareYear1, compareYear2, comparePeriod1, comparePeriod2]);

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

  const handleExpenseSaved = async (/** @type {any} */ expense) => {
    if (!isConnected) return;
    try {
      await agregarMovimiento({
        fecha: format(parseISO(expense.date), 'dd/MM/yyyy'),
        tipo: 'Gasto',
        categoria: expense.category || '-',
        monto: expense.amount,
        medio: expense.payment_method || '-',
        cuota: '-',
        moneda: 'Pesos',
        descripcion: expense.description || '-',
        supabaseId: expense.id || '',
      });
    } catch (e) { console.error('Error al guardar en Sheets:', e); }
  };

  const handleIncomeSaved = async (/** @type {any} */ income) => {
    if (!isConnected) return;
    try {
      await agregarMovimiento({
        fecha: format(parseISO(income.date), 'dd/MM/yyyy'),
        tipo: 'Ingreso',
        categoria: income.category || '-',
        monto: income.amount,
        medio: '-',
        cuota: '-',
        moneda: 'Pesos',
        descripcion: income.description || '-',
        supabaseId: income.id || '',
      });
    } catch (e) { console.error('Error al guardar en Sheets:', e); }
  };

  const deleteExpenseMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => api.entities.Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => api.entities.Income.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incomes'] }),
  });

  const handleDeleteItem = async (/** @type {any} */ m) => {
    if (m.tipo === 'Gasto') deleteExpenseMutation.mutate(m.id);
    else deleteIncomeMutation.mutate(m.id);
    setDeletingId(null);
    if (isConnected) {
      try { await eliminarMovimiento(m.id); } catch (e) { console.error('Error al eliminar en Sheets:', e); }
    }
  };

  const handleEditItem = (/** @type {any} */ m) => {
    const original = m.tipo === 'Gasto'
      ? expenses.find(e => e.id === m.id)
      : incomes.find(i => i.id === m.id);
    if (original) setEditingItem({ tipo: m.tipo, data: original });
  };

  const handleExpenseEdited = async (/** @type {any} */ expense) => {
    if (!isConnected) return;
    try {
      await actualizarMovimiento(expense.id, {
        fecha: format(parseISO(expense.date), 'dd/MM/yyyy'),
        tipo: 'Gasto',
        categoria: expense.category || '-',
        monto: expense.amount,
        medio: expense.payment_method || '-',
        cuota: '-',
        moneda: 'Pesos',
        descripcion: expense.description || '-',
      });
    } catch (e) { console.error('Error al actualizar en Sheets:', e); }
  };

  const handleIncomeEdited = async (/** @type {any} */ income) => {
    if (!isConnected) return;
    try {
      await actualizarMovimiento(income.id, {
        fecha: format(parseISO(income.date), 'dd/MM/yyyy'),
        tipo: 'Ingreso',
        categoria: income.category || '-',
        monto: income.amount,
        medio: '-',
        cuota: '-',
        moneda: 'Pesos',
        descripcion: income.description || '-',
      });
    } catch (e) { console.error('Error al actualizar en Sheets:', e); }
  };

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
      <div className="flex flex-wrap gap-2 mb-4">
        {isConnected ? (
          <a href={SHEETS_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100">
            <ExternalLink className="w-4 h-4" /> Abrir Sheets
          </a>
        ) : (
          <button onClick={reconnect}
            className="flex items-center gap-2 px-3 py-2 bg-stone-50 text-stone-600 rounded-xl text-sm border border-stone-100">
            <svg width="14" height="14" viewBox="0 0 18 18">
              <path fill="currentColor" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="currentColor" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="currentColor" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
              <path fill="currentColor" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Conectar Google (backup Sheets)
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
        {activeTab === 'comparar' && (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              <p className="text-xs text-stone-400 mb-1">{compareMode === 'anual' ? 'Año 1' : 'Mes 1'}</p>
              <button onClick={() => setShowCmp1Picker(true)}
                className="w-full py-2 rounded-xl border border-stone-200 bg-white text-center text-sm font-medium text-stone-900 hover:bg-stone-50">
                {compareMode === 'anual' ? compareYear1 : format(comparePeriod1, 'MMM yyyy', { locale: es })}
              </button>
            </div>
            <span className="text-stone-400 text-xs mt-4">vs</span>
            <div className="flex-1">
              <p className="text-xs text-stone-400 mb-1">{compareMode === 'anual' ? 'Año 2' : 'Mes 2'}</p>
              <button onClick={() => setShowCmp2Picker(true)}
                className="w-full py-2 rounded-xl border border-stone-200 bg-white text-center text-sm font-medium text-stone-900 hover:bg-stone-50">
                {compareMode === 'anual' ? compareYear2 : format(comparePeriod2, 'MMM yyyy', { locale: es })}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {activeTab === 'mensual' && (
        <SummaryCards gastos={totalGastos} ingresos={totalIngresos} bal={balance} />
      )}
      {activeTab === 'anual' && (
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
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${m.tipo === 'Ingreso' ? 'bg-emerald-100' : 'bg-stone-100'}`}>
                        {m.tipo === 'Ingreso' ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-stone-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-stone-900 text-sm truncate">{m.descripcion || m.categoria || m.tipo}</p>
                        <p className="text-xs text-stone-400 truncate">
                          {m.fecha}{m.categoria && ` • ${m.categoria}`}{m.medio && ` • ${m.medio}`}
                        </p>
                      </div>
                      <span className={`font-bold text-sm flex-shrink-0 ${m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {m.tipo === 'Ingreso' ? '+' : '-'}${Math.abs(m.monto).toLocaleString('es-AR')}
                      </span>
                      <button onClick={() => handleEditItem(m)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 flex-shrink-0">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {deletingId === m.id ? (
                        <button onClick={() => handleDeleteItem(m)} className="p-1.5 rounded-lg bg-red-100 text-red-600 flex-shrink-0 text-xs font-bold">
                          ✓
                        </button>
                      ) : (
                        <button onClick={() => setDeletingId(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'anual' && (
          <motion.div key="anual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {(loadingExpenses || loadingIncomes) ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-stone-400 animate-spin" /></div>
            ) : anualData.totalAnual === 0 && anualData.ingresosAnual === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Sin datos para {selectedYear}</p>
              </div>
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

                {anualData.cats.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-stone-100">
                    <h3 className="font-semibold text-stone-900 mb-4 text-sm">Gastos por categoría</h3>
                    <ResponsiveContainer width="100%" height={Math.max(180, anualData.cats.length * 32)}>
                      <BarChart data={anualData.cats.map(c => ({ name: c.categoria, total: c.total }))} layout="vertical">
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
                )}

                {anualData.medios.filter(m => m.total > 0).length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-stone-100">
                    <h3 className="font-semibold text-stone-900 mb-4 text-sm">Por medio de pago</h3>
                    <ResponsiveContainer width="100%" height={Math.max(120, anualData.medios.filter(m => m.total > 0).length * 36)}>
                      <BarChart data={anualData.medios.filter(m => m.total > 0).map(m => ({ name: m.medio, total: m.total }))} layout="vertical">
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

                {anualData.cats.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-stone-100">
                    <h3 className="font-semibold text-stone-900 mb-4 text-sm">Evolución por categoría</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={MESES_CORTOS.map((mes, i) => {
                        const obj = /** @type {Record<string, any>} */ ({ mes });
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
                )}
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'comparar' && (
          <motion.div key="comparar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
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

            {(loadingExpenses || loadingIncomes) ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-stone-400 animate-spin" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 text-center">
                    <p className="text-xs text-indigo-500 mb-1">{compareData.label1}</p>
                    <p className="text-lg font-bold text-indigo-700">-{fmt(compareData.totGasto1)}</p>
                    <p className="text-xs text-indigo-400 mt-1">{fmtSigned(compareData.bal1)} balance</p>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 text-center">
                    <p className="text-xs text-amber-500 mb-1">{compareData.label2}</p>
                    <p className="text-lg font-bold text-amber-700">-{fmt(compareData.totGasto2)}</p>
                    <p className="text-xs text-amber-400 mt-1">{fmtSigned(compareData.bal2)} balance</p>
                  </div>
                </div>

                {compareData.cats.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-stone-100">
                    <h3 className="font-semibold text-stone-900 mb-4 text-sm">Por categoría</h3>
                    <ResponsiveContainer width="100%" height={Math.max(180, compareData.cats.length * 32)}>
                      <BarChart layout="vertical" data={compareData.cats.map(c => ({ name: c.categoria, [compareData.label1]: c.val1, [compareData.label2]: c.val2 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={85} />
                        <Tooltip formatter={v => [fmt(v), '']} />
                        <Legend />
                        <Bar dataKey={compareData.label1} fill="#6366f1" radius={[0, 4, 4, 0]} />
                        <Bar dataKey={compareData.label2} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {compareData.medios.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-stone-100">
                    <h3 className="font-semibold text-stone-900 mb-4 text-sm">Por medio de pago</h3>
                    <ResponsiveContainer width="100%" height={Math.max(120, compareData.medios.length * 36)}>
                      <BarChart layout="vertical" data={compareData.medios.map(m => ({ name: m.medio, [compareData.label1]: m.val1, [compareData.label2]: m.val2 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={100} />
                        <Tooltip formatter={v => [fmt(v), '']} />
                        <Legend />
                        <Bar dataKey={compareData.label1} fill="#6366f1" radius={[0, 4, 4, 0]} />
                        <Bar dataKey={compareData.label2} fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
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
            onSelect={(y) => setSelectedYear(parseInt(y))}
            onClose={() => setShowYearPicker(false)} />
        )}
        {showCmp1Picker && (
          <ListPicker
            title={compareMode === 'anual' ? 'Año 1' : 'Mes 1'}
            selected={compareMode === 'anual' ? String(compareYear1) : format(comparePeriod1, 'MMMM yyyy', { locale: es })}
            items={compareMode === 'anual' ? availableYears.map(String) : availableMonths.map(d => format(d, 'MMMM yyyy', { locale: es }))}
            onSelect={(val) => {
              if (compareMode === 'anual') { setCompareYear1(parseInt(val)); }
              else {
                const found = availableMonths.find(d => format(d, 'MMMM yyyy', { locale: es }) === val);
                if (found) setComparePeriod1(found);
              }
            }}
            onClose={() => setShowCmp1Picker(false)} />
        )}
        {showCmp2Picker && (
          <ListPicker
            title={compareMode === 'anual' ? 'Año 2' : 'Mes 2'}
            selected={compareMode === 'anual' ? String(compareYear2) : format(comparePeriod2, 'MMMM yyyy', { locale: es })}
            items={compareMode === 'anual' ? availableYears.map(String) : availableMonths.map(d => format(d, 'MMMM yyyy', { locale: es }))}
            onSelect={(val) => {
              if (compareMode === 'anual') { setCompareYear2(parseInt(val)); }
              else {
                const found = availableMonths.find(d => format(d, 'MMMM yyyy', { locale: es }) === val);
                if (found) setComparePeriod2(found);
              }
            }}
            onClose={() => setShowCmp2Picker(false)} />
        )}
      </AnimatePresence>

      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSave={handleExpenseSaved}
      />
      <AddIncomeModal
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        onSave={handleIncomeSaved}
      />
      <AddExpenseModal
        isOpen={!!editingItem && editingItem.tipo === 'Gasto'}
        onClose={() => setEditingItem(null)}
        onSave={handleExpenseEdited}
        initialData={editingItem?.data}
        editId={editingItem?.data?.id}
      />
      <AddIncomeModal
        isOpen={!!editingItem && editingItem.tipo === 'Ingreso'}
        onClose={() => setEditingItem(null)}
        onSave={handleIncomeEdited}
        initialData={editingItem?.data}
        editId={editingItem?.data?.id}
      />
    </div>
  );
}
