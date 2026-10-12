// ==============================================================================
// 墨枢 · InkVerse (By Timskt) — 旗舰品牌视觉 VI 引擎与专属印章定制中枢
// 遵循 app-logo-design-engine 规范：
// 1. 512x512 精确几何坐标内联 SVG (Origami Quill Prism + 朱砂文人藏书印)
// 2. 支持全站响应式品牌状态共享 (Header / 作品库 / 创作台 / 出版级导出水印)
// 3. 支持一键切换品牌预设或自定义主理人署名、印章篆字、Slogan 与徽标形态
// ==============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Award,
  Check,
  Copy,
  Download,
  ExternalLink,
  Feather,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stamp,
  X,
} from 'lucide-react';

export type BrandEmblemStyle = 'PRISM_QUILL' | 'CINNABAR_SEAL' | 'CELESTIAL_ORBIT';

export interface BrandConfig {
  brandName: string;
  brandSubtitle: string;
  brandAuthor: string;
  brandGithub: string;
  brandSlogan: string;
  sealText: string;
  emblemStyle: BrandEmblemStyle;
  exportWatermark: string;
  showWatermarkInEditor: boolean;
}

export const BRAND_PRESETS: Array<{
  id: string;
  label: string;
  badge: string;
  config: BrandConfig;
}> = [
  {
    id: 'inkverse-timskt',
    label: '墨枢 · InkVerse (旗舰默认)',
    badge: 'RECOMMENDED',
    config: {
      brandName: '墨枢 · InkVerse',
      brandSubtitle: 'BY TIMSKT · 文学造物矩阵',
      brandAuthor: 'Timskt',
      brandGithub: 'https://github.com/Timskt/NovManager',
      brandSlogan: '执墨为枢，万界成书 —— Timskt 原创长篇文学智能体造物工作台',
      sealText: '墨枢',
      emblemStyle: 'PRISM_QUILL',
      exportWatermark:
        '【墨枢 · InkVerse】By Timskt 原创长篇文学造物工作台精排出品 · 严禁未授权盗版搬运',
      showWatermarkInEditor: true,
    },
  },
  {
    id: 'taixu-studio',
    label: '太虚书斋 · Taixu Studio',
    badge: '东方文人',
    config: {
      brandName: '太虚书斋 · Taixu',
      brandSubtitle: 'TIMSKT 藏书与长篇推演斋',
      brandAuthor: 'Timskt',
      brandGithub: 'https://github.com/Timskt/NovManager',
      brandSlogan: '胸藏太虚万象，笔落星河千卷 —— 东方古典人文长篇创作私塾',
      sealText: '太虚',
      emblemStyle: 'CINNABAR_SEAL',
      exportWatermark: '【太虚书斋 · Timskt 藏书印】手稿真迹 · 静默 Git 链上存证',
      showWatermarkInEditor: true,
    },
  },
  {
    id: 'skyverse-ai',
    label: '天工文枢 · SkyVerse',
    badge: '多智能体',
    config: {
      brandName: '天工文枢 · SkyVerse',
      brandSubtitle: 'SKY / TIMSKT AI LITERARY OS',
      brandAuthor: 'Timskt (Sky)',
      brandGithub: 'https://github.com/Timskt/NovManager',
      brandSlogan: '多平台大模型协同接力 · 百万字零幻觉全自动巡航造物引擎',
      sealText: '天工',
      emblemStyle: 'CELESTIAL_ORBIT',
      exportWatermark: 'Powered by SkyVerse Literary OS (Created by Timskt)',
      showWatermarkInEditor: true,
    },
  },
  {
    id: 'timskt-pro',
    label: 'Timskt Studio · 极客厂牌',
    badge: '个人厂牌',
    config: {
      brandName: 'Timskt Studio',
      brandSubtitle: 'ORIGINAL NOVEL ENGINE V2.0',
      brandAuthor: 'Timskt',
      brandGithub: 'https://github.com/Timskt/NovManager',
      brandSlogan: 'Crafted by Timskt · High-Performance Rust + Multi-Agent Literary Workstation',
      sealText: 'TIM',
      emblemStyle: 'PRISM_QUILL',
      exportWatermark: '© 2026 Timskt Studio · All Rights Reserved.',
      showWatermarkInEditor: true,
    },
  },
];

const STORAGE_KEY = 'inkverse_timskt_brand_config_v1';

interface BrandContextValue {
  brand: BrandConfig;
  updateBrand: (patch: Partial<BrandConfig>) => void;
  applyPreset: (presetId: string) => void;
  resetBrand: () => void;
  isBrandModalOpen: boolean;
  setIsBrandModalOpen: (open: boolean) => void;
}

const defaultBrand = BRAND_PRESETS[0].config;

const BrandContext = createContext<BrandContextValue>({
  brand: defaultBrand,
  updateBrand: () => {},
  applyPreset: () => {},
  resetBrand: () => {},
  isBrandModalOpen: false,
  setIsBrandModalOpen: () => {},
});

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<BrandConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...defaultBrand, ...JSON.parse(raw) };
      }
    } catch {
      // ignore storage errors
    }
    return defaultBrand;
  });
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(brand));
      document.title = `${brand.brandName} — ${brand.brandSlogan}`;
    } catch {
      // ignore
    }
  }, [brand]);

  const updateBrand = (patch: Partial<BrandConfig>) => {
    setBrand((prev) => ({ ...prev, ...patch }));
  };

  const applyPreset = (presetId: string) => {
    const found = BRAND_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setBrand(found.config);
    }
  };

  const resetBrand = () => {
    setBrand(defaultBrand);
  };

  return (
    <BrandContext.Provider
      value={{
        brand,
        updateBrand,
        applyPreset,
        resetBrand,
        isBrandModalOpen,
        setIsBrandModalOpen,
      }}
    >
      {children}
      {isBrandModalOpen && <BrandStudioModal onClose={() => setIsBrandModalOpen(false)} />}
    </BrandContext.Provider>
  );
};

export const useBrand = () => useContext(BrandContext);

// ==============================================================================
// 1. 旗舰几何矢量徽标组件 (512x512 Retina Inline SVG)
// ==============================================================================
export const BrandLogo: React.FC<{
  size?: number;
  styleOverride?: BrandEmblemStyle;
  sealTextOverride?: string;
  className?: string;
}> = ({ size = 38, styleOverride, sealTextOverride, className = '' }) => {
  const { brand } = useBrand();
  const emblem = styleOverride || brand.emblemStyle;
  const sealGlyph = (sealTextOverride || brand.sealText || '墨枢').slice(0, 2);

  if (emblem === 'CINNABAR_SEAL') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        className={`shrink-0 select-none ${className}`}
      >
        <defs>
          <linearGradient id="seal-only-bg" x1="36" y1="36" x2="476" y2="476" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DF2B26" />
            <stop offset="60%" stopColor="#B01515" />
            <stop offset="100%" stopColor="#7C0B0B" />
          </linearGradient>
        </defs>
        <rect x="36" y="36" width="440" height="440" rx="104" fill="url(#seal-only-bg)" />
        <rect
          x="36"
          y="36"
          width="440"
          height="440"
          rx="104"
          stroke="#FFE0A3"
          strokeWidth="12"
          strokeOpacity="0.85"
        />
        <rect
          x="74"
          y="74"
          width="364"
          height="364"
          rx="72"
          stroke="#FFF2DB"
          strokeWidth="6"
          strokeOpacity="0.45"
        />
        <line x1="256" y1="90" x2="256" y2="422" stroke="#FFF2DB" strokeWidth="4" strokeOpacity="0.22" />
        <line x1="90" y1="256" x2="422" y2="256" stroke="#FFF2DB" strokeWidth="4" strokeOpacity="0.22" />
        <text
          x="256"
          y="305"
          textAnchor="middle"
          fill="#FFF7E8"
          fontSize={sealGlyph.length === 1 ? '210' : '156'}
          fontWeight="900"
          fontFamily="'Songti SC', 'Noto Serif SC', serif"
          letterSpacing="6"
        >
          {sealGlyph}
        </text>
      </svg>
    );
  }

  if (emblem === 'CELESTIAL_ORBIT') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        className={`shrink-0 select-none ${className}`}
      >
        <defs>
          <linearGradient id="orbit-bg" x1="60" y1="36" x2="452" y2="476" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#141B2D" />
            <stop offset="100%" stopColor="#090D16" />
          </linearGradient>
          <linearGradient id="orbit-ring" x1="80" y1="80" x2="432" y2="432" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <rect x="36" y="36" width="440" height="440" rx="104" fill="url(#orbit-bg)" />
        <rect x="36" y="36" width="440" height="440" rx="104" stroke="url(#orbit-ring)" strokeWidth="10" strokeOpacity="0.5" />
        <circle cx="256" cy="256" r="148" stroke="url(#orbit-ring)" strokeWidth="12" strokeDasharray="36 18" />
        <ellipse cx="256" cy="256" rx="176" ry="74" transform="rotate(-30 256 256)" stroke="#38BDF8" strokeWidth="10" strokeOpacity="0.75" />
        <polygon points="256,92 184,264 256,228 328,264" fill="url(#orbit-ring)" />
        <rect x="206" y="320" width="100" height="100" rx="22" fill="#C81E1E" stroke="#FDE68A" strokeWidth="8" />
        <text
          x="256"
          y="386"
          textAnchor="middle"
          fill="#FFFBEB"
          fontSize="54"
          fontWeight="900"
          fontFamily="'Songti SC', serif"
        >
          {sealGlyph}
        </text>
      </svg>
    );
  }

  // Default Flagship: PRISM_QUILL (墨枢折纸金尖 + 朱砂藏书印)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id="iv-bg" x1="120" y1="36" x2="392" y2="476" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#212433" />
          <stop offset="55%" stopColor="#12151F" />
          <stop offset="100%" stopColor="#0A0C14" />
        </linearGradient>
        <linearGradient id="iv-left-wing" x1="104" y1="180" x2="242" y2="376" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCBC42" />
          <stop offset="100%" stopColor="#D95C1F" />
        </linearGradient>
        <linearGradient id="iv-right-wing" x1="408" y1="180" x2="270" y2="376" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3DD6F2" />
          <stop offset="100%" stopColor="#5C66F0" />
        </linearGradient>
        <linearGradient id="iv-nib-left" x1="256" y1="88" x2="180" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF0BD" />
          <stop offset="55%" stopColor="#F7A333" />
          <stop offset="100%" stopColor="#CC471F" />
        </linearGradient>
        <linearGradient id="iv-nib-right" x1="256" y1="88" x2="332" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F2D68C" />
          <stop offset="55%" stopColor="#D67026" />
          <stop offset="100%" stopColor="#94301F" />
        </linearGradient>
        <linearGradient id="iv-seal" x1="212" y1="342" x2="300" y2="430" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E3302B" />
          <stop offset="100%" stopColor="#A31414" />
        </linearGradient>
      </defs>

      <rect x="24" y="24" width="464" height="464" rx="110" fill="url(#iv-bg)" />
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="110"
        stroke="#F5C273"
        strokeOpacity="0.42"
        strokeWidth="8"
      />

      {/* Left & Right Origami Scroll Wings */}
      <path d="M242 376 L96 312 L116 176 L242 236 Z" fill="url(#iv-left-wing)" />
      <path d="M270 376 L416 312 L396 176 L270 236 Z" fill="url(#iv-right-wing)" />

      {/* Central Sovereign Fountain-Pen Nib Prism */}
      <path d="M256 78 L158 232 L198 364 L256 328 Z" fill="url(#iv-nib-left)" />
      <path d="M256 78 L354 232 L314 364 L256 328 Z" fill="url(#iv-nib-right)" />

      {/* Capillary Slit & Diamond Breather Hole */}
      <line x1="256" y1="88" x2="256" y2="228" stroke="#0F111A" strokeWidth="10" strokeLinecap="round" />
      <polygon points="256,210 230,240 256,270 282,240" fill="#0F111A" stroke="#FFE094" strokeWidth="5" />

      {/* Oriental Cinnabar Author Seal Stamp */}
      <rect
        x="204"
        y="336"
        width="104"
        height="104"
        rx="24"
        fill="url(#iv-seal)"
        stroke="#FFE0A3"
        strokeWidth="6"
      />
      <rect x="228" y="358" width="56" height="26" rx="5" stroke="#FFF2DB" strokeWidth="6" />
      <line x1="228" y1="371" x2="284" y2="371" stroke="#FFF2DB" strokeWidth="6" strokeLinecap="round" />
      <line x1="256" y1="358" x2="256" y2="418" stroke="#FFF2DB" strokeWidth="6" strokeLinecap="round" />
      <line x1="234" y1="402" x2="278" y2="402" stroke="#FFF2DB" strokeWidth="6" strokeLinecap="round" />
      <line x1="224" y1="418" x2="288" y2="418" stroke="#FFF2DB" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
};

// ==============================================================================
// 2. 东方朱砂文人藏书印徽章 (Inline Cinnabar Stamp Badge)
// ==============================================================================
export const BrandSealBadge: React.FC<{
  text?: string;
  onClick?: () => void;
  className?: string;
}> = ({ text, onClick, className = '' }) => {
  const { brand, setIsBrandModalOpen } = useBrand();
  const display = (text || brand.sealText || '墨枢').slice(0, 4);

  return (
    <button
      type="button"
      onClick={onClick || (() => setIsBrandModalOpen(true))}
      title="点击打开【个人品牌与朱砂藏书印定制中心】"
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold tracking-wider transition-all hover:scale-105 cursor-pointer select-none shadow-2xs ${className}`}
      style={{
        backgroundColor: 'rgba(198, 40, 40, 0.12)',
        borderColor: 'rgba(220, 38, 38, 0.45)',
        color: '#ef4444',
        fontFamily: "'Songti SC', 'Noto Serif SC', serif",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-xs bg-red-500 inline-block" />
      <span>「{display}」印</span>
    </button>
  );
};

// ==============================================================================
// 3. 品牌视觉 VI 与专属印章定制中心弹窗 (Brand Identity Studio Modal)
// ==============================================================================
export const BrandStudioModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { brand, updateBrand, applyPreset, resetBrand } = useBrand();
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);

  const handleCopySignature = () => {
    const sig = `${brand.brandName} (${brand.brandSubtitle})\n主理人/作者: ${brand.brandAuthor}\n项目主页: ${brand.brandGithub}\n品牌宣言: ${brand.brandSlogan}\n防伪印章: 「${brand.sealText}」\n版权尾注: ${brand.exportWatermark}`;
    navigator.clipboard.writeText(sig);
    setCopiedBanner('已复制完整品牌 VI 署名档案至剪贴板！');
    setTimeout(() => setCopiedBanner(null), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl p-6 space-y-6"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3.5">
            <BrandLogo size={52} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-literary-serif">{brand.brandName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  OFFICIAL BRAND VI STUDIO
                </span>
                <BrandSealBadge />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">{brand.brandSlogan}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {copiedBanner && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{copiedBanner}</span>
          </div>
        )}

        {/* 第一部分：高清原生品牌资产展示台 (True 32-bit RGBA PNG + Vector SVG + macOS .icns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：512x512 原生高清应用图标预览 */}
          <div
            className="p-5 rounded-xl border flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
              macOS Retina Squircle (ColorType 6 RGBA)
            </div>
            <img
              src="/logo.png"
              alt={brand.brandName}
              className="w-28 h-28 object-contain drop-shadow-xl transition-transform hover:scale-105"
            />
            <div>
              <div className="text-sm font-bold">{brand.brandName}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{brand.brandSubtitle}</div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <a
                href="/logo.png"
                download="InkVerse-Logo-1024.png"
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                PNG 图标
              </a>
              <a
                href="/seal-logo.svg"
                download="InkVerse-Logo.svg"
                className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                SVG 矢量源
              </a>
              <a
                href="/AppIcon.icns"
                download="InkVerse.icns"
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                macOS .icns
              </a>
            </div>
          </div>

          {/* 右侧两列：4 套旗舰品牌预设一键切换 */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                一键切换您的专属品牌方案 (Brand Identity Presets)
              </label>
              <button
                onClick={resetBrand}
                className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                恢复默认旗舰品牌
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BRAND_PRESETS.map((preset) => {
                const isSelected = brand.brandName === preset.config.brandName;
                return (
                  <div
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-amber-500/40'
                    }`}
                  >
                    <BrandLogo
                      size={40}
                      styleOverride={preset.config.emblemStyle}
                      sealTextOverride={preset.config.sealText}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold truncate">{preset.label}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 shrink-0">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                        {preset.config.brandSubtitle}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-1 opacity-80">
                        印章：「{preset.config.sealText}」· 主理人：{preset.config.brandAuthor}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 三种几何徽标形态切换 */}
            <div className="pt-2">
              <div className="text-xs font-bold mb-2 flex items-center gap-1.5">
                <Stamp className="w-3.5 h-3.5 text-red-400" />
                切换导航栏徽标几何形态 (Logo Geometry & Seal Mode)
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {(
                  [
                    {
                      id: 'PRISM_QUILL',
                      name: '墨枢折纸金尖',
                      desc: 'Origami 金尖棱镜 + 朱砂方印',
                    },
                    {
                      id: 'CINNABAR_SEAL',
                      name: '东方朱砂藏书印',
                      desc: '纯正小篆朱文方印徽标',
                    },
                    {
                      id: 'CELESTIAL_ORBIT',
                      name: '太虚星轨卷轴',
                      desc: '星轨浑天仪 + 灵枢金尖',
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateBrand({ emblemStyle: item.id })}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      brand.emblemStyle === item.id
                        ? 'border-amber-500 bg-amber-500/15'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-amber-500/40'
                    }`}
                  >
                    <BrandLogo size={32} styleOverride={item.id} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{item.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{item.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 第二部分：深度自定义您的品牌名、印章篆字、主理人署名与防盗版水印 */}
        <div
          className="p-5 rounded-xl border space-y-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Feather className="w-3.5 h-3.5" />
              深度定制个人品牌参数 (实时同步至导航栏、作品库、创作台与导出排版)
            </h3>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              已开启本地持久化记忆
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                主品牌名称 (Brand Name)
              </label>
              <input
                type="text"
                value={brand.brandName}
                onChange={(e) => updateBrand({ brandName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs font-bold"
                placeholder="例如：墨枢 · InkVerse"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                品牌副标题 / 英文标识 (Subtitle)
              </label>
              <input
                type="text"
                value={brand.brandSubtitle}
                onChange={(e) => updateBrand({ brandSubtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs"
                placeholder="例如：BY TIMSKT · 文学造物矩阵"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                朱砂印章篆刻文字 (1~4 字)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={brand.sealText}
                  onChange={(e) => updateBrand({ sealText: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-red-500/40 text-xs font-bold text-red-400"
                  placeholder="墨枢 / TIM"
                />
                {['墨枢', 'TIM', '太虚', '天工'].map((stamp) => (
                  <button
                    key={stamp}
                    type="button"
                    onClick={() => updateBrand({ sealText: stamp })}
                    className="px-2 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold shrink-0"
                  >
                    {stamp}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                品牌主理人 / 创作者署名 (Author)
              </label>
              <input
                type="text"
                value={brand.brandAuthor}
                onChange={(e) => updateBrand({ brandAuthor: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs font-semibold"
                placeholder="Timskt"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                品牌主张 Slogan (显示在浏览器标题与作品库横幅)
              </label>
              <input
                type="text"
                value={brand.brandSlogan}
                onChange={(e) => updateBrand({ brandSlogan: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                出书排版与章节导出专属品牌防伪尾注 (Export Copyright Watermark)
              </label>
              <input
                type="text"
                value={brand.exportWatermark}
                onChange={(e) => updateBrand({ exportWatermark: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <Award className="w-4 h-4 text-amber-400" />
            <span>
              品牌资产由 <strong className="text-[var(--text-main)]">{brand.brandAuthor}</strong> 独立持有
            </span>
            <a
              href={brand.brandGithub}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>GitHub 官方仓库</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopySignature}
              className="px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] text-xs font-semibold flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>复制完整品牌 VI 档案</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md"
            >
              完成并应用品牌配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
