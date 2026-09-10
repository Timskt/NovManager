// ==============================================================================
// NovManager 前端主应用入口 (App Master Component)
// ==============================================================================

import React, { useState } from 'react';
import { NovelProvider, useNovel } from './context/NovelContext';
import { Header, NavTab } from './components/Header';
import { LibraryView } from './components/library/LibraryView';
import { ArchitectView } from './components/architect/ArchitectView';
import { StudioView } from './components/studio/StudioView';
import { OutlineView } from './components/outline/OutlineView';
import { PlotCanvasView } from './components/canvas/PlotCanvasView';
import { CharacterView } from './components/characters/CharacterView';
import { LoreView } from './components/lore/LoreView';
import { ForeshadowingView } from './components/foreshadowing/ForeshadowingView';
import { McpInspectorView } from './components/mcp/McpInspectorView';
import { SettingsModal } from './components/settings/SettingsModal';
import { MobileBottomNav } from './components/MobileBottomNav';

const AppContent: React.FC = () => {
  const {
    setActiveChapterId,
    setActiveSceneIndex,
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
  } = useNovel();
  const [activeTab, setActiveTab] = useState<NavTab>('STUDIO');

  const handleJumpToStudio = (chapterId: string, sceneIndex: number) => {
    setActiveChapterId(chapterId);
    setActiveSceneIndex(sceneIndex);
    setActiveTab('STUDIO');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-600/30 selection:text-indigo-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={openSettingsModal}
      />

      <div className="flex-1 flex overflow-hidden pb-16 md:pb-0">
        {activeTab === 'LIBRARY' && <LibraryView onNavigateTab={setActiveTab} />}
        {activeTab === 'ARCHITECT' && <ArchitectView onNavigateTab={setActiveTab} />}
        {activeTab === 'STUDIO' && <StudioView onNavigateTab={setActiveTab} />}
        {activeTab === 'OUTLINES' && (
          <StudioView onNavigateTab={setActiveTab} />
        )}
        {activeTab === 'CANVAS' && (
          <StudioView onNavigateTab={setActiveTab} defaultStudioTab="canvas" />
        )}
        {activeTab === 'CHARACTERS' && <CharacterView />}
        {activeTab === 'LORE' && <LoreView />}
        {activeTab === 'FORESHADOWING' && <ForeshadowingView />}
        {activeTab === 'MCP' && <McpInspectorView />}
      </div>

      {/* 移动端底部专用原生触控导航 */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
      />
    </div>
  );
};

export function App() {
  return (
    <NovelProvider>
      <AppContent />
    </NovelProvider>
  );
}

export default App;
