import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '@/components/navigation/BottomNav';

const THEMES = {
  light: { bg: '#F5F5F4', primary: '#292524', accent: '#FFFFFF', text: '#1c1917', card: '#FFFFFF', border: '#e7e5e4', muted: '#78716c' },
  dark: { bg: '#1C1917', primary: '#F5F5F4', accent: '#292524', text: '#f5f5f4', card: '#292524', border: '#44403c', muted: '#a8a29e' },
  coral: { bg: '#FFF5F3', primary: '#E07A5F', accent: '#FECDD3', text: '#1c1917', card: '#FFFFFF', border: '#fecdd3', muted: '#9a8478' },
  sage: { bg: '#F0FDF4', primary: '#81B29A', accent: '#BBF7D0', text: '#1c1917', card: '#FFFFFF', border: '#bbf7d0', muted: '#6b8f7a' },
  ocean: { bg: '#EFF6FF', primary: '#3B82F6', accent: '#BFDBFE', text: '#1c1917', card: '#FFFFFF', border: '#bfdbfe', muted: '#6b7f99' },
  sunset: { bg: '#FFF7ED', primary: '#F97316', accent: '#FED7AA', text: '#1c1917', card: '#FFFFFF', border: '#fed7aa', muted: '#9a7a5c' },
};

const PAGES = ['Food', 'Shopping', 'Organization', 'Economy'];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  
  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const list = await base44.entities.AppSettings.list();
      return list[0] || null;
    },
  });

  const currentPageIndex = PAGES.indexOf(currentPageName);
  const isMainPage = currentPageIndex !== -1;

  useEffect(() => {
    const theme = THEMES[settings?.theme] || THEMES.light;
    document.documentElement.style.setProperty('--theme-bg', theme.bg);
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    document.documentElement.style.setProperty('--theme-text', theme.text);
    document.documentElement.style.setProperty('--theme-card', theme.card);
    document.documentElement.style.setProperty('--theme-border', theme.border);
    document.documentElement.style.setProperty('--theme-muted', theme.muted);
  }, [settings?.theme]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!isMainPage) return;
    
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    const horizontalThreshold = 80;
    
    // Only trigger if horizontal movement is dominant (ratio > 2:1) and exceeds threshold
    if (Math.abs(diffX) > horizontalThreshold && Math.abs(diffX) > Math.abs(diffY) * 2) {
      if (diffX > 0 && currentPageIndex < PAGES.length - 1) {
        navigate(createPageUrl(PAGES[currentPageIndex + 1]));
      } else if (diffX < 0 && currentPageIndex > 0) {
        navigate(createPageUrl(PAGES[currentPageIndex - 1]));
      }
    }
    
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  };

  return (
    <div 
      className="min-h-screen transition-colors duration-300 overflow-x-hidden"
      style={{ 
        backgroundColor: 'var(--theme-bg, #F5F5F4)',
        color: 'var(--theme-text, #1c1917)'
      }}
      onTouchStart={isMainPage ? handleTouchStart : undefined}
      onTouchMove={isMainPage ? handleTouchMove : undefined}
      onTouchEnd={isMainPage ? handleTouchEnd : undefined}
    >
      <style>{`
        :root {
          --color-coral: #E07A5F;
          --color-sage: #81B29A;
          --color-terracotta: #C9A78E;
          --color-sand: #F4F1DE;
          --safe-area-inset-top: env(safe-area-inset-top);
          --safe-area-inset-bottom: env(safe-area-inset-bottom);
          --theme-bg: #F5F5F4;
          --theme-primary: #292524;
          --theme-accent: #FFFFFF;
          --theme-text: #1c1917;
          --theme-card: #FFFFFF;
          --theme-border: #e7e5e4;
          --theme-muted: #78716c;
        }
        
        .pt-safe {
          padding-top: max(env(safe-area-inset-top), 16px);
        }
        
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        .pb-safe {
          padding-bottom: max(env(safe-area-inset-bottom), 8px);
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .touch-pan-x {
          touch-action: pan-x;
        }

        .touch-pan-y {
          touch-action: pan-y;
        }
        
        /* Theme-aware components */
        .theme-card {
          background-color: var(--theme-card);
          border-color: var(--theme-border);
        }
        
        .theme-text {
          color: var(--theme-text);
        }
        
        .theme-muted {
          color: var(--theme-muted);
        }
        
        .theme-primary {
          background-color: var(--theme-primary);
        }
        
        .theme-primary-text {
          color: var(--theme-primary);
        }
        
        .theme-accent {
          background-color: var(--theme-accent);
        }
        
        .theme-border {
          border-color: var(--theme-border);
        }
      `}</style>
      
      <main className="px-4 max-w-lg mx-auto pb-28 min-h-[calc(100vh-7rem)]">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
}