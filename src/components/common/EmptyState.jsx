import React from 'react';
import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-stone-400" />
      </div>
      <h3 className="text-lg font-semibold text-stone-900 mb-1">{title}</h3>
      <p className="text-sm text-stone-500 text-center mb-6">{description}</p>
      {action && action}
    </motion.div>
  );
}