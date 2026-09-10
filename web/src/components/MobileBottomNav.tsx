// ==============================================================================
// 移动端专用底部原生触控导航栏 (Mobile Bottom Navigation Bar)
// 适配手机竖屏握持单手大拇指触控，带 safe-area 自动避让
// ==============================================================================

import React from 'react';
import { NavTab } from './Header';
import {
  Library,
  Wand2,
  Feather,
  Compass,
  Users,
  Sparkles,
  Radar,
  Cable,
  GitFork,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'LIBRARY', label: '书库', icon: <Library className="w-4 h-4" /> },
    { id: 'ARCHITECT', label: '创世', icon: <Wand2 className="w-4 h-4 text-amber-300" /> },
    { id: 'STUDIO', label: '创作', icon: <Feather className="w-4 h-4" /> },
    { id: 'CHARACTERS', label: '人物', icon: <Users className="w-4 h-4" /> },
    { id: 'LORE', label: '设定', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'FORESHADOWING', label: '伏笔', icon: <Radar className="w-4 h-4" /> },
    { id: 'MCP', label: 'MCP', icon: <Cable className="w-4 h-4" /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 flex items-center justify-around overflow-x-auto py-1 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 min-w-[44px] py-1 transition-all rounded-lg ${
              isActive
                ? 'text-indigo-400 font-semibold scale-105'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className={`relative p-1 rounded-xl transition ${isActive ? 'bg-indigo-950/60 border border-indigo-700/50' : ''}`}>
              {tab.icon}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
