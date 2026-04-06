import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AnimatePresence } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Receipt, BarChart3, Calendar, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import CategoryFilter from '@/components/common/CategoryFilter';
import ExpenseCard from '@/components/economy/ExpenseCard';
import AddExpenseModal from '@/components/economy/AddExpenseModal';
import AddIncomeModal from '@/components/economy/AddIncomeModal';
import ExpenseCharts from '@/components/economy/ExpenseCharts';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';

export default function Economy() {
  const [activeTab, setActiveTab] = useState('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const queryClient = useQueryClient();
  useRealtimeQuery('expenses', 'expenses');
  useRealtimeQuery('income', 'income');

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
  });

  const { data: incomes = [], isLoading: loadingIncomes } = useQuery({
    queryKey: ['incomes'],
    queryFn: () => base44.entities.Income.list('-date'),
  });

  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => base44.entities.CustomCategory.list(),
  });

  const expenseCustomCats = customCategories.filter(c => c.type === 'expense');

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const createIncomeMutation = useMutation({
    mutationFn: (data) => base44.entities.Income.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incomes'] }),
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (id) => base44.entities.Income.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incomes'] }),
  });

  // Filter by period
  const periodStart = viewMode === 'monthly' ? startOfMonth(selectedMonth) : startOfYear(selectedMonth);
  const periodEnd = viewMode === 'monthly' ? endOfMonth(selectedMonth) : endOfYear(selectedMonth);
  
  const periodExpenses = expenses.filter(expense => {
    if (!expense.date) return false;
    const expenseDate = parseISO(expense.date);
    return isWithinInterval(expenseDate, { start: periodStart, end: periodEnd });
  });

  const periodIncomes = incomes.filter(income => {
    if (!income.date) return false;
    const incomeDate = parseISO(income.date);
    return isWithinInterval(incomeDate, { start: periodStart, end: periodEnd });
  });

  const filteredExpenses = periodExpenses.filter(expense => 
    categoryFilter === 'all' || expense.category === categoryFilter
  );

  // Calculate totals
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalIncomes = periodIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
  const balance = totalIncomes - totalExpenses;
  const fixedExpenses = periodExpenses.filter(e => e.is_fixed).reduce((sum, e) => sum + (e.amount || 0), 0);

  // Build categories from custom only
  const categoryLabels = {
    all: 'Todos',
    ...Object.fromEntries(expenseCustomCats.map(c => [c.name, `${c.icon} ${c.name}`]))
  };

  const changePeriod = (direction) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'monthly') {
        newDate.setMonth(prev.getMonth() + direction);
      } else {
        newDate.setFullYear(prev.getFullYear() + direction);
      }
      return newDate;
    });
  };

  return (
    <div>
      <PageHeader 
        title="Economía" 
        subtitle="Control de gastos e ingresos"
      />

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('monthly')}
          className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ 
            backgroundColor: viewMode === 'monthly' ? 'var(--theme-primary)' : 'var(--theme-accent)',
            color: viewMode === 'monthly' ? 'var(--theme-card)' : 'var(--theme-muted)'
          }}
        >
          Mensual
        </button>
        <button
          onClick={() => setViewMode('yearly')}
          className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ 
            backgroundColor: viewMode === 'yearly' ? 'var(--theme-primary)' : 'var(--theme-accent)',
            color: viewMode === 'yearly' ? 'var(--theme-card)' : 'var(--theme-muted)'
          }}
        >
          Anual
        </button>
      </div>

      {/* Period Selector - Fixed width */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button
          onClick={() => changePeriod(-1)}
          className="p-2 rounded-xl w-10 h-10 flex items-center justify-center"
          style={{ color: 'var(--theme-text)' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div 
          className="flex items-center gap-2 px-4 py-2 rounded-xl border w-48 justify-center"
          style={{ backgroundColor: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
        >
          <Calendar className="w-4 h-4" style={{ color: 'var(--theme-muted)' }} />
          <span className="font-medium capitalize" style={{ color: 'var(--theme-text)' }}>
            {viewMode === 'monthly' 
              ? format(selectedMonth, 'MMMM yyyy', { locale: es })
              : format(selectedMonth, 'yyyy')
            }
          </span>
        </div>
        <button
          onClick={() => changePeriod(1)}
          className="p-2 rounded-xl w-10 h-10 flex items-center justify-center"
          style={{ color: 'var(--theme-text)' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`rounded-2xl p-4 border ${balance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-sm mb-1 ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Balance</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            ${Math.abs(balance).toLocaleString('es-AR')}
          </p>
          <p className={`text-xs ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {balance >= 0 ? '↑ Positivo' : '↓ Negativo'}
          </p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ backgroundColor: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--theme-muted)' }}>Ingresos</p>
          <p className="text-2xl font-bold text-emerald-600">
            ${totalIncomes.toLocaleString('es-AR')}
          </p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ backgroundColor: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--theme-muted)' }}>Gastos totales</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--theme-text)' }}>
            ${totalExpenses.toLocaleString('es-AR')}
          </p>
        </div>
        <div className="rounded-2xl p-4 border" style={{ backgroundColor: 'var(--theme-accent)', borderColor: 'var(--theme-border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--theme-muted)' }}>Gastos fijos</p>
          <p className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
            ${fixedExpenses.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full p-1 rounded-2xl" style={{ backgroundColor: 'var(--theme-accent)' }}>
          <TabsTrigger 
            value="expenses" 
            className="flex-1 rounded-xl data-[state=active]:shadow-sm"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Gastos
          </TabsTrigger>
          <TabsTrigger 
            value="incomes"
            className="flex-1 rounded-xl data-[state=active]:shadow-sm"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Ingresos
          </TabsTrigger>
          <TabsTrigger 
            value="charts"
            className="flex-1 rounded-xl data-[state=active]:shadow-sm"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Gráficos
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <AnimatePresence mode="wait">
        {activeTab === 'expenses' ? (
          <div key="expenses">
            {/* Category Filters */}
            {expenseCustomCats.length > 0 && (
              <CategoryFilter
                categories={expenseCustomCats.map(c => c.name)}
                selected={categoryFilter}
                onChange={setCategoryFilter}
                labels={categoryLabels}
              />
            )}

            {/* Expenses List */}
            {loadingExpenses ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Sin gastos"
                description="Registrá tus gastos para llevar un mejor control"
                action={
                  <Button onClick={() => setShowAddExpense(true)} className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar gasto
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredExpenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      onDelete={(id) => deleteExpenseMutation.mutate(id)}
                      customCategories={expenseCustomCats}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : activeTab === 'incomes' ? (
          <div key="incomes">
            {loadingIncomes ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : periodIncomes.length === 0 ? (
              <EmptyState
                icon={DollarSign}
                title="Sin ingresos"
                description="Registrá tus ingresos para ver el balance"
                action={
                  <Button onClick={() => setShowAddIncome(true)} className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar ingreso
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {periodIncomes.map((income) => (
                    <motion.div
                      key={income.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{income.description || 'Ingreso'}</p>
                            <p className="text-xs text-stone-500">
                              {income.date && format(parseISO(income.date), "d 'de' MMMM", { locale: es })}
                              {income.is_recurring && ' • Recurrente'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">
                            +${income.amount?.toLocaleString('es-AR')}
                          </span>
                          <button
                            onClick={() => deleteIncomeMutation.mutate(income.id)}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : (
          <div key="charts">
            <ExpenseCharts 
              expenses={periodExpenses} 
              incomes={periodIncomes}
              customCategories={expenseCustomCats}
            />
          </div>
        )}
      </AnimatePresence>

      {/* FABs */}
      <div className="fixed right-4 flex flex-col gap-2 z-40" style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)' }}>
        {activeTab === 'incomes' && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddIncome(true)}
            className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
        {activeTab === 'expenses' && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddExpense(true)}
            className="w-14 h-14 bg-stone-900 text-white rounded-full shadow-lg flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSave={() => {}}
      />
      <AddIncomeModal
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        onSave={(data) => createIncomeMutation.mutate(data)}
      />
    </div>
  );
}