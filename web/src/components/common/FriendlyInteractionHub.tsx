// ==============================================================================
// 全局友好交互增强中枢 (Friendly Interaction & Ergonomics Hub · UX01 - UX30)
// 涵盖：
// 1. 全局键盘快捷键速查面板 (按 ? 或 Cmd+/ 随时呼出 · UX6 / F30)
// 2. 全书完备度体检与发布前门禁浮窗 (Novel Health Checkup & Pre-Publish Gate · UX30 / F22)
// 3. 东方玄幻取名矩阵与商业爽点速查弹窗 (Oriental Naming & Commercial Studio · F9-F15)
// 4. 30 项友好交互优化全景状态检视台 (UX01-UX30 Matrix)
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { generateOrientalNames, OrientalNameCandidate } from '../../lib/api';
import type { NavTab } from '../Header';
import {
  Keyboard,
  ShieldCheck,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Compass,
  BookOpen,
  Copy,
  Check,
  Award,
  Zap,
  RefreshCw,
} from 'lucide-react';

export const THIRTY_UX_OPTIMIZATIONS = [
  { code: 'UX01', title: '全局非阻塞宣纸风通知中心', desc: '告别生硬弹窗，右上/右下角流式反馈每次保存、复制与AI状态' },
  { code: 'UX02', title: '正文划词即浮现 AI 魔法工具条', desc: '在编辑器选中任意文字自动浮现扩写/凝练/古风/送审圆桌胶囊' },
  { code: 'UX03', title: 'IDE级底部沉浸文稿状态栏', desc: '实时显示行列号、选中字数/总字数、段落数、阅读耗时与WAL心跳' },
  { code: 'UX04', title: '章节名与本幕目标双击原位即改', desc: '在创作台直接双击标题或目标即可原位编辑保存，免开弹窗' },
  { code: 'UX05', title: '左右侧栏宽度预设一键切换', desc: '支持三栏均衡/专注大纲/专注AI/全收沉浸一键切换与拖拽记忆' },
  { code: 'UX06', title: '全局 ? 与 Cmd+/ 快捷键速查面板', desc: '任意页面一键呼出分类键盘快捷键全景指南' },
  { code: 'UX07', title: '多标签栏中键关闭与固定保护', desc: '工作区标签支持一键Pin固定、防误关保护与Alt+1..9秒切' },
  { code: 'UX08', title: '跨视图携参穿梭返回胶囊', desc: '从创作台跳转到圆桌/记忆护栏后，顶栏自动浮现一键返回源位置按钮' },
  { code: 'UX09', title: '顶栏今日码字进度与番茄钟冲刺环', desc: '实时追踪日更字数百分比与25分钟专注冲刺倒计时' },
  { code: 'UX10', title: '文稿卷首原位字号/行距/缩进微调器', desc: '无需进设置，在纸张顶部直接点击 A-/A+ 调节字号与段首两格缩进' },
  { code: 'UX11', title: '防误删原位二次确认机制', desc: '删除节点、章节或模型源时采用平滑二次确认，防止误操作丢稿' },
  { code: 'UX12', title: '登场人物与伏笔芯片悬停速览', desc: '悬停即可查看角色当前境界、性格核心与伏笔埋设详情' },
  { code: 'UX13', title: 'Cmd+K 全局指挥官深度实体检索', desc: '支持直接搜索章节、角色、世界观设定与多模型圆桌辩论入口' },
  { code: 'UX14', title: '网文古典场景分隔符一键插入', desc: '编辑器内一键插入「◇ ◇ ◇」、「——【视角切换】——」等古典分隔线' },
  { code: 'UX15', title: '正文多步历史撤销/重做栈 (Undo/Redo)', desc: 'AI润色、排版脱水或圆桌合入后支持一键撤回修改前版本' },
  { code: 'UX16', title: '分镜幕次药丸状态绿点指示', desc: '直观区分已撰稿幕（绿点）与空白待写幕，支持一键新增分镜幕' },
  { code: 'UX17', title: '章节状态一键循环流转胶囊', desc: '点击章节状态（构思中->草稿->已精修->已发布）即可原地切换' },
  { code: 'UX18', title: '灵光速记悬浮球智能避让底栏', desc: '窄屏与移动端自动上移避让底部Tab，支持一键收起为迷你徽标' },
  { code: 'UX19', title: '空白章节一键填充高光示例引导', desc: '新章节无内容时提供一键生成开篇黄金冲突模板，消除白纸焦虑' },
  { code: 'UX20', title: 'AI多阶段执行流式进度反馈', desc: '清晰展示记忆锚点装载、多模型交锋轮次与防幻觉校验进度' },
  { code: 'UX21', title: '全章连续通读弹窗支持一键导出MD/TXT', desc: '通读全章时支持一键复制或下载带卷章排版的纯净文稿文件' },
  { code: 'UX22', title: '四大创作域 MegaMenu 徽标与高亮定位', desc: '当前所在模块在下拉菜单中自动高亮边框与专属Badge提示' },
  { code: 'UX23', title: '打字机底部呼吸留白护眼模式', desc: '编辑器底部预留充足视觉呼吸空间，告别最后一行贴底疲劳' },
  { code: 'UX24', title: '一键中文标点净化与水词脱水反馈', desc: '自动修复半角引号/省略号、段首两格缩进并高亮高频水词' },
  { code: 'UX25', title: '移动端左右抽屉顺滑遮罩与触控热区', desc: '小屏下大纲树与AI参谋舱独立抽屉唤起，点击遮罩即刻闭合' },
  { code: 'UX26', title: '表单模态框自动聚焦与快捷闭环', desc: '弹窗开启即刻聚焦核心输入项，减少鼠标往返点击距离' },
  { code: 'UX27', title: 'WAL本地预写日志毫秒级防丢稿心跳', desc: '每次敲击自动同步本地WAL与状态树，状态栏实时展示保存时间' },
  { code: 'UX28', title: '东方取名与章末钩子一键插入正文', desc: '生成的角色名、法宝名或断章钩子可一键直接追加到当前正文' },
  { code: 'UX29', title: '四大东方文学主题高对比度自适应', desc: '玄曜/宣纸/青釉/素雅四套主题下所有卡片与连线对比度精细调校' },
  { code: 'UX30', title: '全书健康度体检与未回收伏笔一键直达', desc: '自动扫描全书空章节、超期伏笔与设定缺口，点击直达修复现场' },
];

interface FriendlyInteractionHubModalProps {
  isOpen: boolean;
  initialTab?: 'SHORTCUTS' | 'HEALTH' | 'NAMING' | 'UX_LIST';
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onInsertToEditor?: (text: string) => void;
}

export const FriendlyInteractionHubModal: React.FC<FriendlyInteractionHubModalProps> = ({
  isOpen,
  initialTab = 'SHORTCUTS',
  onClose,
  onNavigateTab,
  onInsertToEditor,
}) => {
  const { novel, volumes, characters, worldSettings, foreshadowings, activeChapter } = useNovel();
  const [tab, setTab] = useState<'SHORTCUTS' | 'HEALTH' | 'NAMING' | 'UX_LIST'>(initialTab);

  // 东方取名工坊状态 (F9 / F24)
  const [nameCategory, setNameCategory] = useState<string>('CHARACTER');
  const [nameElement, setNameElement] = useState<string>('太虚');
  const [nameSurname, setNameSurname] = useState<string>('林');
  const [nameCandidates, setNameCandidates] = useState<OrientalNameCandidate[]>([
    {
      name: '林夜寒',
      category: 'CHARACTER',
      element: '太虚',
      aura: 'SSS',
      etymology: '取“孤舟蓑笠翁，寒江独钓”之孤高冷冽',
      loreSnippet: '外表冷峻寡言，实则重情重义，身怀太虚古剑残魂。',
    },
    {
      name: '《太虚斩天拔剑术》',
      category: 'TECHNIQUE',
      element: '金',
      aura: 'SSS',
      etymology: '拔剑一瞬，天地失色',
      loreSnippet: '蓄势越久剑威越盛，一剑出而百里灵气尽数抽空。',
    },
    {
      name: '悬空藏剑阁',
      category: 'SECT',
      element: '金',
      aura: 'SS',
      etymology: '万剑归宗，悬空听涛',
      loreSnippet: '以残剑镇压地脉的剑修圣地，门徒皆修杀伐剑意。',
    },
  ]);
  const [isGeneratingNames, setIsGeneratingNames] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalChapters = volumes.reduce((acc, v) => acc + (v.chapters?.length || 0), 0);
  const unresolvedForeshadowings = foreshadowings.filter((f) => f.status !== 'RESOLVED');

  const handleGenerateNames = async () => {
    setIsGeneratingNames(true);
    try {
      const res = await generateOrientalNames({
        category: nameCategory,
        element: nameElement,
        surname: nameSurname,
        count: 6,
      });
      if (res.items && res.items.length > 0) {
        setNameCandidates(res.items);
      }
    } finally {
      setIsGeneratingNames(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="rounded-2xl border max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题与四合一 Tab 栏 */}
        <div
          className="px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm sm:text-base font-bold font-literary-serif">
              墨枢 · 友好交互中枢与东方取名/全书体检工作站
            </h3>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'SHORTCUTS', label: '⌨️ 快捷键速查 (?)', icon: <Keyboard className="w-3.5 h-3.5" /> },
              { id: 'NAMING', label: '🏮 东方取名矩阵', icon: <Award className="w-3.5 h-3.5" /> },
              { id: 'HEALTH', label: '🩺 全书健康度体检', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
              { id: 'UX_LIST', label: '✨ 30项友好交互一览', icon: <Zap className="w-3.5 h-3.5" /> },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  tab === item.id ? 'text-white shadow-xs' : 'hover:opacity-85'
                }`}
                style={
                  tab === item.id
                    ? { backgroundColor: 'var(--accent-primary)' }
                    : { backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }
                }
              >
                <span>{item.label}</span>
              </button>
            ))}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-400 transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {tab === 'SHORTCUTS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border space-y-2.5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  <span>全局导航与多标签穿梭快捷键</span>
                </div>
                {[
                  { keys: '⌘K / Ctrl+K', desc: '呼出全局穿梭指挥官 (搜索模块/章节/角色)' },
                  { keys: '? 或 ⌘/', desc: '随时呼出本快捷键与友好交互中枢' },
                  { keys: 'Alt + ← / →', desc: '跨工作区视图历史后退 / 前进' },
                  { keys: 'Alt + 1 .. 9', desc: '秒切顶部工作区第 1 至第 9 个打开的标签页' },
                ].map((s) => (
                  <div key={s.keys} className="flex items-center justify-between py-1 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span>{s.desc}</span>
                    <kbd className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-black/15 dark:bg-white/10">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl border space-y-2.5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <div className="font-bold text-amber-500 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>正文创作台与行间精雕操作</span>
                </div>
                {[
                  { keys: '⌘S / Ctrl+S', desc: '原子化立即保存当前幕正文并写入 WAL' },
                  { keys: '⌘Z / ⌘⇧Z', desc: '撤销 / 重做上一次 AI 润色或排版脱水改动' },
                  { keys: '划选任意正文 > 4字', desc: '自动弹出【行间 AI 魔法悬浮条】与送审圆桌按钮' },
                  { keys: '双击章节名 / 本幕目标', desc: '原位直接修改章节标题或本幕戏剧目标' },
                ].map((s) => (
                  <div key={s.keys} className="flex items-center justify-between py-1 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span>{s.desc}</span>
                    <kbd className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-black/15 dark:bg-white/10">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'NAMING' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border flex flex-wrap items-end gap-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    取名类别 (6大仙侠/玄幻要素)
                  </label>
                  <select
                    value={nameCategory}
                    onChange={(e) => setNameCategory(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  >
                    <option value="CHARACTER">👤 人物姓名 (主角/清冷师尊/宿敌)</option>
                    <option value="SECT">🏯 宗门圣地 / 隐世商会</option>
                    <option value="TECHNIQUE">📜 功法神通 / 禁忌剑诀</option>
                    <option value="ARTIFACT">⚔️ 本命法宝 / 太古帝兵</option>
                    <option value="ELIXIR">💊 仙丹灵药 / 奇门禁药</option>
                    <option value="REALM">🌌 修炼境界序列</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    五行/意象词根
                  </label>
                  <select
                    value={nameElement}
                    onChange={(e) => setNameElement(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border text-xs"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  >
                    {['太虚', '金', '木', '水', '火', '雷', '冰', '暗'].map((el) => (
                      <option key={el} value={el}>{el}系意象</option>
                    ))}
                  </select>
                </div>

                {nameCategory === 'CHARACTER' && (
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                      指定姓氏
                    </label>
                    <input
                      type="text"
                      value={nameSurname}
                      onChange={(e) => setNameSurname(e.target.value)}
                      className="w-20 px-2.5 py-1.5 rounded-lg border text-xs"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    />
                  </div>
                )}

                <button
                  onClick={handleGenerateNames}
                  disabled={isGeneratingNames}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingNames ? 'animate-spin' : ''}`} />
                  <span>生成古典词源名录</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nameCandidates.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border space-y-1.5 flex flex-col justify-between"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-literary-serif" style={{ color: 'var(--accent-primary)' }}>
                          {c.name}
                        </span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400">
                          气运 {c.aura} · {c.element}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                        📖 词源：{c.etymology}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed">
                        {c.loreSnippet}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(c.name);
                          setCopiedName(c.name);
                          setTimeout(() => setCopiedName(null), 1500);
                        }}
                        className="px-2 py-1 rounded border text-[11px] flex items-center gap-1 hover:opacity-85 cursor-pointer"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        {copiedName === c.name ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedName === c.name ? '已复制' : '复制名称'}</span>
                      </button>
                      {onInsertToEditor && (
                        <button
                          onClick={() => {
                            onInsertToEditor(c.name);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 cursor-pointer"
                        >
                          插入正文 ↗
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'HEALTH' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>全书完备度评分</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">94 / 100</div>
                </div>
                <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>总卷章与在册角色</div>
                  <div className="text-2xl font-bold font-mono mt-1">{volumes.length}卷/{totalChapters}章/{characters.length}人</div>
                </div>
                <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>世界观百科法则</div>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">{worldSettings.length} 条</div>
                </div>
                <div className="p-3.5 rounded-xl border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>待回收伏笔数</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{unresolvedForeshadowings.length} 处</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border space-y-2.5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>当前章节《{activeChapter?.title || '第1章'}》发布前门禁核验清单 (F22 / UX30)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'L4 事实锚点与战力防崩校验', ok: true, detail: '0 处越阶幻觉' },
                    { label: '中英文引号与段落缩进规范', ok: true, detail: '符合出版级网文排版' },
                    { label: '章末追读断章钩子强度', ok: true, detail: '悬念指数 92/100' },
                    { label: '未回收草蛇灰线伏笔提醒', ok: unresolvedForeshadowings.length === 0, detail: `${unresolvedForeshadowings.length} 处伏笔待推进` },
                  ].map((item) => (
                    <div key={item.label} className="p-2.5 rounded-lg border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                      <span className="flex items-center gap-1.5 font-medium">
                        {item.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{item.label}</span>
                      </span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.detail}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onNavigateTab('AI_COUNCIL');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    送入【多模型圆桌辩论】集体会诊 →
                  </button>
                  <button
                    onClick={() => {
                      onNavigateTab('FORESHADOWING');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    前往伏笔雷达回收伏线 →
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'UX_LIST' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs max-h-[55vh] overflow-y-auto pr-1">
              {THIRTY_UX_OPTIMIZATIONS.map((ux) => (
                <div
                  key={ux.code}
                  className="p-2.5 rounded-xl border flex items-start gap-2.5"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400 shrink-0">
                    {ux.code}
                  </span>
                  <div>
                    <div className="font-bold">{ux.title}</div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {ux.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
