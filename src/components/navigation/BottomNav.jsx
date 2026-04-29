import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UtensilsCrossed, ShoppingCart, CalendarCheck, Wallet } from 'lucide-react';

const navItems = [
  { name: 'Comida', icon: UtensilsCrossed, page: 'Food' },
  { name: 'Compras', icon: ShoppingCart, page: 'Shopping' },
  { name: 'Organización', icon: CalendarCheck, page: 'Organization' },
  { name: 'Economía', icon: Wallet, page: 'Economy' },
];

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav 
      className="fixed left-0 right-0 z-[9999]"
      style={{ 
        bottom: 0,
        backgroundColor: 'var(--theme-card, #FFFFFF)',
        borderTop: '1px solid var(--theme-border, #e7e5e4)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)'
      }}
    >
      <div className="max-w-lg mx-auto px-2">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const isActive = currentPath.includes(item.page);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                className="flex flex-col items-center justify-center flex-1"
              >
                <div
                  className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-colors ${
                    isActive ? 'theme-primary' : ''
                  }`}
                  style={isActive ? { backgroundColor: 'var(--theme-primary)' } : {}}
                >
                  <Icon 
                    className={`w-5 h-5 transition-colors`}
                    style={{ color: isActive ? 'var(--theme-card)' : 'var(--theme-muted)' }}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span 
                    className="text-[10px] mt-0.5 font-medium transition-colors"
                    style={{ color: isActive ? 'var(--theme-card)' : 'var(--theme-muted)' }}
                  >
                    {item.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}