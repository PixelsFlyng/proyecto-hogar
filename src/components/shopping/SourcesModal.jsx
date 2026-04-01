import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag } from 'lucide-react';

export default function SourcesModal({ isOpen, onClose, item }) {
  if (!isOpen || !item) return null;
  
  const sources = item.sources || ['Manual'];
  const nonManualSources = sources.filter(s => s !== 'Manual');
  const manualCount = sources.filter(s => s === 'Manual').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl z-50 w-[90%] max-w-sm p-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900">Fuentes de "{item.name}"</h3>
              <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {nonManualSources.map((source, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl"
                >
                  <Tag className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-700">{source}</span>
                </div>
              ))}
              {manualCount > 0 && (
                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                  <Tag className="w-4 h-4 text-stone-400" />
                  <span className="text-sm text-stone-600">
                    Agregado manualmente {manualCount > 1 ? `(${manualCount}x)` : ''}
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-xs text-stone-400 mt-3 text-center">
              Cantidad total: {item.quantity || 1} {item.unit || 'unidades'}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}