import React from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pt-safe mb-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--theme-text)' }}>{title}</h1>
          {subtitle && (
            <p className="text-sm mt-1" style={{ color: 'var(--theme-muted)' }}>{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action && action}
          <Link
            to={createPageUrl('Settings')}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--theme-muted)' }}
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}