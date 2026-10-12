// ==============================================================================
// 人物档案、动态状态机与人际关系网络视图 (Character & State Machine View)
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Character, CharacterState, CharacterRelation, RoleType } from '../../types/novel';
import {
  Users,
  UserPlus,
  Activity,
  HeartHandshake,
  Trash2,
  Edit,
  MapPin,
  Flame,
  Plus,
  X,
  BookOpen,
  Sparkles,
} from 'lucide-react';

import { NavTab } from '../Header';

interface CharacterViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const CharacterView: React.FC<CharacterViewProps> = ({ onNavigateTab }) => {
  const {
    characters,
    characterStates,
    characterRelations,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    updateCharacterState,
    updateCharacterRelation,
    deleteCharacterRelation,
    getCharacterStateAtChapter,
    activeChapter,
    volumes,
  } = useNovel();

  const [selectedCharId, setSelectedCharId] = useState<string>(
    characters[0]?.id || ''
  );

  // 弹窗显隐状态
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [showAddStateModal, setShowAddStateModal] = useState(false);

  // 角色表单通用状态 (用于新增与编辑)
  const [name, setName] = useState('');
  const [roleType, setRoleType] = useState<RoleType>('SUPPORTING');
  const [gender, setGender] = useState('男');
  const [identity, setIdentity] = useState('');
  const [background, setBackground] = useState('');
  const [appearance, setAppearance] = useState('');
  const [traits, setTraits] = useState('');
  const [motivation, setMotivation] = useState('');
  const [voice, setVoice] = useState('');
  const [flaw, setFlaw] = useState('');

  // 关系表单状态
  const [relationId, setRelationId] = useState('');
  const [targetCharId, setTargetCharId] = useState('');
  const [relationType, setRelationType] = useState('同门同僚 / 互信盟友');
  const [affinityScore, setAffinityScore] = useState<number>(60);
  const [relationDesc, setRelationDesc] = useState('');

  // 新增状态跃迁表单
  const [stateChapterIndex, setStateChapterIndex] = useState<number>(activeChapter?.chapterIndex || 1);
  const [stateLoc, setStateLoc] = useState('');
  const [statePower, setStatePower] = useState('');
  const [stateHealth, setStateHealth] = useState<CharacterState['healthStatus']>('HEALTHY');
  const [stateTags, setStateTags] = useState('');
  const [stateSummary, setStateSummary] = useState('');

  const selectedChar = characters.find((c) => c.id === selectedCharId) || characters[0];
  const charStates = characterStates
    .filter((s) => s.characterId === selectedChar?.id)
    .sort((a, b) => (a.chapterIndex || 1) - (b.chapterIndex || 1));
  const relations = characterRelations.filter(
    (r) => r.fromCharacterId === selectedChar?.id || r.toCharacterId === selectedChar?.id
  );

  // 打开新增角色弹窗
  const handleOpenAddModal = () => {
    setName('');
    setRoleType('SUPPORTING');
    setGender('男');
    setIdentity('');
    setBackground('');
    setAppearance('');
    setTraits('');
    setMotivation('');
    setVoice('');
    setFlaw('');
    setShowAddModal(true);
  };

  // 提交新增角色
  const handleCreateCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCharacter({
      name: name.trim(),
      roleType,
      gender,
      background: background.trim(),
      profile: {
        identity: identity.trim(),
        appearance: appearance.trim(),
        personalityTraits: traits.split(/[,， ]+/).filter(Boolean),
        coreMotivation: motivation.trim(),
        voiceAndTone: voice.trim(),
        fatalFlaw: flaw.trim(),
        catchphrases: [],
      },
    });
    setShowAddModal(false);
  };

  // 打开编辑角色弹窗
  const handleOpenEditModal = () => {
    if (!selectedChar) return;
    setName(selectedChar.name);
    setRoleType(selectedChar.roleType);
    setGender(selectedChar.gender || '男');
    setIdentity(selectedChar.profile?.identity || '');
    setBackground(selectedChar.background || '');
    setAppearance(selectedChar.profile?.appearance || '');
    setTraits(selectedChar.profile?.personalityTraits?.join(', ') || '');
    setMotivation(selectedChar.profile?.coreMotivation || '');
    setVoice(selectedChar.profile?.voiceAndTone || '');
    setFlaw(selectedChar.profile?.fatalFlaw || '');
    setShowEditModal(true);
  };

  // 提交编辑角色档案
  const handleUpdateCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChar || !name.trim()) return;
    updateCharacter(selectedChar.id, {
      name: name.trim(),
      roleType,
      gender,
      background: background.trim(),
      profile: {
        ...selectedChar.profile,
        identity: identity.trim(),
        appearance: appearance.trim(),
        personalityTraits: traits.split(/[,， ]+/).filter(Boolean),
        coreMotivation: motivation.trim(),
        voiceAndTone: voice.trim(),
        fatalFlaw: flaw.trim(),
      },
    });
    setShowEditModal(false);
  };

  // 打开添加关系弹窗
  const handleOpenAddRelation = () => {
    if (!selectedChar) return;
    const availableTargets = characters.filter((c) => c.id !== selectedChar.id);
    setRelationId('');
    setTargetCharId(availableTargets[0]?.id || '');
    setRelationType('同门同僚 / 互信盟友');
    setAffinityScore(60);
    setRelationDesc('');
    setShowRelationModal(true);
  };

  // 打开编辑关系弹窗
  const handleOpenEditRelation = (rel: CharacterRelation) => {
    if (!selectedChar) return;
    const otherId = rel.fromCharacterId === selectedChar.id ? rel.toCharacterId : rel.fromCharacterId;
    setRelationId(rel.id);
    setTargetCharId(otherId);
    setRelationType(rel.relationType);
    setAffinityScore(rel.affinityScore);
    setRelationDesc(rel.description);
    setShowRelationModal(true);
  };

  // 提交保存关系
  const handleSaveRelation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChar || !targetCharId) return;
    updateCharacterRelation({
      fromCharacterId: selectedChar.id,
      toCharacterId: targetCharId,
      relationType: relationType.trim(),
      affinityScore: Number(affinityScore),
      description: relationDesc.trim(),
    });
    setShowRelationModal(false);
  };

  // 提交新增状态跃迁
  const handleAddState = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChar || !stateSummary.trim()) return;
    const chapIdx = stateChapterIndex || 1;
    let chapId = `chap-${String(chapIdx).padStart(3, '0')}`;
    for (const v of volumes) {
      const c = v.chapters.find((ch) => ch.chapterIndex === chapIdx);
      if (c) {
        chapId = c.id;
        break;
      }
    }
    updateCharacterState({
      characterId: selectedChar.id,
      chapterId: chapId,
      chapterIndex: chapIdx,
      location: stateLoc.trim() || '当前所处地点',
      combatPower: statePower.trim() || '当前战力境界',
      healthStatus: stateHealth,
      statusTags: stateTags.split(/[,， ]+/).filter(Boolean),
      stateSummary: stateSummary.trim(),
    });
    setShowAddStateModal(false);
    setStateSummary('');
    setStateTags('');
  };

  // 羁绊分值的情感解析与色彩计算
  const getAffinityBadge = (score: number) => {
    if (score >= 70) {
      return { label: '生死契阔 / 绝对信任', color: 'text-emerald-400 bg-emerald-950/70 border-emerald-800/60' };
    } else if (score >= 30) {
      return { label: '互信亲善 / 坚定盟友', color: 'text-teal-300 bg-teal-950/70 border-teal-800/60' };
    } else if (score >= 0) {
      return { label: '萍水相逢 / 普通交情', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' };
    } else if (score >= -40) {
      return { label: '暗中戒备 / 互有嫌隙', color: 'text-amber-400 bg-amber-950/70 border-amber-800/60' };
    } else {
      return { label: '不共戴天 / 生死死敌', color: 'text-red-400 bg-red-950/70 border-red-800/60' };
    }
  };

  return (
    <div
      className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 顶部标题与创建 */}
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Users className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <span>人物档案与动态状态机 (Character & SoT)</span>
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              左侧选择人物；右侧一体化记录「静态人设/身份」、「人际羁绊网络」与随章节推进的「物理状态机演化」。
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateTab && (
              <>
                <button
                  onClick={() => onNavigateTab('MEMORY_GUARD')}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 hover:bg-emerald-500/10"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>防幻觉生死/境界锁 ↗</span>
                </button>
                <button
                  onClick={() => onNavigateTab('RELATIONS')}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 hover:bg-indigo-500/10"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-indigo-400" />
                  <span>关系图谱 ↗</span>
                </button>
                <button
                  onClick={() => onNavigateTab('STUDIO')}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 hover:bg-amber-500/10"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>返回创作台 ↗</span>
                </button>
              </>
            )}
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <UserPlus className="w-4 h-4" />
              <span>新增登场人物</span>
            </button>
          </div>
        </div>

        {/* 主体分栏：左侧角色卡选择，右侧详情与状态机 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 角色卡列表 (左 4 栏) */}
          <div className="col-span-1 md:col-span-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs px-1 font-medium" style={{ color: 'var(--text-muted)' }}>
              <span>登场人物列表 ({characters.length})</span>
            </div>

            {characters.map((char) => {
              const isSelected = char.id === selectedChar?.id;
              const latestState = getCharacterStateAtChapter
                ? getCharacterStateAtChapter(char.id)
                : characterStates.find((s) => s.characterId === char.id);
              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                    isSelected
                      ? 'shadow-md ring-1'
                      : 'hover:border-opacity-80'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--accent-surface)' : 'var(--bg-surface)',
                    borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                        {char.name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          char.roleType === 'PROTAGONIST'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : char.roleType === 'ANTAGONIST'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : char.roleType === 'SUPPORTING'
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            : 'bg-stone-500/15 text-stone-400 border border-stone-500/20'
                        }`}
                      >
                        {char.roleType === 'PROTAGONIST'
                          ? '主角'
                          : char.roleType === 'ANTAGONIST'
                          ? '反派'
                          : char.roleType === 'SUPPORTING'
                          ? '配角'
                          : 'NPC'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        latestState?.healthStatus === 'HEALTHY'
                          ? 'text-emerald-500 bg-emerald-500/10'
                          : latestState?.healthStatus === 'INJURED'
                          ? 'text-amber-500 bg-amber-500/10'
                          : 'text-rose-500 bg-rose-500/10'
                      }`}
                    >
                      {latestState?.healthStatus || '正常'}
                    </span>
                  </div>

                  {char.profile?.identity && (
                    <p className="text-[11px] font-medium line-clamp-1 flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                      <span style={{ color: 'var(--text-faint)' }}>身份:</span> {char.profile.identity}
                    </p>
                  )}

                  <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                    动机：{char.profile?.coreMotivation || '暂未设置'}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {char.profile?.personalityTraits?.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.2 rounded border"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 角色详细档案、状态机与羁绊网络 (右 8 栏) */}
          {selectedChar && (
            <div className="col-span-1 md:col-span-8 space-y-6">
              {/* 1. 静态人设 Profile */}
              <div
                className="rounded-2xl p-5 space-y-4 border shadow-sm"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                      <span>{selectedChar.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          selectedChar.roleType === 'PROTAGONIST'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : selectedChar.roleType === 'ANTAGONIST'
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : selectedChar.roleType === 'SUPPORTING'
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                            : 'bg-stone-500/15 text-stone-400 border border-stone-500/20'
                        }`}
                      >
                        {selectedChar.roleType === 'PROTAGONIST'
                          ? '主角 (Protagonist)'
                          : selectedChar.roleType === 'ANTAGONIST'
                          ? '反派 (Antagonist)'
                          : selectedChar.roleType === 'SUPPORTING'
                          ? '核心配角 (Supporting)'
                          : '过客/NPC'}
                      </span>
                    </h3>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      性别：{selectedChar.gender || '未知'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenEditModal}
                      className="px-2.5 py-1.5 text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm border"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--accent-primary)',
                      }}
                      title="编辑人物档案"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>编辑档案</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`确定要删除角色【${selectedChar.name}】吗？这将一并移除其状态机和关联羁绊！`)) {
                          deleteCharacter(selectedChar.id);
                        }
                      }}
                      className="p-1.5 transition rounded-lg hover:text-rose-400"
                      style={{ color: 'var(--text-faint)' }}
                      title="删除角色"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 身份头衔显著条 */}
                <div
                  className="rounded-xl p-3 flex items-center justify-between text-xs border"
                  style={{ backgroundColor: 'var(--accent-surface)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>社会身份与势力头衔：</span>
                    </span>
                    <span className="font-medium" style={{ color: 'var(--text-main)' }}>
                      {selectedChar.profile?.identity || '暂未指定身份与头衔'}
                    </span>
                  </div>
                </div>

                {/* 核心设定网格 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>核心动机 (Goal / 欲望)</span>
                    <p
                      className="leading-relaxed p-2.5 rounded-lg border min-h-[48px]"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      {selectedChar.profile?.coreMotivation || '暂无设定'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-rose-500 font-semibold">
                      致命弱点 (Fatal Flaw / 软肋)
                    </span>
                    <p
                      className="leading-relaxed p-2.5 rounded-lg border min-h-[48px]"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      {selectedChar.profile?.fatalFlaw || '暂无设定'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>语言风格与口癖 (Voice & Tone)</span>
                    <p
                      className="leading-relaxed p-2.5 rounded-lg border min-h-[48px]"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      {selectedChar.profile?.voiceAndTone || '暂无设定'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>外貌与标志物 (Appearance)</span>
                    <p
                      className="leading-relaxed p-2.5 rounded-lg border min-h-[48px]"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      {selectedChar.profile?.appearance || '暂无设定'}
                    </p>
                  </div>

                  {/* 人物生平前史背景 */}
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                      <span>生平背景与身世前史 (Background & Lore)</span>
                    </span>
                    <p
                      className="leading-relaxed p-3 rounded-lg border"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      {selectedChar.background || '暂未记录生平身世背景'}
                    </p>
                  </div>

                  {/* 性格特质标签 */}
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>性格特质标签 (防 OOC 基线)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedChar.profile?.personalityTraits && selectedChar.profile.personalityTraits.length > 0 ? (
                        selectedChar.profile.personalityTraits.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md border text-xs"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--accent-primary)',
                            }}
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs italic" style={{ color: 'var(--text-faint)' }}>暂未设置性格特质标签</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 与外界人物羁绊网络 (Character Relationships) */}
              <div
                className="rounded-2xl p-5 space-y-4 border shadow-sm"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="w-4 h-4 text-pink-400" />
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                      与外界人物羁绊网络 ({relations.length})
                    </h3>
                  </div>

                  <button
                    onClick={handleOpenAddRelation}
                    className="px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 border"
                    style={{
                      backgroundColor: 'var(--accent-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加人物羁绊</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {relations.length === 0 ? (
                    <div
                      className="text-center py-6 border border-dashed rounded-xl space-y-2"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        【{selectedChar.name}】暂未与其他角色建立人际羁绊网络
                      </p>
                      <button
                        onClick={handleOpenAddRelation}
                        className="text-xs font-medium inline-flex items-center gap-1"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        <Plus className="w-3.5 h-3.5" /> 立即记录第一条羁绊
                      </button>
                    </div>
                  ) : (
                    relations.map((rel) => {
                      const otherId =
                        rel.fromCharacterId === selectedChar.id
                          ? rel.toCharacterId
                          : rel.fromCharacterId;
                      const otherChar = characters.find((c) => c.id === otherId);
                      const badgeInfo = getAffinityBadge(rel.affinityScore);

                      return (
                        <div
                          key={rel.id}
                          className="rounded-xl p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                {otherChar?.name || '未知角色'}
                              </span>
                              {otherChar?.roleType && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded border"
                                  style={{
                                    backgroundColor: 'var(--bg-surface)',
                                    borderColor: 'var(--border-subtle)',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {otherChar.roleType === 'PROTAGONIST'
                                    ? '主角'
                                    : otherChar.roleType === 'ANTAGONIST'
                                    ? '反派'
                                    : '配角'}
                                </span>
                              )}
                              <span
                                className="px-2 py-0.5 rounded text-[11px] font-medium border"
                                style={{
                                  backgroundColor: 'var(--accent-surface)',
                                  borderColor: 'var(--border-subtle)',
                                  color: 'var(--accent-primary)',
                                }}
                              >
                                【{rel.relationType}】
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${badgeInfo.color}`}
                              >
                                {badgeInfo.label}
                              </span>
                            </div>

                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                              {rel.description || '暂无详细背景演变描述'}
                            </p>
                          </div>

                          <div
                            className="flex items-center gap-3 sm:border-l sm:pl-3 justify-between sm:justify-end"
                            style={{ borderColor: 'var(--border-subtle)' }}
                          >
                            <div className="text-right">
                              <span
                                className={`font-mono text-sm font-bold block ${
                                  rel.affinityScore > 0
                                    ? 'text-emerald-500'
                                    : rel.affinityScore < 0
                                    ? 'text-rose-500'
                                    : ''
                                }`}
                                style={rel.affinityScore === 0 ? { color: 'var(--text-muted)' } : undefined}
                              >
                                {rel.affinityScore > 0 ? `+${rel.affinityScore}` : rel.affinityScore}
                              </span>
                              <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                                羁绊度 (-100~100)
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditRelation(rel)}
                                className="p-1 rounded transition hover:text-indigo-400"
                                style={{ color: 'var(--text-muted)' }}
                                title="编辑羁绊"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`确定要移除与【${otherChar?.name}】的羁绊关系吗？`)) {
                                    deleteCharacterRelation(rel.id);
                                  }
                                }}
                                className="p-1 rounded transition hover:text-rose-400"
                                style={{ color: 'var(--text-faint)' }}
                                title="删除羁绊"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. 动态状态演进机 (Timeline State Machine) */}
              <div
                className="rounded-2xl p-5 space-y-4 border shadow-sm"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                      时间线动态状态机 (随着剧情推进的物理状态记录)
                    </h3>
                  </div>

                  <button
                    onClick={() => setShowAddStateModal(true)}
                    className="px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 border"
                    style={{
                      backgroundColor: 'var(--accent-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>记录状态跃迁</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {charStates.length === 0 ? (
                    <p className="text-xs italic py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      该角色尚无时间线跃迁记录，随着剧情章节推进，可在此记录其生理损伤、战力境界与随身机缘。
                    </p>
                  ) : (
                    charStates.map((st) => (
                      <div
                        key={st.id}
                        className="rounded-xl p-3.5 text-xs space-y-2 relative border"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded font-semibold border"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--accent-primary)',
                              }}
                            >
                              第 {st.chapterIndex || '?'} 章
                            </span>
                            <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--text-main)' }}>
                              <MapPin className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
                              {st.location}
                            </span>
                            <span style={{ color: 'var(--text-faint)' }}>•</span>
                            <span className="text-amber-500 flex items-center gap-1 font-medium">
                              <Flame className="w-3 h-3 text-amber-500" />
                              {st.combatPower}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                              st.healthStatus === 'HEALTHY'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : st.healthStatus === 'INJURED'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                            }`}
                          >
                            {st.healthStatus === 'HEALTHY'
                              ? '良好 (Healthy)'
                              : st.healthStatus === 'INJURED'
                              ? '负伤 (Injured)'
                              : st.healthStatus === 'CRITICAL'
                              ? '濒危 (Critical)'
                              : '垂死 (Dying)'}
                          </span>
                        </div>

                        <p className="leading-relaxed" style={{ color: 'var(--text-main)' }}>
                          {st.stateSummary}
                        </p>

                        {st.statusTags && st.statusTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {st.statusTags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-2 py-0.5 rounded border"
                                style={{
                                  backgroundColor: 'var(--accent-surface)',
                                  borderColor: 'var(--border-subtle)',
                                  color: 'var(--accent-primary)',
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 弹窗 1：新增角色档案弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateCharacter}
            className="rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>新增登场人物档案</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">姓名 / 称谓 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：苏青瑶"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">角色定位</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as RoleType)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  <option value="PROTAGONIST">主角 (Protagonist)</option>
                  <option value="ANTAGONIST">反派 (Antagonist)</option>
                  <option value="SUPPORTING">核心配角 (Supporting)</option>
                  <option value="NPC">过客/NPC</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">性别</label>
                <input
                  type="text"
                  placeholder="男 / 女 / 未知"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">社会身份与势力头衔 (Identity)</label>
                <input
                  type="text"
                  placeholder="例如：太虚剑宗真传弟子 / 魔宗少主"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">
                  生平背景与身世秘密 (Background)
                </label>
                <textarea
                  rows={2}
                  placeholder="简述其出身、过往重大事件或隐秘前史..."
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">
                  性格特质 (逗号隔开)
                </label>
                <input
                  type="text"
                  placeholder="例如：极度谨慎, 隐忍坚毅, 杀伐果断"
                  value={traits}
                  onChange={(e) => setTraits(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">核心动机 (Goal / 欲望)</label>
                <input
                  type="text"
                  placeholder="例如：追查灭族真相，求存长生"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">致命心理缺陷 (Flaw / 软肋)</label>
                <input
                  type="text"
                  placeholder="例如：过度多疑，极难信任同伴"
                  value={flaw}
                  onChange={(e) => setFlaw(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">语言习惯与口癖 (Voice)</label>
                <input
                  type="text"
                  placeholder="例如：惜字如金，少用反问，面对强敌不放狠话"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">外貌特征与标志性物品 (Appearance)</label>
                <input
                  type="text"
                  placeholder="例如：青灰道袍，眉眼如刀削，左手食指常年握剑老茧"
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 text-xs rounded-lg border transition cursor-pointer hover:opacity-80"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md"
              >
                保存人设
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 弹窗 2：编辑角色档案弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleUpdateCharacter}
            className="rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-400" />
                <span>编辑【{selectedChar?.name}】的人设档案</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">姓名 / 称谓 *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">角色定位</label>
                <select
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as RoleType)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  <option value="PROTAGONIST">主角 (Protagonist)</option>
                  <option value="ANTAGONIST">反派 (Antagonist)</option>
                  <option value="SUPPORTING">核心配角 (Supporting)</option>
                  <option value="NPC">过客/NPC</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">性别</label>
                <input
                  type="text"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">社会身份与势力头衔 (Identity)</label>
                <input
                  type="text"
                  placeholder="例如：太虚剑宗外门杂役弟子 -> 绝剑峰真传剑修"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">
                  生平背景与身世前史 (Background)
                </label>
                <textarea
                  rows={2}
                  placeholder="人物前史、灭族来历或隐藏身世..."
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">
                  性格特质 (逗号隔开)
                </label>
                <input
                  type="text"
                  value={traits}
                  onChange={(e) => setTraits(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">核心动机 (Goal / 欲望)</label>
                <input
                  type="text"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">致命弱点 (Flaw / 软肋)</label>
                <input
                  type="text"
                  value={flaw}
                  onChange={(e) => setFlaw(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">语言习惯与口癖 (Voice)</label>
                <input
                  type="text"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">外貌特征与标志性物品 (Appearance)</label>
                <input
                  type="text"
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-3.5 py-1.5 text-xs rounded-lg border transition cursor-pointer hover:opacity-80"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md"
              >
                更新档案
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 弹窗 3：添加/编辑人物羁绊关系弹窗 */}
      {showRelationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveRelation}
            className="rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-pink-400" />
                <span>
                  {relationId ? '编辑' : '记录'}【{selectedChar?.name}】的人际羁绊
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRelationModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  目标关联角色 (与谁产生羁绊)
                </label>
                <select
                  required
                  value={targetCharId}
                  onChange={(e) => setTargetCharId(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  {characters
                    .filter((c) => c.id !== selectedChar?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.roleType === 'PROTAGONIST' ? '主角' : c.roleType === 'ANTAGONIST' ? '反派' : '配角'}) {c.profile?.identity ? `· ${c.profile.identity}` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">关系类型定位</label>
                <input
                  type="text"
                  required
                  placeholder="例如：同门同僚 / 互信盟友、生死死敌、师徒..."
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['同门同僚 / 互信盟友', '生死死敌 / 宿命仇杀', '师徒传承', '道侣眷侣', '同门暗竞', '父女 / 掌教与弟子', '主仆部属'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRelationType(preset)}
                      className="text-[10px] px-1.5 py-0.5 rounded border transition"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">
                    羁绊好感/敌意值 (-100 ~ +100)
                  </label>
                  <span
                    className={`font-mono font-bold ${
                      affinityScore > 0
                        ? 'text-emerald-400'
                        : affinityScore < 0
                        ? 'text-red-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {affinityScore > 0 ? `+${affinityScore}` : affinityScore}
                  </span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={affinityScore}
                  onChange={(e) => setAffinityScore(parseInt(e.target.value) || 0)}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                  <span className="text-red-400">-100 (不死不休)</span>
                  <span className="text-slate-400">0 (冷漠过客)</span>
                  <span className="text-emerald-400">+100 (生死不渝)</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">
                  关系背景与动态演变描述
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="描述两人是如何结识的、经历过何种事件、信任或仇恨的底层逻辑..."
                  value={relationDesc}
                  onChange={(e) => setRelationDesc(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRelationModal(false)}
                className="px-3.5 py-1.5 text-xs rounded-lg border transition cursor-pointer hover:opacity-80"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-pink-600 hover:bg-pink-500 rounded-lg shadow-md"
              >
                保存羁绊
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 弹窗 4：新增状态跃迁弹窗 */}
      {showAddStateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddState}
            className="rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>记录【{selectedChar?.name}】的状态机跃迁</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStateModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  发生章节 (故事线时间线节点)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="例如：1 表示第1章，12 表示第12章"
                  value={stateChapterIndex}
                  onChange={(e) => setStateChapterIndex(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  创作工作台会根据作者当前所编辑的章节自动沿时间线回溯角色此快照。
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">最新所处地点</label>
                <input
                  type="text"
                  placeholder="例如：坠星崖底古溶洞"
                  value={stateLoc}
                  onChange={(e) => setStateLoc(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">当前战力境界</label>
                <input
                  type="text"
                  placeholder="例如：筑基后期（真元透支）"
                  value={statePower}
                  onChange={(e) => setStatePower(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">生理健康状态</label>
                <select
                  value={stateHealth}
                  onChange={(e) => setStateHealth(e.target.value as any)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  <option value="HEALTHY">良好 (Healthy)</option>
                  <option value="INJURED">负伤 (Injured)</option>
                  <option value="CRITICAL">濒危/经脉破损 (Critical)</option>
                  <option value="DYING">垂死 (Dying)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">状态标签 (逗号隔开)</label>
                <input
                  type="text"
                  placeholder="左肩贯穿伤, 获得残片, 中毒"
                  value={stateTags}
                  onChange={(e) => setStateTags(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">状态变化详细梗概</label>
                <textarea
                  rows={2}
                  required
                  placeholder="简述本段剧情如何改变了该角色的生理或心理状态..."
                  value={stateSummary}
                  onChange={(e) => setStateSummary(e.target.value)}
                  className="w-full rounded-lg p-2 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddStateModal(false)}
                className="px-3.5 py-1.5 text-xs rounded-lg border transition cursor-pointer hover:opacity-80"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-md"
              >
                记录跃迁
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
