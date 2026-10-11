// ==============================================================================
// 作家禅定沉浸式写作舱 (Zen Focus Mode & Ambient Audio Studio)
// 纯粹、无干扰、原声禅意音景与打字机垂直对焦，让创作者重返心流巅峰
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useNovel } from '../../context/NovelContext';
import { useTheme } from '../../context/ThemeContext';
import { ambientSound } from '../../lib/ambientSound';
import {
  Sparkles,
  Minimize2,
  Volume2,
  VolumeX,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Feather,
  Flame,
  CloudRain,
  Bell,
  CheckCircle,
} from 'lucide-react';

interface ZenFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZenFocusModal: React.FC<ZenFocusModalProps> = ({ isOpen, onClose }) => {
  const {
    activeChapter,
    activeScene,
    editorContent,
    setEditorContent,
    updateScene,
  } = useNovel();
  const { settings, setTypewriterMode, setDimInactiveParagraphs, setFontSize, setLineHeight } = useTheme();

  // 音景状态
  const [activeSound, setActiveSound] = useState<'rain' | 'fire' | 'bell' | 'crickets' | null>(null);
  const [volume, setVolume] = useState(0.35);

  // 冲刺计时器状态
  const [sprintDurationMin, setSprintDurationMin] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isSprintRunning, setIsSprintRunning] = useState(false);
  const [startWordCount, setStartWordCount] = useState(editorContent.length);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sprintWordsGained = Math.max(0, editorContent.length - startWordCount);

  // 快捷键 Esc 退出
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // 音景启停
  const toggleSound = (type: 'rain' | 'fire' | 'bell' | 'crickets') => {
    if (activeSound === type) {
      ambientSound.stop();
      setActiveSound(null);
    } else {
      ambientSound.play(type, volume);
      setActiveSound(type);
    }
  };

  // 退出禅定模式时安全关闭音效
  const handleExitZen = () => {
    if (activeSound) {
      ambientSound.stop();
      setActiveSound(null);
    }
    // 立即保存当前正文
    if (activeChapter && activeScene) {
      updateScene(activeChapter.id, activeScene.sceneIndex, {
        draftContent: editorContent,
      });
    }
    onClose();
  };

  // 冲刺计时器
  useEffect(() => {
    if (!isSprintRunning) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsSprintRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSprintRunning]);

  const startSprint = () => {
    setStartWordCount(editorContent.length);
    setSecondsRemaining(sprintDurationMin * 60);
    setIsSprintRunning(true);
  };

  const timerMin = Math.floor(secondsRemaining / 60);
  const timerSec = secondsRemaining % 60;
  const timeFormatted = `${String(timerMin).padStart(2, '0')}:${String(timerSec).padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col p-6 sm:p-10 select-auto animate-in fade-in duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 极简顶栏 */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <Feather className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h1 className="text-base font-bold font-literary-serif">
              第 {activeChapter?.chapterIndex} 章 · {activeChapter?.title}
              <span className="text-xs ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
                [第 {activeScene?.sceneIndex} 幕 · {activeScene?.sceneGoal || '专注写作'}]
              </span>
            </h1>
          </div>
        </div>

        {/* 中间音景与计时器快捷岛 */}
        <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 px-4 py-1.5 rounded-full border text-xs font-literary-sans" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* 自然音景选择器 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => toggleSound('rain')}
              title="雨打窗扉 (Rain)"
              className={`p-1.5 rounded-full transition ${activeSound === 'rain' ? 'bg-amber-600 text-white' : 'hover:opacity-75'}`}
            >
              <CloudRain className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleSound('fire')}
              title="林间柴火 (Fireplace)"
              className={`p-1.5 rounded-full transition ${activeSound === 'fire' ? 'bg-amber-600 text-white' : 'hover:opacity-75'}`}
            >
              <Flame className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleSound('bell')}
              title="古刹禅钟 (Temple Bell)"
              className={`p-1.5 rounded-full transition ${activeSound === 'bell' ? 'bg-amber-600 text-white' : 'hover:opacity-75'}`}
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>

          <span className="opacity-30">|</span>

          {/* 冲刺倒计时与字数里程碑 */}
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold">{timeFormatted}</span>
            {isSprintRunning ? (
              <button onClick={() => setIsSprintRunning(false)} className="hover:opacity-75">
                <Pause className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button onClick={startSprint} className="hover:opacity-75" title="开启冲刺计时">
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-[11px]" style={{ color: 'var(--accent-primary)' }}>
              + {sprintWordsGained} 字
            </span>
          </div>
        </div>

        {/* 右侧退出按钮 */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-literary-sans" style={{ color: 'var(--text-muted)' }}>
            当前幕已写 {editorContent.length} 字
          </span>
          <button
            onClick={handleExitZen}
            className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition hover:opacity-85"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>退出沉浸 (ESC)</span>
          </button>
        </div>
      </div>

      {/* 沉浸式无干扰核心编辑器区 */}
      <div className="flex-1 flex justify-center overflow-y-auto py-8">
        <div
          className="w-full transition-all"
          style={{
            maxWidth: settings.readerWidth === 'narrow' ? '65ch' : settings.readerWidth === 'standard' ? '75ch' : settings.readerWidth === 'wide' ? '90ch' : '100%',
          }}
        >
          <textarea
            ref={textareaRef}
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            placeholder="此地唯有笔锋与心跳，落子无悔，开始书写你的世界……"
            className="w-full h-full bg-transparent border-none outline-none resize-none font-literary-serif selection:bg-amber-500/25 leading-relaxed placeholder:opacity-30"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              textIndent: settings.paragraphIndent ? '2em' : '0',
              color: 'var(--text-main)',
            }}
          />
        </div>
      </div>

      {/* 底部微信息 */}
      <div className="pt-2 border-t text-center text-xs opacity-40 font-literary-sans" style={{ borderColor: 'var(--border-subtle)' }}>
        禅定写作模式已开启 · 支持实时后台自动保存与崩溃预写日志容灾
      </div>
    </div>
  );
};
