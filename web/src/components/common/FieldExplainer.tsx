// ==============================================================================
// 通用字段解析与指引气泡组件 (Field Explainer & Educational Tooltip)
// 基于 React Portal 与 Fixed 视口绝对定位，彻底杜绝任何父级 overflow 遮挡与裁剪
// ==============================================================================

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Sparkles, X } from 'lucide-react';

export interface FieldExplainerProps {
  title: string;
  what: string;
  why: string;
  example?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const FieldExplainer: React.FC<FieldExplainerProps> = ({
  title,
  what,
  why,
  example,
  position = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 精准视口位置计算与防溢出算法
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padding = 12;

    const tooltipWidth = Math.min(340, vw - padding * 2);
    const estimatedHeight = tooltipRef.current?.offsetHeight || 220;

    let left = 0;
    let top = 0;

    if (position === 'right') {
      // 优先右侧浮动（常用于左侧抽屉）
      if (triggerRect.right + tooltipWidth + 12 <= vw) {
        left = triggerRect.right + 8;
        top = triggerRect.top + triggerRect.height / 2 - estimatedHeight / 2;
      } else {
        // 右侧空间不足，回退到下方或左侧
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        top = triggerRect.bottom + 8;
      }
    } else if (position === 'left') {
      // 优先左侧浮动（常用于右侧舱）
      if (triggerRect.left - tooltipWidth - 12 >= 0) {
        left = triggerRect.left - tooltipWidth - 8;
        top = triggerRect.top + triggerRect.height / 2 - estimatedHeight / 2;
      } else {
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        top = triggerRect.bottom + 8;
      }
    } else if (position === 'top') {
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
      top = triggerRect.top - estimatedHeight - 8;
      if (top < padding) {
        top = triggerRect.bottom + 8; // 翻转到下方
      }
    } else {
      // 'bottom'
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
      top = triggerRect.bottom + 8;
      if (top + estimatedHeight > vh - padding) {
        top = Math.max(padding, triggerRect.top - estimatedHeight - 8); // 翻转到上方
      }
    }

    // 视口边界强行安全钳制
    if (left + tooltipWidth > vw - padding) {
      left = vw - tooltipWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }
    if (top + estimatedHeight > vh - padding) {
      top = vh - estimatedHeight - padding;
    }
    if (top < padding) {
      top = padding;
    }

    setCoords({ top, left });
  };

  // 展开时计算初始位置
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  // 监听滚动与视口大小调整
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      updatePosition();
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // 点击外部自动关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <>
      {/* 触发图标 */}
      <div
        ref={triggerRef}
        className={`inline-flex items-center group cursor-pointer text-slate-500 hover:text-indigo-400 transition-colors p-0.5 ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
          updatePosition();
        }}
        title="点击或悬停查看写作指南"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </div>

      {/* 基于 Portal 渲染的顶级浮动卡片，彻底避免任何父容器裁剪 */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
              maxWidth: 'min(360px, calc(100vw - 24px))',
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onMouseEnter={() => {
              if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
              }
            }}
            onMouseLeave={handleMouseLeave}
            className="p-3.5 backdrop-blur-md border rounded-xl shadow-2xl text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
          >
            {/* 头部标题与关闭 */}
            <div className="flex items-center justify-between border-b pb-1.5 text-indigo-400 font-semibold" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{title}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-0.5 rounded transition hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
                title="关闭"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 做什么 (What) */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                做什么 (What)
              </span>
              <p className="text-[11px] leading-relaxed pl-2.5" style={{ color: 'var(--text-main)' }}>
                {what}
              </p>
            </div>

            {/* 为什么重要 (Why) */}
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                为什么 (Why)
              </span>
              <p className="text-[11px] leading-relaxed pl-2.5" style={{ color: 'var(--text-main)' }}>
                {why}
              </p>
            </div>

            {/* 范例 (Example) */}
            {example && (
              <div
                className="border rounded-lg p-2 space-y-0.5 mt-1"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <span className="text-[10px] text-emerald-400 font-medium block">
                  💡 参考范例：
                </span>
                <p className="text-[11px] italic leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  "{example}"
                </p>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};
