import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, CreditCard, Repeat } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExpenseCard({ expense, onDelete, customCategories = [] }) {
  // Get category info
  const getCategoryInfo = () => {
    const custom = customCategories.find(c => c.name === expense.category);
    if (custom) {
      return {
        icon: custom.icon,
        colorClass: 'bg-stone-100 text-stone-700'
      };
    }
    return {
      icon: '📦',
      colorClass: 'bg-stone-100 text-stone-700'
    };
  };

  const categoryInfo = getCategoryInfo();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="rounded-2xl p-4 border shadow-sm"
      style={{ backgroundColor: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${categoryInfo.colorClass.split(' ')[0]}`}>
          {categoryInfo.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: 'var(--theme-text)' }}>
                {expense.description || expense.category}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-stone-500 flex-wrap">
                <span>
                  {expense.date && format(parseISO(expense.date), "d 'de' MMM", { locale: es })}
                </span>
                {expense.payment_method && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {expense.payment_method}
                    </span>
                  </>
                )}
                {expense.is_fixed && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-violet-600">
                      <Repeat className="w-3 h-3" />
                      Recurrente
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-bold" style={{ color: 'var(--theme-text)' }}>
                ${expense.amount?.toLocaleString('es-AR')}
              </span>
              <button
                onClick={() => onDelete(expense.id)}
                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}