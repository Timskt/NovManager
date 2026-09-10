// ==============================================================================
// 大模型供应商预设与连接测试工具库 (LLM Presets & Connection Utilities)
// 支持 DeepSeek 官方直连、OpenCode-Go 接口、OpenAPI / OpenAI 兼容接口与本地 Ollama
// ==============================================================================

import { LLMProviderPreset, LLMProviderType } from '../types/novel';

export const LLM_PRESETS: Record<LLMProviderType, LLMProviderPreset> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek 官方接口',
    tag: '官方直连 · 最新 V4 Flash',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-v4-flash',
    models: [
      'deepseek-v4-flash',
      'v4-flash',
      'deepseek-v4-pro',
      'deepseek-chat',
      'deepseek-reasoner',
    ],
    description:
      'DeepSeek 官方开放平台，默认支持最新 100万上下文 V4 Flash 旗舰模型，兼顾超高推理速度与超长篇记忆。',
    keyPlaceholder: 'sk-... (从 platform.deepseek.com 申请)',
    docUrl: 'https://platform.deepseek.com/api_keys',
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode-Go 接口',
    tag: 'OpenCode Zen · 官方直通',
    endpoint: 'https://opencode.ai/zen/go/v1/chat/completions',
    defaultModel: 'deepseek-v4-flash',
    models: [
      'deepseek-v4-flash',
      'v4-flash',
      'deepseek-v4-pro',
      'deepseek-v4-flash-vision-exp',
      'claude-3-5-sonnet',
      'gpt-4o',
    ],
    description:
      'OpenCode Zen / Go 官方高性能网关，直通最新 DeepSeek-V4 Flash / Pro 及 Claude、GPT 全球顶尖大模型。',
    keyPlaceholder: 'sk-... (输入 OpenCode / Zen API Key)',
    docUrl: 'https://opencode.ai',
  },
  openai_custom: {
    id: 'openai_custom',
    name: 'OpenAPI / 自定义兼容接口',
    tag: '通用规范 · OneAPI/NewAPI/中转',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'claude-3-5-sonnet-20241022',
      'deepseek-ai/DeepSeek-V3',
      'qwen-max',
      'moonshot-v1-32k',
    ],
    description:
      '标准 OpenAI / OpenAPI 规范接口，可直连 OpenAI 官方或任何第三方中转（OneAPI、NewAPI、硅基流动、月之暗面等）。',
    keyPlaceholder: 'sk-... (对应中转站或平台的 API 密钥)',
  },
  ollama_local: {
    id: 'ollama_local',
    name: '本地 Ollama / vLLM',
    tag: '本地私有 · 零费用 · 离线可用',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    defaultModel: 'deepseek-r1:latest',
    models: [
      'deepseek-r1:latest',
      'deepseek-chat:latest',
      'qwen2.5:14b',
      'qwen2.5:72b',
      'llama3.3:latest',
    ],
    description:
      '本机显卡或 CPU 私有化运行，零费用、数据完全不出本地，支持 Ollama、LM Studio、vLLM。',
    keyPlaceholder: '无需密钥（直接留空即可）',
  },
};

/**
 * 自动规范化接口地址：将用户输入的域名或 BaseURL 补全为标准的 /chat/completions 端点
 */
export function normalizeEndpoint(rawUrl: string): string {
  if (!rawUrl || !rawUrl.trim()) {
    return 'https://api.deepseek.com/v1/chat/completions';
  }
  let url = rawUrl.trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) {
    return url;
  }
  if (url.endsWith('/v1')) {
    return `${url}/chat/completions`;
  }
  return `${url}/v1/chat/completions`;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs?: number;
  message?: string;
  error?: string;
}

/**
 * 测试大模型 API 连通性
 * 优先支持浏览器直接 ping，若遇到跨域 CORS 拦截可自动降级走后端代理
 */
export async function testLLMConnection(
  endpoint: string,
  apiKey: string,
  model: string,
  useBackendProxy = false
): Promise<ConnectionTestResult> {
  const normEndpoint = normalizeEndpoint(endpoint);
  const startTime = Date.now();

  // 1. 如果指定走后端代理
  if (useBackendProxy) {
    try {
      const resp = await fetch('http://localhost:8000/api/llm/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: normEndpoint,
          api_key: apiKey || '',
          model: model.trim(),
        }),
      });
      const data = await resp.json();
      if (data.success) {
        return {
          success: true,
          latencyMs: data.latency_ms,
          message: `连接成功！响应延迟 ${data.latency_ms}ms（经由后端中转）`,
        };
      }
      return { success: false, error: data.error || '连接失败' };
    } catch (e: any) {
      return {
        success: false,
        error: `后端代理服务连接失败: ${e.message}。请确保本地后端在运行 (http://localhost:8000)`,
      };
    }
  }

  // 2. 默认浏览器直连
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const resp = await fetch(normEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model.trim(),
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
    });

    const elapsed = Date.now() - startTime;

    if (resp.ok) {
      return {
        success: true,
        latencyMs: elapsed,
        message: `直连成功！响应延迟 ${elapsed}ms，模型 [${model}] 正常响应`,
      };
    } else {
      const errText = await resp.text();
      return {
        success: false,
        latencyMs: elapsed,
        error: `HTTP ${resp.status}: ${errText.slice(0, 150)}`,
      };
    }
  } catch (err: any) {
    // 若浏览器直连被 CORS 拦截（常见于某些第三方代理未配 Access-Control-Allow-Origin）
    // 自动尝试后端代理测试一次
    try {
      const proxyResp = await fetch('http://localhost:8000/api/llm/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: normEndpoint,
          api_key: apiKey || '',
          model: model.trim(),
        }),
      });
      const proxyData = await proxyResp.json();
      if (proxyData.success) {
        return {
          success: true,
          latencyMs: proxyData.latency_ms,
          message: `直连被浏览器 CORS 拦截，但通过后端中转成功连接！延迟 ${proxyData.latency_ms}ms（建议勾选“使用后端中转代理”）`,
        };
      }
    } catch {
      // 忽略后端尝试
    }

    return {
      success: false,
      error: `直连失败: ${err.message} (若被浏览器跨域安全策略拦截，可勾选“使用后端中转代理”)`,
    };
  }
}
