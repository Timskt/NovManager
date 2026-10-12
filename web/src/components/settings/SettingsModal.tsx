// ==============================================================================
// 系统与大模型设置弹窗 (Settings Modal)
// 支持 DeepSeek 官方接口、OpenCode-Go 接口、OpenAPI / OpenAI 兼容接口直连配置与连通性测试
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import { LLM_PRESETS, testLLMConnection, normalizeEndpoint, ConnectionTestResult } from '../../lib/aiPresets';
import { LLMProviderType, ModelProvider } from '../../types/novel';
import { fetchModelProviders, saveModelProvider, deleteModelProvider } from '../../lib/api';
import {
  Settings,
  X,
  Cpu,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  Server,
  Sparkles,
  Plus,
  Trash2,
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

  // 多自定义渠道簿状态 (与多模型中枢共享持久化池)
  const [savedProviders, setSavedProviders] = useState<ModelProvider[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [customProfileName, setCustomProfileName] = useState<string>('');
  const [profileBanner, setProfileBanner] = useState<string | null>(null);

  // 连通性测试状态
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  // 文风与禁忌词
  const [tone, setTone] = useState(novel.styleGuide.tone);
  const [forbidden, setForbidden] = useState(
    novel.styleGuide.forbiddenPhrases.join('、')
  );

  useEffect(() => {
    if (isOpen) {
      fetchModelProviders().then((list) => setSavedProviders(list));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 切换供应商预设
  const handleSelectProvider = (pid: LLMProviderType) => {
    const preset = LLM_PRESETS[pid];
    setProvider(pid);
    setEndpoint(preset.endpoint);
    setModel(preset.defaultModel);
    setTestResult(null);
  };

  // 从已保存的多自定义渠道簿一键加载
  const handleSelectSavedProfile = (prov: ModelProvider) => {
    setActiveProfileId(prov.id);
    setCustomProfileName(prov.name);
    setProvider(prov.providerType === 'DEEPSEEK' ? 'deepseek' : prov.providerType === 'OLLAMA' ? 'ollama_local' : 'openai_custom');
    const normalized = prov.baseUrl.endsWith('/chat/completions')
      ? prov.baseUrl
      : `${prov.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    setEndpoint(normalized);
    setApiKey(prov.apiKeys[prov.activeKeyIndex] || prov.apiKeys[0] || '');
    setModel(prov.supportedModels[0] || 'deepseek-chat');
    setTestResult(null);
    setProfileBanner(`⚡ 已切换至自定义渠道「${prov.name}」`);
    setTimeout(() => setProfileBanner(null), 3000);
  };

  // 将当前填写的 Endpoint + Key + Model 另存为新的自定义提供商
  const handleSaveAsNewCustomProvider = async () => {
    const nameToSave =
      customProfileName.trim() || `自定义中转渠道 #${savedProviders.length + 1}`;
    const cleanBaseUrl = endpoint.replace(/\/chat\/completions\/?$/, '');
    const newProv: ModelProvider = {
      id: `prov-custom-${Date.now()}`,
      name: nameToSave,
      providerType: 'CUSTOM',
      baseUrl: cleanBaseUrl || endpoint,
      apiKeys: [apiKey.trim() || 'sk-custom-key'],
      activeKeyIndex: 0,
      supportedModels: [model.trim() || 'deepseek-r1'],
      rpmLimit: 240,
      tpmLimit: 400000,
      isEnabled: true,
      healthStatus: 'HEALTHY',
      latencyMs: 95,
      lastCheckedAt: new Date().toISOString(),
    };
    await saveModelProvider(newProv);
    setSavedProviders((prev) => [newProv, ...prev]);
    setActiveProfileId(newProv.id);
    setProfileBanner(`🎉 已将「${newProv.name}」存入多自定义渠道簿，随时可一键切换！`);
    setTimeout(() => setProfileBanner(null), 3500);
  };

  const handleRemoveSavedProfile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteModelProvider(id);
    setSavedProviders((prev) => prev.filter((p) => p.id !== id));
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
        className="rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
      >
        {/* 顶部标题与关闭 */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>AI 大模型直连与多自定义渠道配置</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg transition hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* 1. 运行模式选择卡片 */}
          <div
            className="border rounded-xl p-3 space-y-2"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="font-semibold block" style={{ color: 'var(--text-main)' }}>AI Agent 推理运行模式</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUseMock(true)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  useMock
                    ? 'border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'hover:border-indigo-500/40'
                }`}
                style={
                  useMock
                    ? { backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }
                    : { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }
                }
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>极速仿真模式 (离线演示)</span>
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  免 API Key，内置全套思维链推演与长篇小说起草模拟引擎
                </p>
              </button>

              <button
                type="button"
                onClick={() => setUseMock(false)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  !useMock
                    ? 'border-amber-500/80 ring-1 ring-amber-500/30'
                    : 'hover:border-indigo-500/40'
                }`}
                style={
                  !useMock
                    ? { backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }
                    : { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }
                }
              >
                <div className="font-bold flex items-center gap-1.5 text-xs text-amber-500">
                  <Globe className="w-4 h-4 text-amber-500" />
                  <span>真实大模型 API 直连（支持多自定义提供商）</span>
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  直连多个自定义 OneAPI/NewAPI 中转站、DeepSeek、OpenRouter 等
                </p>
              </button>
            </div>
          </div>

          {/* 2. 真实 API 参数配置区 */}
          {!useMock && (
            <div
              className="border rounded-xl p-4 space-y-4 animate-in fade-in"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              {/* 已保存的多自定义提供商渠道簿 (一键切换不丢 Key) */}
              <div
                className="p-3 rounded-xl border space-y-2.5"
                style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                    <Server className="w-3.5 h-3.5 text-indigo-400" />
                    <span>我的多自定义提供商渠道簿 ({savedProviders.length}) — 点击秒级切换，自动记忆各自 Key</span>
                  </span>
                </div>

                {profileBanner && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[11px] font-medium">
                    {profileBanner}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {savedProviders.map((sp) => {
                    const isCurrent = activeProfileId === sp.id || endpoint.includes(sp.baseUrl);
                    return (
                      <div
                        key={sp.id}
                        onClick={() => handleSelectSavedProfile(sp)}
                        className={`group px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 cursor-pointer transition-all ${
                          isCurrent
                            ? 'border-indigo-500 bg-indigo-500/10 font-semibold'
                            : 'hover:border-indigo-500/40'
                        }`}
                        style={{
                          color: 'var(--text-main)',
                          borderColor: isCurrent ? undefined : 'var(--border-subtle)',
                          backgroundColor: isCurrent ? undefined : 'var(--bg-surface)',
                        }}
                      >
                        <span className="truncate max-w-[150px]">{sp.name}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded opacity-70 font-mono" style={{ backgroundColor: 'var(--bg-card)' }}>
                          {sp.supportedModels[0]?.slice(0, 14) || sp.providerType}
                        </span>
                        {sp.id.startsWith('prov-custom') && (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveSavedProfile(sp.id, e)}
                            className="opacity-50 hover:opacity-100 text-rose-400 ml-0.5"
                            title="删除此自定义渠道"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 将当前下方配置另存为新的自定义提供商 */}
                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <input
                    type="text"
                    value={customProfileName}
                    onChange={(e) => setCustomProfileName(e.target.value)}
                    placeholder="给当前自定义提供商起个名字（如：主力NewAPI二号站）..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg border text-[11px]"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveAsNewCustomProvider}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>另存为新渠道</span>
                  </button>
                </div>
              </div>

              {/* 供应商预设平铺选择 */}
              <div>
                <label className="block font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
                  或选择标准协议模板 (一键自动填入默认地址与模型)
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
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer hover:opacity-90 ${
                          isSelected
                            ? 'shadow-md'
                            : ''
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--accent-primary)', color: 'var(--text-main)' }
                            : { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }
                        }
                      >
                        <div>
                          <div className="font-bold text-[11px] line-clamp-1">{item.name}</div>
                          <div className="text-[9px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                            {item.tag}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[9px] font-semibold mt-1 flex items-center gap-0.5" style={{ color: 'var(--accent-primary)' }}>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>已选</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {activePreset.description}
                </p>
              </div>

              {/* API Key 输入框 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
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
                    className="w-full border rounded-xl p-2.5 pr-9 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
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
                  className="w-full border rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
                <span className="text-[10px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                  支持填入完整 <code>/chat/completions</code> 地址或 BaseURL（系统会自动补全规范化）。
                </span>
              </div>

              {/* 模型名称与快捷切换 */}
              <div className="space-y-1.5">
                <label className="block font-semibold" style={{ color: 'var(--text-main)' }}>
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
                  className="w-full border rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />

                {/* 快捷常用模型标签 */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>推荐可选模型：</span>
                  {activePreset.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModel(m);
                        setTestResult(null);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono transition border hover:opacity-80"
                      style={
                        model === m
                          ? { backgroundColor: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)' }
                          : { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* 连通性测试按钮与反馈卡片 */}
              <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 font-semibold rounded-xl border flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer hover:opacity-85"
                    style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
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
                <div className="p-3.5 rounded-xl border space-y-3 animate-in fade-in" style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
                  <div>
                    <div className="flex justify-between mb-1" style={{ color: 'var(--text-muted)' }}>
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
          <div
            className="border rounded-xl p-3.5 space-y-3"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="font-semibold block flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>全书文风硬约束与过滤库</span>
            </span>

            <div>
              <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>叙事基调与语言准则</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="冷峻克制，重智斗博弈，重因果逻辑"
                className="w-full rounded-xl p-2.5 border focus:outline-none focus:border-indigo-500 text-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              />
            </div>

            <div>
              <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>
                全书严格禁止的成语/套话 (设定稽查员将扫描拦截)
              </label>
              <input
                type="text"
                value={forbidden}
                onChange={(e) => setForbidden(e.target.value)}
                placeholder="恐怖如斯、倒吸一口凉气、嘴角泛起一抹冷笑"
                className="w-full rounded-xl p-2.5 border focus:outline-none focus:border-indigo-500 text-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              />
            </div>
          </div>
        </div>

        {/* 底部保存按钮 */}
        <div className="flex justify-end gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs rounded-xl border transition hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            取消
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition active:scale-95 cursor-pointer"
          >
            保存并应用配置
          </button>
        </div>
      </form>
    </div>
  );
};
