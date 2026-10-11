// ==============================================================================
// 剧情时间轴与多线编年史矩阵 (Multi-Thread Story Chronology Matrix)
// 呈现主线剧情、势力动向与角色支线的同步编年矩阵，防止时空冲突与事件错位
// ==============================================================================

import React, { useMemo, useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Clock, MapPin, Users, ChevronRight, Filter } from 'lucide-react';
import type { NavTab } from '../Header';

interface TimelineMatrixViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const TimelineMatrixView: React.FC<TimelineMatrixViewProps> = ({ onNavigateTab }) => {
  const { volumes, characters, setActiveChapterId, setActiveSceneIndex } = useNovel();
  const [selectedCharFilter, setSelectedCharFilter] = useState<string>('all');

  const charMap = useMemo(() => {
    const map = new Map<string, string>();
    characters.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [characters]);

  // 构建按章节分步的时间线泳道
  const timelineEvents = useMemo(() => {
    const events: {
      chapterId: string;
      chapterIndex: number;
      chapterTitle: string;
      sceneIndex: number;
      location: string;
      goal: string;
      conflict: string;
      turnPoint: string;
      outcome: string;
      involvedChars: string[];
      hasDraft: boolean;
    }[] = [];

    volumes.forEach((v) => {
      v.chapters.forEach((c) => {
        c.scenes.forEach((sc) => {
          const charNames = (sc.involvedCharacterIds || []).map((cid) => charMap.get(cid) || '角色');
          if (
            selectedCharFilter === 'all' ||
            (sc.involvedCharacterIds || []).includes(selectedCharFilter)
          ) {
            events.push({
              chapterId: c.id,
              chapterIndex: c.chapterIndex,
              chapterTitle: c.title,
              sceneIndex: sc.sceneIndex,
              location: sc.location || '天地界域',
              goal: sc.sceneGoal,
              conflict: sc.conflict,
              turnPoint: sc.turnPoint,
              outcome: sc.outcome,
              involvedChars: charNames,
              hasDraft: Boolean(sc.draftContent && sc.draftContent.length > 50),
            });
          }
        });
      });
    });

    return events;
  }, [volumes, charMap, selectedCharFilter]);

  const handleJump = (chapterId: string, sceneIndex: number) => {
    setActiveChapterId(chapterId);
    setActiveSceneIndex(sceneIndex);
    onNavigateTab?.('STUDIO');
  };

  return (
    <div
      className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto select-none"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶栏控制 */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-xl font-bold font-literary-serif flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <span>多线剧情编年史矩阵</span>
            <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              {timelineEvents.length} 个编年时空节拍
            </span>
          </h2>
          <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
            清晰对齐主支线剧情发生地点、角色动向与戏剧转折；支持按出场人物筛选专属事件流。
          </p>
        </div>

        {/* 角色过滤器 */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedCharFilter}
            onChange={(e) => setSelectedCharFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border text-xs font-literary-sans outline-none"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
          >
            <option value="all">全员主支线总览</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.roleType === 'PROTAGONIST' ? '主角' : '配角'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 编年史纵向泳道流 */}
      <div className="relative mt-6 pl-6 sm:pl-10 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-2 sm:before:left-4 before:w-0.5 before:bg-black/10 dark:before:bg-white/10">
        {timelineEvents.map((evt, idx) => (
          <div key={idx} className="relative group">
            {/* 时间轴节点圆点 */}
            <div
              className="absolute -left-6 sm:-left-10 top-3 w-4 h-4 rounded-full border-2 transition-transform group-hover:scale-125"
              style={{
                backgroundColor: evt.hasDraft ? 'var(--accent-primary)' : 'var(--bg-surface)',
                borderColor: 'var(--accent-primary)',
              }}
            />

            {/* 事件卡片 */}
            <div
              onClick={() => handleJump(evt.chapterId, evt.sceneIndex)}
              className="p-4 rounded-2xl border transition hover:shadow-md cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm font-literary-serif">
                    第 {evt.chapterIndex} 章 · 第 {evt.sceneIndex} 幕
                  </span>
                  <span className="text-xs opacity-75 font-literary-serif">({evt.chapterTitle})</span>
                  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                    <MapPin className="w-3 h-3" />
                    <span>{evt.location}</span>
                  </span>
                </div>

                <p className="text-xs font-literary-sans" style={{ color: 'var(--text-main)' }}>
                  <span className="font-semibold">节拍目标：</span>{evt.goal}
                </p>

                {evt.turnPoint && (
                  <p className="text-xs font-literary-sans" style={{ color: 'var(--accent-primary)' }}>
                    <span className="font-semibold">关键转折：</span>{evt.turnPoint}
                  </p>
                )}

                {evt.involvedChars.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-literary-sans pt-1" style={{ color: 'var(--text-muted)' }}>
                    <Users className="w-3 h-3" />
                    <span>登场角色：{evt.involvedChars.join('、')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs px-2 py-1 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                  {evt.hasDraft ? '正文已成稿' : '大纲构思中'}
                </span>
                <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
