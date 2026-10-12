// ==============================================================================
// NovManager 前端主应用入口 (App Master Component)
// 彻底去除 AI 模版气味，搭载人文文学主题引擎、全局穿梭 Omnibar 与 20+ 重磅创作功能
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { NovelProvider, useNovel } from './context/NovelContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Header, NavTab } from './components/Header';
import { LibraryView } from './components/library/LibraryView';
import { ArchitectView } from './components/architect/ArchitectView';
import { StudioView } from './components/studio/StudioView';
import { CharacterView } from './components/characters/CharacterView';
import { CharacterRelationGraph } from './components/characters/CharacterRelationGraph';
import { TimelineMatrixView } from './components/timeline/TimelineMatrixView';
import { TensionCurveView } from './components/analytics/TensionCurveView';
import { ForeshadowingRadar } from './components/foreshadowing/ForeshadowingRadar';
import { WorldMapView } from './components/lore/WorldMapView';
import { WhatIfSandboxView } from './components/sandbox/WhatIfSandboxView';
import { SelfIterationView } from './components/evolution/SelfIterationView';
import { ProductivityHeatmap } from './components/analytics/ProductivityHeatmap';
import { GoldenThreeChaptersClinic } from './components/analytics/GoldenThreeChaptersClinic';
import { WorkflowPluginHub } from './components/plugins/WorkflowPluginHub';
import { LoreView } from './components/lore/LoreView';
import { McpInspectorView } from './components/mcp/McpInspectorView';
import { SettingsModal } from './components/settings/SettingsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CommandPalette } from './components/common/CommandPalette';
import { ZenFocusModal } from './components/studio/ZenFocusModal';
import { PublishingStudioModal } from './components/export/PublishingStudioModal';
import { VideoStoryboardStudio } from './components/video/VideoStoryboardStudio';
import { WorkflowOrchestratorView } from './components/workflow/WorkflowOrchestratorView';
import { ProgressPulseView } from './components/narrative/ProgressPulseView';
import { DungeonArcTrajectoryView } from './components/narrative/DungeonArcTrajectoryView';
import { GodsEyeViewModal } from './components/narrative/GodsEyeViewModal';
import { InSceneCharactersDrawer } from './components/narrative/InSceneCharactersDrawer';

const AppContent: React.FC = () => {
  const {
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
  } = useNovel();
  const [activeTab, setActiveTab] = useState<NavTab>('STUDIO');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isZenOpen, setIsZenOpen] = useState(false);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [isGodsEyeOpen, setIsGodsEyeOpen] = useState(false);
  const [isInSceneOpen, setIsInSceneOpen] = useState(false);

  // 全局 Cmd+K / Ctrl+K 监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col selection:bg-amber-500/25 transition-colors"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-main)',
      }}
    >
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={openSettingsModal}
        onOpenZen={() => setIsZenOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenExportStudio={() => setIsExportStudioOpen(true)}
        onOpenGodsEye={() => setIsGodsEyeOpen(true)}
        onOpenInScene={() => setIsInSceneOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden pb-16 md:pb-0">
        {activeTab === 'LIBRARY' && <LibraryView onNavigateTab={setActiveTab} />}
        {activeTab === 'ARCHITECT' && <ArchitectView onNavigateTab={setActiveTab} />}
        {activeTab === 'STUDIO' && <StudioView onNavigateTab={setActiveTab} />}
        {activeTab === 'OUTLINES' && <StudioView onNavigateTab={setActiveTab} />}
        {activeTab === 'CANVAS' && (
          <StudioView onNavigateTab={setActiveTab} defaultStudioTab="canvas" />
        )}
        {activeTab === 'VIDEO_STUDIO' && <VideoStoryboardStudio />}
        {activeTab === 'WORKFLOW' && <WorkflowOrchestratorView />}
        {activeTab === 'PROGRESS_PULSE' && <ProgressPulseView onNavigateTab={setActiveTab} />}
        {activeTab === 'DUNGEONS' && <DungeonArcTrajectoryView />}
        {activeTab === 'CHARACTERS' && <CharacterView />}
        {activeTab === 'RELATIONS' && <CharacterRelationGraph />}
        {activeTab === 'TIMELINE' && <TimelineMatrixView onNavigateTab={setActiveTab} />}
        {activeTab === 'TENSION' && <TensionCurveView onNavigateTab={setActiveTab} />}
        {activeTab === 'FORESHADOWING' && <ForeshadowingRadar onNavigateTab={setActiveTab} />}
        {activeTab === 'MAP' && <WorldMapView />}
        {activeTab === 'SANDBOX' && <WhatIfSandboxView />}
        {activeTab === 'EVOLUTION' && <SelfIterationView />}
        {activeTab === 'PRODUCTIVITY' && <ProductivityHeatmap />}
        {activeTab === 'CLINIC' && <GoldenThreeChaptersClinic />}
        {activeTab === 'PLUGINS' && <WorkflowPluginHub />}
        {activeTab === 'LORE' && <LoreView />}
        {activeTab === 'MCP' && <McpInspectorView />}
      </div>

      {/* 移动端底部原生触控导航 */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 模型配置弹窗 */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
      />

      {/* 全局穿梭指挥官 (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={setActiveTab}
        onOpenZen={() => setIsZenOpen(true)}
        onOpenExport={() => setIsExportStudioOpen(true)}
        onOpenGraph={() => setActiveTab('RELATIONS')}
        onOpenTension={() => setActiveTab('TENSION')}
        onOpenSelfIteration={() => setActiveTab('EVOLUTION')}
        onOpenGodsEye={() => setIsGodsEyeOpen(true)}
        onOpenInScene={() => setIsInSceneOpen(true)}
      />

      {/* 作家禅定专注模式 */}
      <ZenFocusModal
        isOpen={isZenOpen}
        onClose={() => setIsZenOpen(false)}
      />

      {/* 出版级排版导出工坊 */}
      <PublishingStudioModal
        isOpen={isExportStudioOpen}
        onClose={() => setIsExportStudioOpen(false)}
      />

      {/* 宏观全景上帝视角 HUD */}
      <GodsEyeViewModal
        isOpen={isGodsEyeOpen}
        onClose={() => setIsGodsEyeOpen(false)}
      />

      {/* 当前场次登场人物心境与暗线抽屉 */}
      <InSceneCharactersDrawer
        isOpen={isInSceneOpen}
        onClose={() => setIsInSceneOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <NovelProvider>
        <AppContent />
      </NovelProvider>
    </ThemeProvider>
  );
}

export default App;
