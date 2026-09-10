// ==============================================================================
// 系统与大模型设置弹窗 (Settings Modal)
// 支持 DeepSeek 官方接口、OpenCode-Go 接口、OpenAPI / OpenAI 兼容接口直连配置与连通性测试
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { LLM_PRESETS, testLLMConnection, normalizeEndpoint, ConnectionTestResult } from '../../lib/aiPresets';
import { LLMProviderType } from '../../types/novel';
import {
  Settings,
  X,
  Cpu,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  Server,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, novel, updateNovel } = useNovel();

  const [useMock, setUseMock] = useState(settings.useMock);
  const [provider, setProvider] = useState<LLMProviderType>(settings.provider || 'deepseek');
  const [endpoint, setEndpoint] = useState(settings.apiEndpoint || LLM_PRESETS.deepseek.endpoint);
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [model, setModel] = useState(settings.model || LLM_PRESETS.deepseek.defaultModel);
  const [temp, setTemp] = useState(settings.temperature ?? 0.7);
  const [useBackendProxy, setUseBackendProxy] = useState(settings.useBackendProxy ?? false);

  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 连通性测试状态
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // 文风与禁忌词
  const [tone, setTone] = useState(novel.styleGuide.tone);
  const [forbidden, setForbidden] = useState(
    novel.styleGuide.forbiddenPhrases.join('、')
  );

  if (!isOpen) return null;

  // 切换供应商预设
  const handleSelectProvider = (pid: LLMProviderType) => {
    const preset = LLM_PRESETS[pid];
    setProvider(pid);
    setEndpoint(preset.endpoint);
    setModel(preset.defaultModel);
    setTestResult(null);
  };

  // 测试 API 连接
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testLLMConnection(endpoint, apiKey, model, useBackendProxy);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        error: e.message || '连接测试超时或未知异常',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalEndpoint = normalizeEndpoint(endpoint);

    updateSettings({
      useMock,
      provider,
      apiEndpoint: finalEndpoint,
      apiKey: apiKey.trim(),
      model: model.trim(),
      temperature: Number(temp),
      useBackendProxy,
    });

    updateNovel({
      styleGuide: {
        ...novel.styleGuide,
        tone,
        forbiddenPhrases: forbidden.split(/[,，、 ]+/).filter(Boolean),
      },
    });

    onClose();
  };

  const activePreset = LLM_PRESETS[provider];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <form
        onSubmit={handleSave}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col"
      >
        {/* 顶部标题与关闭 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>AI 大模型直连与协同配置</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* 1. 运行模式选择卡片 */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="font-semibold text-slate-300 block">AI Agent 推理运行模式</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseMock(true)}
                className={`p-3 rounded-xl border text-left transition ${
                  useMock
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>极速仿真模式 (离线演示)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  免 API Key，内置全套思维链推演与长篇小说起草模拟引擎
                </p>
              </button>

              <button
                type="button"
                onClick={() => setUseMock(false)}
                className={`p-3 rounded-xl border text-left transition ${
                  !useMock
                    ? 'bg-gradient-to-tr from-amber-950/40 to-indigo-950/60 border-amber-500/80 text-amber-200 ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs text-amber-300">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>真实大模型 API 直连</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  直连 DeepSeek / OpenCode-Go / OpenAI 兼容接口，真机推理
                </p>
              </button>
            </div>
          </div>

          {/* 2. 真实 API 参数配置区 */}
          {!useMock && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 animate-in fade-in">
              {/* 供应商预设平铺选择 */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  选择接口服务商预设 (一键自动填入地址与模型)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(LLM_PRESETS) as LLMProviderType[]).map((pid) => {
                    const item = LLM_PRESETS[pid];
                    const isSelected = provider === pid;
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => handleSelectProvider(pid)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[11px] line-clamp-1">{item.name}</div>
                          <div className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">
                            {item.tag}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[9px] text-indigo-400 font-semibold mt-1 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>已选</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  {activePreset.description}
                </p>
              </div>

              {/* API Key 输入框 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>API 密钥 (API Key)</span>
                  </label>
                  {activePreset.docUrl && (
                    <a
                      href={activePreset.docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                      <span>前往申请密钥</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder={activePreset.keyPlaceholder}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 pr-9 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    title={showApiKey ? '隐藏密钥' : '显示密钥'}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  密钥保存在您的浏览器 LocalStorage 中，不会泄露至外部服务器。
                </p>
              </div>

              {/* API 接口端点地址 */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  API 接口端点 (Endpoint URL)
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => {
                    setEndpoint(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="https://api.deepseek.com/v1/chat/completions"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  支持填入完整 <code>/chat/completions</code> 地址或 BaseURL（系统会自动补全规范化）。
                </span>
              </div>

              {/* 模型名称与快捷切换 */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  模型名称 (Model)
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="如：deepseek-v4-flash 或 v4-flash"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />

                {/* 快捷常用模型标签 */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-500">推荐可选模型：</span>
                  {activePreset.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModel(m);
                        setTestResult(null);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                        model === m
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* 连通性测试按钮与反馈卡片 */}
              <div className="pt-2 border-t border-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-400 ${isTesting ? 'animate-bounce' : ''}`} />
                    <span>{isTesting ? '正在测试连接...' : '⚡ 一键测试 API 连通性'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>高级选项</span>
                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* 测试结果提示 */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in ${
                      testResult.success
                        ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="leading-relaxed">
                      {testResult.success ? (
                        <span>{testResult.message}</span>
                      ) : (
                        <div>
                          <strong className="block mb-0.5">连接未能成功响应：</strong>
                          <span className="font-mono text-[11px] opacity-90">{testResult.error}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 高级选项面板 */}
              {showAdvanced && (
                <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-850 space-y-3 animate-in fade-in">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>生成随机性 / 创造力 (Temperature):</span>
                      <span className="text-indigo-400 font-mono font-bold">{temp}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.05}
                      value={temp}
                      onChange={(e) => setTemp(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0.0 (最严谨准确)</span>
                      <span>0.7 (标准小说创作)</span>
                      <span>1.5 (极度发散脑洞)</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-300 font-semibold block">网络通路：经由本地后端中转代理</span>
                      <span className="text-[10px] text-slate-500">
                        若直连某些第三方网关遭遇浏览器 CORS 跨域限制，勾选此项通过后端 8000 端口转发
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={useBackendProxy}
                      onChange={(e) => setUseBackendProxy(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. 全书文风指南与严格禁忌词 */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <span className="font-semibold text-slate-300 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>全书文风硬约束与过滤库</span>
            </span>

            <div>
              <label className="block text-slate-400 mb-1">叙事基调与语言准则</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="冷峻克制，重智斗博弈，重因果逻辑"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                全书严格禁止的成语/套话 (设定稽查员将扫描拦截)
              </label>
              <input
                type="text"
                value={forbidden}
                onChange={(e) => setForbidden(e.target.value)}
                placeholder="恐怖如斯、倒吸一口凉气、嘴角泛起一抹冷笑"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* 底部保存按钮 */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-xl transition"
          >
            取消
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-950 transition active:scale-95"
          >
            保存并应用配置
          </button>
        </div>
      </form>
    </div>
  );
};
