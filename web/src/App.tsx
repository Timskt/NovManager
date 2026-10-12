// ==============================================================================
// NovManager 前端主应用入口 (App Master Component)
// 搭载人文文学主题引擎、URL Hash 深度路由、多标签工作区导航栏、
// 四级记忆与防幻觉中枢、全局穿梭 Omnibar 与全链路跨视图跳转体系
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { NovelProvider, useNovel } from './context/NovelContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header, NavTab, DOMAIN_GROUPS, getNavItemMeta } from './components/Header';
import { WorkspaceTabBar, WORKSPACE_PRESETS } from './components/common/WorkspaceTabBar';
import { CrossViewTeleportPayload, WorkspacePresetId } from './types/novel';
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
import { ModelHubView } from './components/models/ModelHubView';
import { StyleDnaStudioView } from './components/style/StyleDnaStudioView';
import { GenesisView } from './components/genesis/GenesisView';
import { GodsEyeSandboxView } from './components/sandbox/GodsEyeSandboxView';
import { AutopilotCockpitView } from './components/autopilot/AutopilotCockpitView';
import { SparkAndReaderHubView } from './components/sparks/SparkAndReaderHubView';
import { CentralSkillVaultView } from './components/skills/CentralSkillVaultView';
import { FloatingSparkCapsule } from './components/sparks/FloatingSparkCapsule';
import { MemoryTokenAntiHallucinationView } from './components/memory/MemoryTokenAntiHallucinationView';

const ALL_VALID_TABS: Set<string> = new Set(
  DOMAIN_GROUPS.flatMap((g) => g.items.map((i) => i.id)).concat(['OUTLINES'])
);

function parseTabFromHash(): NavTab {
  if (typeof window === 'undefined') return 'STUDIO';
  const raw = window.location.hash.replace(/^#\/?/, '').trim().toUpperCase().replace(/-/g, '_');
  if (raw && ALL_VALID_TABS.has(raw)) {
    return raw as NavTab;
  }
  return 'STUDIO';
}

function formatTabToHash(tab: NavTab): string {
  return `#${tab.toLowerCase().replace(/_/g, '-')}`;
}

const DEFAULT_PINNED_TABS: NavTab[] = [
  'STUDIO',
  'AUTOPILOT',
  'SPARK_HUB',
  'SKILL_VAULT',
  'MEMORY_GUARD',
];

const AppContent: React.FC = () => {
  const {
    isSettingsModalOpen,
    openSettingsModal,
    closeSettingsModal,
  } = useNovel();

  const initialTab = parseTabFromHash();
  const [activeTab, setActiveTabState] = useState<NavTab>(initialTab);
  const [historyStack, setHistoryStack] = useState<NavTab[]>([initialTab]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [teleportContext, setTeleportContext] = useState<CrossViewTeleportPayload | null>(null);

  const [pinnedTabs, setPinnedTabs] = useState<NavTab[]>(DEFAULT_PINNED_TABS);
  const [openTabs, setOpenTabs] = useState<NavTab[]>(() => {
    const base = [...DEFAULT_PINNED_TABS];
    if (!base.includes(initialTab)) base.push(initialTab);
    return base;
  });

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isZenOpen, setIsZenOpen] = useState(false);
  const [isExportStudioOpen, setIsExportStudioOpen] = useState(false);
  const [isGodsEyeOpen, setIsGodsEyeOpen] = useState(false);
  const [isInSceneOpen, setIsInSceneOpen] = useState(false);

  // Unified navigation handler with history stack + open tab dock + URL hash sync + teleport payload
  const navigateToTab = useCallback(
    (
      nextTab: NavTab,
      optionsOrPayload?: { skipHistoryPush?: boolean } | CrossViewTeleportPayload
    ) => {
      setActiveTabState(nextTab);
      setOpenTabs((prev) => (prev.includes(nextTab) ? prev : [...prev, nextTab]));

      if (optionsOrPayload && 'targetTab' in optionsOrPayload) {
        setTeleportContext(optionsOrPayload);
      }

      const skipHistoryPush =
        optionsOrPayload && 'skipHistoryPush' in optionsOrPayload
          ? optionsOrPayload.skipHistoryPush
          : false;

      if (!skipHistoryPush) {
        setHistoryStack((prev) => {
          const sliced = prev.slice(0, historyIndex + 1);
          if (sliced[sliced.length - 1] === nextTab) return sliced;
          const nextStack = [...sliced, nextTab];
          setHistoryIndex(nextStack.length - 1);
          return nextStack;
        });

        const nextHash = formatTabToHash(nextTab);
        if (typeof window !== 'undefined' && window.location.hash !== nextHash) {
          window.history.pushState({ tab: nextTab }, '', nextHash);
        }
      }
    },
    [historyIndex]
  );

  const handleApplyPreset = useCallback(
    (presetId: WorkspacePresetId) => {
      const preset = WORKSPACE_PRESETS[presetId];
      if (!preset) return;
      setPinnedTabs(preset.tabs);
      setOpenTabs(preset.tabs);
      navigateToTab(preset.defaultTab);
    },
    [navigateToTab]
  );

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyStack.length - 1;

  const handleGoBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIdx = historyIndex - 1;
    const targetTab = historyStack[prevIdx];
    setHistoryIndex(prevIdx);
    setActiveTabState(targetTab);
    setOpenTabs((prev) => (prev.includes(targetTab) ? prev : [...prev, targetTab]));
    const nextHash = formatTabToHash(targetTab);
    if (typeof window !== 'undefined' && window.location.hash !== nextHash) {
      window.history.replaceState({ tab: targetTab }, '', nextHash);
    }
  }, [historyIndex, historyStack]);

  const handleGoForward = useCallback(() => {
    if (historyIndex >= historyStack.length - 1) return;
    const nextIdx = historyIndex + 1;
    const targetTab = historyStack[nextIdx];
    setHistoryIndex(nextIdx);
    setActiveTabState(targetTab);
    setOpenTabs((prev) => (prev.includes(targetTab) ? prev : [...prev, targetTab]));
    const nextHash = formatTabToHash(targetTab);
    if (typeof window !== 'undefined' && window.location.hash !== nextHash) {
      window.history.replaceState({ tab: targetTab }, '', nextHash);
    }
  }, [historyIndex, historyStack]);

  const handleCloseTab = useCallback(
    (tabToClose: NavTab, e: React.MouseEvent) => {
      e.stopPropagation();
      if (pinnedTabs.includes(tabToClose)) return;
      setOpenTabs((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.indexOf(tabToClose);
        const nextList = prev.filter((t) => t !== tabToClose);
        if (tabToClose === activeTab) {
          const fallbackTab = nextList[Math.max(0, idx - 1)] || 'STUDIO';
          navigateToTab(fallbackTab);
        }
        return nextList;
      });
    },
    [pinnedTabs, activeTab, navigateToTab]
  );

  const handleTogglePinTab = useCallback((tabToPin: NavTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedTabs((prev) =>
      prev.includes(tabToPin) ? prev.filter((t) => t !== tabToPin) : [...prev, tabToPin]
    );
  }, []);

  // Listen to browser Back/Forward / hashchange
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseTabFromHash();
      if (parsed !== activeTab) {
        navigateToTab(parsed, { skipHistoryPush: true });
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [activeTab, navigateToTab]);

  // Global keyboard shortcuts: Cmd+K (Command Palette), Alt+Left (Back), Alt+Right (Forward), Alt+1..9 (Tab Quick-Dial)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoForward();
      } else if (e.altKey && /^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (openTabs[idx]) {
          e.preventDefault();
          navigateToTab(openTabs[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGoBack, handleGoForward, openTabs, navigateToTab]);

  const previousTabTitle = canGoBack
    ? getNavItemMeta(historyStack[historyIndex - 1]).item?.title
    : undefined;
  const nextTabTitle = canGoForward
    ? getNavItemMeta(historyStack[historyIndex + 1]).item?.title
    : undefined;

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
        setActiveTab={navigateToTab}
        onOpenSettings={openSettingsModal}
        onOpenZen={() => setIsZenOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenExportStudio={() => setIsExportStudioOpen(true)}
        onOpenGodsEye={() => setIsGodsEyeOpen(true)}
        onOpenInScene={() => setIsInSceneOpen(true)}
      />

      {/* 多标签工作区导航栏 + 历史后退/前进 + 跨视图章节切换面包屑 + 实时记忆防幻觉胶囊 */}
      <WorkspaceTabBar
        activeTab={activeTab}
        openTabs={openTabs}
        pinnedTabs={pinnedTabs}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        previousTabTitle={previousTabTitle}
        nextTabTitle={nextTabTitle}
        teleportContext={teleportContext}
        onClearTeleportContext={() => setTeleportContext(null)}
        onApplyPreset={handleApplyPreset}
        onSelectTab={navigateToTab}
        onCloseTab={handleCloseTab}
        onTogglePinTab={handleTogglePinTab}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
      />

      <div className="flex-1 flex overflow-hidden pb-16 md:pb-0">
        {activeTab === 'LIBRARY' && <LibraryView onNavigateTab={navigateToTab} />}
        {activeTab === 'ARCHITECT' && <ArchitectView onNavigateTab={navigateToTab} />}
        {activeTab === 'STUDIO' && <StudioView onNavigateTab={navigateToTab} />}
        {activeTab === 'AUTOPILOT' && <AutopilotCockpitView onNavigateTab={navigateToTab} />}
        {activeTab === 'SPARK_HUB' && <SparkAndReaderHubView onNavigateTab={navigateToTab} />}
        {activeTab === 'SKILL_VAULT' && <CentralSkillVaultView onNavigateTab={navigateToTab} />}
        {activeTab === 'MEMORY_GUARD' && (
          <MemoryTokenAntiHallucinationView onNavigateTab={navigateToTab} />
        )}
        {activeTab === 'OUTLINES' && <StudioView onNavigateTab={navigateToTab} />}
        {activeTab === 'CANVAS' && (
          <StudioView onNavigateTab={navigateToTab} defaultStudioTab="canvas" />
        )}
        {activeTab === 'GENESIS' && <GenesisView onNavigateTab={navigateToTab} />}
        {activeTab === 'STYLE_DNA' && <StyleDnaStudioView onNavigateTab={navigateToTab} />}
        {activeTab === 'MODEL_HUB' && <ModelHubView onNavigateTab={navigateToTab} />}
        {activeTab === 'GODS_EYE_SANDBOX' && (
          <GodsEyeSandboxView onNavigateTab={navigateToTab} />
        )}
        {activeTab === 'VIDEO_STUDIO' && <VideoStoryboardStudio />}
        {activeTab === 'WORKFLOW' && <WorkflowOrchestratorView />}
        {activeTab === 'PROGRESS_PULSE' && <ProgressPulseView onNavigateTab={navigateToTab} />}
        {activeTab === 'DUNGEONS' && <DungeonArcTrajectoryView />}
        {activeTab === 'CHARACTERS' && <CharacterView onNavigateTab={navigateToTab} />}
        {activeTab === 'RELATIONS' && <CharacterRelationGraph />}
        {activeTab === 'TIMELINE' && <TimelineMatrixView onNavigateTab={navigateToTab} />}
        {activeTab === 'TENSION' && <TensionCurveView onNavigateTab={navigateToTab} />}
        {activeTab === 'FORESHADOWING' && <ForeshadowingRadar onNavigateTab={navigateToTab} />}
        {activeTab === 'MAP' && <WorldMapView />}
        {activeTab === 'SANDBOX' && <WhatIfSandboxView />}
        {activeTab === 'EVOLUTION' && <SelfIterationView />}
        {activeTab === 'PRODUCTIVITY' && <ProductivityHeatmap />}
        {activeTab === 'CLINIC' && <GoldenThreeChaptersClinic />}
        {activeTab === 'PLUGINS' && <WorkflowPluginHub />}
        {activeTab === 'LORE' && <LoreView onNavigateTab={navigateToTab} />}
        {activeTab === 'MCP' && <McpInspectorView />}
      </div>

      {/* 全局悬浮灵光一现速记胶囊与技能库/无人巡航快捷入口 */}
      <FloatingSparkCapsule onNavigateTab={navigateToTab} />

      {/* 移动端底部原生触控导航 */}
      <MobileBottomNav activeTab={activeTab} setActiveTab={navigateToTab} />

      {/* 模型配置弹窗 */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={closeSettingsModal}
      />

      {/* 全局穿梭指挥官 (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={navigateToTab}
        onOpenZen={() => setIsZenOpen(true)}
        onOpenExport={() => setIsExportStudioOpen(true)}
        onOpenGraph={() => navigateToTab('RELATIONS')}
        onOpenTension={() => navigateToTab('TENSION')}
        onOpenSelfIteration={() => navigateToTab('EVOLUTION')}
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
