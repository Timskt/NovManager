// ==============================================================================
// 移动端专用底部原生触控导航栏 (Mobile Bottom Navigation Bar)
// 仅在 <1024px (lg:hidden) 移动/平板竖屏下启用，避免桌面窗口缩小时挡住工作台底部内容
// ==============================================================================

import React from 'react';
import { NavTab } from './Header';
import {
  Library,
  Feather,
  Rocket,
  MessageSquare,
  Layers,
  ShieldCheck,
  Cpu,
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
    { id: 'STUDIO', label: '创作台', icon: <Feather className="w-4 h-4" /> },
    { id: 'AUTOPILOT', label: '自动码字', icon: <Rocket className="w-4 h-4" /> },
    { id: 'SPARK_HUB', label: '灵感读者', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'SKILL_VAULT', label: '技能中心', icon: <Layers className="w-4 h-4" /> },
    { id: 'MEMORY_GUARD', label: '防幻觉', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'MODEL_HUB', label: '多模型', icon: <Cpu className="w-4 h-4" /> },
    { id: 'LIBRARY', label: '作品库', icon: <Library className="w-4 h-4" /> },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t flex items-center justify-around overflow-x-auto py-1 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] shadow-xl font-literary-sans backdrop-blur-md"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 min-w-[48px] py-1 transition-all rounded-lg ${
              isActive ? 'font-bold scale-105' : 'opacity-65 hover:opacity-100'
            }`}
            style={isActive ? { color: 'var(--accent-primary)' } : undefined}
          >
            <div
              className={`p-1 rounded-xl transition ${
                isActive ? 'shadow-2xs' : ''
              }`}
              style={isActive ? { backgroundColor: 'var(--bg-card)' } : undefined}
            >
              {tab.icon}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
