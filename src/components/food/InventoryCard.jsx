import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, AlertCircle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';

export default function InventoryCard({ item, onDelete, customCategories = [] }) {
  const expirationDate = item.expiration_date ? parseISO(item.expiration_date) : null;
  const daysUntilExpiration = expirationDate ? differenceInDays(expirationDate, new Date()) : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 3 && daysUntilExpiration >= 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  // Get category icon from custom categories
  const getCategoryIcon = () => {
    const cat = customCategories.find(c => c.name === item.category);
    return cat?.icon || '📦';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`rounded-2xl p-4 border shadow-sm ${
        isExpired ? 'border-red-200' : isExpiringSoon ? 'border-amber-200' : ''
      }`}
      style={{ 
        backgroundColor: 'var(--theme-card)', 
        borderColor: isExpired ? undefined : isExpiringSoon ? undefined : 'var(--theme-border)' 
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-lg">
          {getCategoryIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate" style={{ color: 'var(--theme-text)' }}>{item.name}</h3>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-muted)' }}>
            <span>{item.quantity} {item.unit}</span>
            {expirationDate && (
              <>
                <span>•</span>
                <span className={isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : ''}>
                  {format(expirationDate, 'dd/MM/yyyy')}
                </span>
              </>
            )}
          </div>
        </div>

        {(isExpiringSoon || isExpired) && (
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <AlertCircle className="w-3 h-3" />
            {isExpired ? 'Vencido' : 'Por vencer'}
          </div>
        )}

        <button
          onClick={() => onDelete(item.id)}
          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}