// ==============================================================================
// 分镜节拍卡编辑模态框 (Scene Beat Edit Modal)
// 允许作者自由微调分镜目标、冲突、转折与结局，并提供字段悬停指引与 AI 智能推演
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Scene, Chapter, Character } from '../../types/novel';
import { FieldExplainer } from '../common/FieldExplainer';
import {
  X,
  Target,
  Sparkles,
  Save,
  RefreshCw,
  User,
  MapPin,
  Flame,
  Shuffle,
  Flag,
} from 'lucide-react';

interface SceneEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene?: Scene;
  chapter?: Chapter;
  characters: Character[];
  onSave: (updated: Partial<Scene>) => void;
  onAiSuggestBeats?: (sceneIndex: number) => Promise<{
    sceneGoal?: string;
    conflict?: string;
    turnPoint?: string;
    outcome?: string;
    location?: string;
  } | null>;
}

export const SceneEditModal: React.FC<SceneEditModalProps> = ({
  isOpen,
  onClose,
  scene,
  chapter,
  characters,
  onSave,
  onAiSuggestBeats,
}) => {
  const [goal, setGoal] = useState('');
  const [conflict, setConflict] = useState('');
  const [turnPoint, setTurnPoint] = useState('');
  const [outcome, setOutcome] = useState('');
  const [location, setLocation] = useState('');
  const [involvedIds, setInvolvedIds] = useState<string[]>([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  useEffect(() => {
    if (scene) {
      setGoal(scene.sceneGoal || '');
      setConflict(scene.conflict || '');
      setTurnPoint(scene.turnPoint || '');
      setOutcome(scene.outcome || '');
      setLocation(scene.location || '');
      setInvolvedIds(scene.involvedCharacterIds || []);
    }
  }, [scene, isOpen]);

  if (!isOpen || !scene) return null;

  const handleToggleChar = (charId: string) => {
    setInvolvedIds((prev) =>
      prev.includes(charId) ? prev.filter((id) => id !== charId) : [...prev, charId]
    );
  };

  const handleAiSuggest = async () => {
    if (!onAiSuggestBeats || isAiGenerating) return;
    setIsAiGenerating(true);
    try {
      const suggested = await onAiSuggestBeats(scene.sceneIndex);
      if (suggested) {
        if (suggested.sceneGoal) setGoal(suggested.sceneGoal);
        if (suggested.conflict) setConflict(suggested.conflict);
        if (suggested.turnPoint) setTurnPoint(suggested.turnPoint);
        if (suggested.outcome) setOutcome(suggested.outcome);
        if (suggested.location) setLocation(suggested.location);
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      sceneGoal: goal.trim(),
      conflict: conflict.trim(),
      turnPoint: turnPoint.trim(),
      outcome: outcome.trim(),
      location: location.trim(),
      involvedCharacterIds: involvedIds,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <Target className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>编辑分镜节拍卡</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/50 text-indigo-300">
                  第 {scene.sceneIndex} 幕
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                所属章节：第 {chapter?.chapterIndex || 1} 章 {chapter?.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAiSuggestBeats && (
              <button
                type="button"
                onClick={handleAiSuggest}
                disabled={isAiGenerating}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                title="根据前文大纲与因果关系让AI自动推演节拍"
              >
                {isAiGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>AI 智能推演节拍</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 表单内容区 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* 1. 场景目标 (Goal) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>场景目标 (Scene Goal)</span>
                <FieldExplainer
                  title="场景目标 (Scene Goal)"
                  what="主角在本幕想要达成的具体、可见的即时行动目标（不可泛化）。"
                  why="目标是驱动主角行动的核心引擎。缺少目标的场景会沦为无重心的水文；AI执笔将紧扣此目标展开剧情。"
                  example="林越压制肩伤，借溶洞阴煞设伏诱敌（而不是单纯的'林越在溶洞疗伤'）"
                  position="right"
                />
              </label>
              <span className="text-[10px] text-slate-500">主角这幕想干成什么？</span>
            </div>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="例如：林越压制肩伤，借溶洞阴煞伪装，设下地煞阴火埋伏..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* 2. 阻碍与冲突 (Conflict) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>阻碍与冲突 (Conflict)</span>
                <FieldExplainer
                  title="阻碍与冲突 (Conflict)"
                  what="阻止主角顺利达成目标的敌对力量、险恶环境、时间限制或内在心魔。"
                  why="无阻碍则无戏剧张力（No Conflict, No Story）。阻碍迫使主角动用底牌，是产生爽感与追读代入感的前提。"
                  example="真元严重透支，夜枭血蝙蝠探子在洞口盘旋封死退路"
                  position="right"
                />
              </label>
              <span className="text-[10px] text-slate-500">什么在阻挠主角达成目标？</span>
            </div>
            <textarea
              rows={2}
              value={conflict}
              onChange={(e) => setConflict(e.target.value)}
              placeholder="例如：真元溃散，夜枭的猎杀神识顺着血迹迫近，溶洞唯一出口被封死..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          {/* 3. 核心转折点 (Turn Point) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span>核心转折点 (Turn Point)</span>
                <FieldExplainer
                  title="核心转折点 (Turn Point)"
                  what="打破原本预期、让局面突然反向或异化的意外变数（戏剧节拍）。"
                  why="转折打破读者的心理预见性，带来'意料之外、情理之中'的追读快感，也是情节不可逆推进的关键齿轮。"
                  example="青铜残片与溶洞古石壁共鸣，意外发现万年前的上古残阵"
                  position="right"
                />
              </label>
              <span className="text-[10px] text-slate-500">发生了什么让局面突变？</span>
            </div>
            <textarea
              rows={2}
              value={turnPoint}
              onChange={(e) => setTurnPoint(e.target.value)}
              placeholder="例如：青铜残片与溶洞古纹路产生强烈共鸣，竟意外激发了上古残阵的死穴生门..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          {/* 4. 场景结果与后果 (Outcome) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-emerald-400" />
                <span>场景结果与后果 (Outcome)</span>
                <FieldExplainer
                  title="场景结果与后果 (Outcome)"
                  what="本幕对抗尘埃落定后的实质改变，直接成为下一幕的原因（因果闭环）。"
                  why="幕间关联的生死纽带！上一幕的结果直接转化为下一幕的新危机，保证小说逻辑严密环环相扣。"
                  example="放弃直接逃遁，决定借上古地利伏击歼敌（引申为下一幕的伏击战）"
                  position="right"
                />
              </label>
              <span className="text-[10px] text-slate-500">本幕结束时的实质结果（将成为下一幕的因）</span>
            </div>
            <textarea
              rows={2}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="例如：成功诱杀魔宗护法，逼迫夜枭动用金丹法相，但溶洞退路被震塌..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          {/* 5. 地点与在场角色 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>发生地点 (Location)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：坠星崖古溶洞入口裂谷"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>在场登场角色</span>
                <FieldExplainer
                  title="在场登场角色"
                  what="勾选此场景登场、参与互动的人物。"
                  why="AI起草只会让勾选的在场角色发声与行动，稽查器也会严格依据在场人员的状态机进行合规检验。"
                  example="勾选主角【林越】与反派【夜枭】"
                  position="left"
                />
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                {characters.length === 0 ? (
                  <span className="text-[11px] text-slate-500 py-1">暂无角色，可在角色中心创建</span>
                ) : (
                  characters.map((c) => {
                    const checked = involvedIds.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleToggleChar(c.id)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                          checked
                            ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 底部按钮栏 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 font-medium rounded-lg hover:bg-slate-800 transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>保存分镜卡</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
