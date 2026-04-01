import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend } from 'recharts';
import { Plus, Settings2, GripVertical, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const COLORS = ['#E07A5F', '#81B29A', '#F4A261', '#264653', '#E9C46A', '#2A9D8F', '#E76F51', '#457B9D'];

const CHART_TYPES = [
  { value: 'pie', label: 'Torta' },
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Líneas' },
  { value: 'area', label: 'Área' },
];

const DATA_SOURCES = [
  { value: 'expenses_by_category', label: 'Gastos por categoría' },
  { value: 'expenses_vs_income', label: 'Gastos vs Ingresos' },
  { value: 'expenses_by_payment', label: 'Gastos por método de pago' },
];

const DEFAULT_CATEGORY_LABELS = {
  alimentos: '🍽️ Alimentos',
  servicios: '💡 Servicios',
  transporte: '🚗 Transporte',
  entretenimiento: '🎬 Entretenimiento',
  salud: '💊 Salud',
  hogar: '🏠 Hogar',
  otros: '📦 Otros',
};

export default function ExpenseCharts({ expenses, incomes, customCategories = [] }) {
  const [showAddChart, setShowAddChart] = useState(false);
  const [newChart, setNewChart] = useState({
    name: '',
    type: 'pie',
    data_source: 'expenses_by_category',
  });

  const queryClient = useQueryClient();

  const { data: chartConfigs = [] } = useQuery({
    queryKey: ['chart-configs'],
    queryFn: () => base44.entities.ChartConfig.list('order'),
  });

  const createChartMutation = useMutation({
    mutationFn: (data) => base44.entities.ChartConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-configs'] });
      setShowAddChart(false);
      setNewChart({ name: '', type: 'pie', data_source: 'expenses_by_category' });
    },
  });

  const updateChartMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChartConfig.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chart-configs'] }),
  });

  const deleteChartMutation = useMutation({
    mutationFn: (id) => base44.entities.ChartConfig.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chart-configs'] }),
  });

  // Build category labels
  const categoryLabels = {
    ...DEFAULT_CATEGORY_LABELS,
    ...Object.fromEntries(customCategories.map(c => [c.name, `${c.icon} ${c.name}`]))
  };

  // Prepare data for charts
  const getCategoryData = () => {
    const grouped = {};
    expenses.forEach(expense => {
      const cat = expense.category || 'otros';
      grouped[cat] = (grouped[cat] || 0) + (expense.amount || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({
      name: categoryLabels[name] || name,
      value: Math.round(value),
    }));
  };

  const getPaymentData = () => {
    const grouped = {};
    expenses.forEach(expense => {
      const method = expense.payment_method || 'otros';
      grouped[method] = (grouped[method] || 0) + (expense.amount || 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Math.round(value),
    }));
  };

  const getComparisonData = () => {
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalIncomes = incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    return [
      { name: 'Ingresos', value: Math.round(totalIncomes), fill: '#81B29A' },
      { name: 'Gastos', value: Math.round(totalExpenses), fill: '#E07A5F' },
    ];
  };

  const getChartData = (source) => {
    switch (source) {
      case 'expenses_by_category': return getCategoryData();
      case 'expenses_by_payment': return getPaymentData();
      case 'expenses_vs_income': return getComparisonData();
      default: return getCategoryData();
    }
  };

  const renderChart = (config) => {
    const data = getChartData(config.data_source);
    
    if (data.length === 0) {
      return (
        <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
          Sin datos para mostrar
        </div>
      );
    }

    switch (config.type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR')}`} />
            </PieChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR')}`} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR')}`} />
              <Line type="monotone" dataKey="value" stroke="#E07A5F" strokeWidth={2} dot={{ fill: '#E07A5F' }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR')}`} />
              <Area type="monotone" dataKey="value" stroke="#81B29A" fill="#81B29A" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // Default charts if none configured
  const defaultCharts = [
    { id: 'default-1', name: 'Gastos por categoría', type: 'pie', data_source: 'expenses_by_category', is_visible: true },
    { id: 'default-2', name: 'Ingresos vs Gastos', type: 'bar', data_source: 'expenses_vs_income', is_visible: true },
  ];

  const visibleCharts = chartConfigs.length > 0 
    ? chartConfigs.filter(c => c.is_visible !== false)
    : defaultCharts;

  return (
    <div className="space-y-4">
      {/* Charts */}
      {visibleCharts.map((config) => (
        <div key={config.id} className="bg-white rounded-2xl p-4 border border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-stone-900">{config.name}</h3>
            {config.id.startsWith('default-') ? null : (
              <div className="flex gap-1">
                <button
                  onClick={() => updateChartMutation.mutate({ 
                    id: config.id, 
                    data: { is_visible: false } 
                  })}
                  className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteChartMutation.mutate(config.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {renderChart(config)}
          
          {/* Legend for pie charts */}
          {config.type === 'pie' && (
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {getChartData(config.data_source).map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.fill || COLORS[index % COLORS.length] }}
                  />
                  <span className="text-stone-600">{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add Chart Button */}
      <Button
        variant="outline"
        onClick={() => setShowAddChart(true)}
        className="w-full rounded-xl border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Agregar gráfico
      </Button>

      {/* Hidden charts */}
      {chartConfigs.filter(c => c.is_visible === false).length > 0 && (
        <div className="bg-stone-50 rounded-xl p-3">
          <p className="text-xs text-stone-500 mb-2">Gráficos ocultos:</p>
          <div className="flex flex-wrap gap-2">
            {chartConfigs.filter(c => c.is_visible === false).map(config => (
              <button
                key={config.id}
                onClick={() => updateChartMutation.mutate({ id: config.id, data: { is_visible: true } })}
                className="text-xs px-2 py-1 bg-white rounded-lg border border-stone-200 hover:border-stone-300 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                {config.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Chart Dialog */}
      <Dialog open={showAddChart} onOpenChange={setShowAddChart}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo gráfico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={newChart.name}
                onChange={(e) => setNewChart({ ...newChart, name: e.target.value })}
                placeholder="Ej: Mi gráfico"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de gráfico</Label>
              <Select
                value={newChart.type}
                onValueChange={(v) => setNewChart({ ...newChart, type: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Datos a mostrar</Label>
              <Select
                value={newChart.data_source}
                onValueChange={(v) => setNewChart({ ...newChart, data_source: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => createChartMutation.mutate({
                ...newChart,
                is_visible: true,
                order: chartConfigs.length,
              })}
              disabled={!newChart.name}
              className="w-full rounded-xl bg-stone-900"
            >
              Crear gráfico
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}