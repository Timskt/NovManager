// ==============================================================================
// 人文文学美学与排版排障主题状态机 (Theme & Literary Typography Context)
// 彻底摒弃同质化 AI 模版科技感，为专业文学创作者提供宣纸、黑曜、秘色、素雅四重沉浸美学
// ==============================================================================

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export type AppTheme = 'ink' | 'obsidian' | 'celadon' | 'pure';
export type FontFamily = 'serif' | 'sans' | 'mono';
export type ReaderWidth = 'narrow' | 'standard' | 'wide' | 'full';

export interface ThemeSettings {
  theme: AppTheme;
  fontFamily: FontFamily;
  fontSize: number; // 14 ~ 24
  lineHeight: number; // 1.6 ~ 2.4
  paragraphIndent: boolean; // 首行缩进两个汉字 (2em)
  readerWidth: ReaderWidth;
  typewriterMode: boolean; // 打字机视线垂直居中
  dimInactiveParagraphs: boolean; // 焦点段落高亮，其余淡化
}

interface ThemeContextType {
  settings: ThemeSettings;
  setTheme: (theme: AppTheme) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setParagraphIndent: (indent: boolean) => void;
  setReaderWidth: (width: ReaderWidth) => void;
  setTypewriterMode: (val: boolean) => void;
  setDimInactiveParagraphs: (val: boolean) => void;
  resetTypographyDefaults: () => void;
}

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  theme: 'obsidian', // 默认黑曜冷萃专业深色 (媲美 Linear / Final Draft)
  fontFamily: 'serif', // 默认典雅宋体
  fontSize: 17,
  lineHeight: 1.85,
  paragraphIndent: true,
  readerWidth: 'standard',
  typewriterMode: false,
  dimInactiveParagraphs: false,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      const saved = localStorage.getItem('nov_theme_settings');
      if (saved) {
        return { ...DEFAULT_THEME_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_THEME_SETTINGS;
  });

  // 保存偏好设置并动态同步至 document.documentElement 的属性
  useEffect(() => {
    try {
      localStorage.setItem('nov_theme_settings', JSON.stringify(settings));
    } catch {}

    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-font', settings.fontFamily);
    root.style.setProperty('--manuscript-font-size', `${settings.fontSize}px`);
    root.style.setProperty('--manuscript-line-height', `${settings.lineHeight}`);
    root.style.setProperty('--manuscript-indent', settings.paragraphIndent ? '2em' : '0');
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      setTheme: (theme: AppTheme) => setSettings((s) => ({ ...s, theme })),
      setFontFamily: (fontFamily: FontFamily) => setSettings((s) => ({ ...s, fontFamily })),
      setFontSize: (fontSize: number) => setSettings((s) => ({ ...s, fontSize })),
      setLineHeight: (lineHeight: number) => setSettings((s) => ({ ...s, lineHeight })),
      setParagraphIndent: (paragraphIndent: boolean) =>
        setSettings((s) => ({ ...s, paragraphIndent })),
      setReaderWidth: (readerWidth: ReaderWidth) => setSettings((s) => ({ ...s, readerWidth })),
      setTypewriterMode: (typewriterMode: boolean) =>
        setSettings((s) => ({ ...s, typewriterMode })),
      setDimInactiveParagraphs: (dimInactiveParagraphs: boolean) =>
        setSettings((s) => ({ ...s, dimInactiveParagraphs })),
      resetTypographyDefaults: () => setSettings(DEFAULT_THEME_SETTINGS),
    }),
    [settings]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
