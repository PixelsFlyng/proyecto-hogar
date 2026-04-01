import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const categoryColors = {
  alimentos: '#10B981',
  servicios: '#F59E0B',
  transporte: '#3B82F6',
  entretenimiento: '#EC4899',
  salud: '#EF4444',
  hogar: '#8B5CF6',
  otros: '#78716C',
};

const categoryLabels = {
  alimentos: 'Alimentos',
  servicios: 'Servicios',
  transporte: 'Transporte',
  entretenimiento: 'Entretenimiento',
  salud: 'Salud',
  hogar: 'Hogar',
  otros: 'Otros',
};

export default function ExpenseChart({ expenses, type = 'pie' }) {
  // Group by category
  const categoryTotals = expenses.reduce((acc, expense) => {
    const cat = expense.category || 'otros';
    acc[cat] = (acc[cat] || 0) + expense.amount;
    return acc;
  }, {});

  const chartData = Object.entries(categoryTotals)
    .map(([category, total]) => ({
      name: categoryLabels[category] || category,
      value: total,
      color: categoryColors[category] || '#78716C',
    }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (type === 'pie') {
    return (
      <div className="bg-white rounded-2xl p-4 border border-stone-100">
        <h3 className="font-semibold text-stone-900 mb-4">Distribución de gastos</h3>
        
        {chartData.length === 0 ? (
          <p className="text-center text-stone-500 py-8">Sin datos para mostrar</p>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-4">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-stone-600">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-stone-900">
                      ${item.value.toLocaleString('es-AR')}
                    </span>
                    <span className="text-xs text-stone-400 ml-2">
                      ({Math.round((item.value / total) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100">
      <h3 className="font-semibold text-stone-900 mb-4">Gastos por categoría</h3>
      
      {chartData.length === 0 ? (
        <p className="text-center text-stone-500 py-8">Sin datos para mostrar</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fontSize: 12, fill: '#78716C' }}
              />
              <Tooltip
                formatter={(value) => [`$${value.toLocaleString('es-AR')}`, 'Total']}
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}