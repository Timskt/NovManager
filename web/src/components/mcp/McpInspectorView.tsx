// ==============================================================================
// MCP (Model Context Protocol) 开放协议统一工作台 (McpInspectorView)
// 提供子页面切换：
// 1. 【⚙️ 客户端安装与配置向导】：按安装至系统目录 -> 客户端配置(带cat命令) -> 验证测试分步引导
// 2. 【🔍 协议调试与资产看板】：只读资源探索、工具在线模拟调用、JSON-RPC响应查看
// ==============================================================================

import React, { useState } from 'react';
import { ShieldCheck, Layers, Cable } from 'lucide-react';
import { McpSetupView } from './McpSetupView';
import { McpInspectorInnerView } from './McpInspectorInnerView';

export const McpInspectorView: React.FC = () => {
  const [subPage, setSubPage] = useState<'setup' | 'inspector'>('setup');

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶部子页面导航切换条 */}
      <div
        className="px-6 py-2.5 flex items-center justify-between shrink-0 border-b"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <Cable className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold hidden sm:inline" style={{ color: 'var(--text-main)' }}>
            Model Context Protocol (MCP) 开放生态
          </span>
        </div>

        {/* 核心双子页面切换器 */}
        <div
          className="flex items-center p-1 rounded-xl border text-xs font-medium"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <button
            onClick={() => setSubPage('setup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              subPage === 'setup'
                ? 'shadow-sm font-semibold'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: subPage === 'setup' ? 'var(--accent-primary)' : 'transparent',
              color: subPage === 'setup' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>⚙️ 客户端安装与配置向导</span>
          </button>

          <button
            onClick={() => setSubPage('inspector')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              subPage === 'inspector'
                ? 'shadow-sm font-semibold'
                : 'hover:opacity-80'
            }`}
            style={{
              backgroundColor: subPage === 'inspector' ? 'var(--accent-primary)' : 'transparent',
              color: subPage === 'inspector' ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🔍 协议在线调试与资产看板</span>
          </button>
        </div>
      </div>

      {/* 子页面容器 */}
      <div className="flex-1 flex overflow-hidden">
        {subPage === 'setup' ? (
          <McpSetupView onGoToInspector={() => setSubPage('inspector')} />
        ) : (
          <McpInspectorInnerView onGoToSetup={() => setSubPage('setup')} />
        )}
      </div>
    </div>
  );
};
