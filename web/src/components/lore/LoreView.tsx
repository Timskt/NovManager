// ==============================================================================
// 世界观、战力体系与法则库视图 (Lore & World-Building View)
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { LoreCategory, WorldSetting } from '../../types/novel';
import {
  Sparkles,
  Plus,
  Search,
  Trash2,
  Tag,
  Shield,
  MapPin,
  Flame,
  Key,
  BookOpen,
} from 'lucide-react';

export const LoreView: React.FC = () => {
  const { worldSettings, addWorldSetting, deleteWorldSetting } = useNovel();
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // 表单状态
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LoreCategory>('POWER_SYSTEM');
  const [priority, setPriority] = useState(80);
  const [aliases, setAliases] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');

  const filtered = worldSettings.filter((item) => {
    const matchCat = selectedCat === 'ALL' || item.category === selectedCat;
    const matchQuery =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.aliases.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  const handleCreateLore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    addWorldSetting({
      category,
      name,
      priority,
      aliases: aliases.split(/[,， ]+/).filter(Boolean),
      tags: tags.split(/[,， ]+/).filter(Boolean),
      content,
    });
    setShowAddModal(false);
    setName('');
    setContent('');
    setAliases('');
    setTags('');
  };

  const getCategoryIcon = (cat: LoreCategory) => {
    switch (cat) {
      case 'POWER_SYSTEM':
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case 'FACTION':
        return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
      case 'GEOGRAPHY':
        return <MapPin className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ITEM':
        return <Key className="w-3.5 h-3.5 text-pink-400" />;
      case 'RULE':
        return <BookOpen className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div
      className="flex-1 p-6 overflow-y-auto transition-colors"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 顶部标题与操作栏 */}
        <div
          className="flex items-center justify-between pb-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>世界观与战力法则库 (Lore & Hard Constraints)</span>
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              定义不可动摇的世界观底层铁律与战力境界，Agent 在起草与稽查时将强制作为硬约束执行。
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Plus className="w-4 h-4" />
            <span>新建法则设定</span>
          </button>
        </div>

        {/* 筛选与搜索 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div
            className="flex items-center gap-1.5 p-1 rounded-xl border text-xs overflow-x-auto"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            {[
              { id: 'ALL', label: '全部设定' },
              { id: 'POWER_SYSTEM', label: '战力体系' },
              { id: 'FACTION', label: '门派势力' },
              { id: 'ITEM', label: '神兵异宝' },
              { id: 'GEOGRAPHY', label: '地理险地' },
              { id: 'RULE', label: '世界铁律' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCat(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition flex-shrink-0 ${
                  selectedCat === tab.id ? 'font-semibold shadow-sm' : ''
                }`}
                style={{
                  backgroundColor: selectedCat === tab.id ? 'var(--bg-card)' : 'transparent',
                  color: selectedCat === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="搜索条目、别名或规则..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none transition border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>

        {/* 设定卡片列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              未找到匹配的设定条目
            </div>
          ) : (
            filtered.map((lore) => (
              <div
                key={lore.id}
                className="border rounded-2xl p-4 space-y-3 shadow-lg transition"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="p-1.5 rounded-lg border"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    >
                      {getCategoryIcon(lore.category)}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold font-serif" style={{ color: 'var(--text-main)' }}>
                        {lore.name}
                      </h3>
                      {lore.aliases.length > 0 && (
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          别名: {lore.aliases.join('、')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-medium border"
                      style={{
                        backgroundColor: 'var(--accent-surface)',
                        color: 'var(--accent-primary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      权重 {lore.priority}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(`确定要删除设定【${lore.name}】吗？`)) {
                          deleteWorldSetting(lore.id);
                        }
                      }}
                      className="p-1 hover:text-red-400 transition"
                      style={{ color: 'var(--text-muted)' }}
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className="border rounded-xl p-3 text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  {lore.content}
                </div>

                {lore.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {lore.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 border"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-muted)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 新建设定弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateLore}
            className="border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>新建世界观或战力法则</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>设定名称</label>
                  <input
                    type="text"
                    required
                    placeholder="例如：万宝楼通商法典"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border rounded-lg p-2 focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>类别归属</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LoreCategory)}
                    className="w-full border rounded-lg p-2 focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value="POWER_SYSTEM">战力体系 (Power System)</option>
                    <option value="FACTION">门派阵营 (Faction)</option>
                    <option value="ITEM">神兵异宝 (Item)</option>
                    <option value="GEOGRAPHY">地理环境 (Geography)</option>
                    <option value="RULE">天道法则 (Rule)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>别名 (逗号隔开)</label>
                  <input
                    type="text"
                    placeholder="如：商盟, 宝楼"
                    value={aliases}
                    onChange={(e) => setAliases(e.target.value)}
                    className="w-full border rounded-lg p-2 focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>标签</label>
                  <input
                    type="text"
                    placeholder="中立, 经济, 禁令"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full border rounded-lg p-2 focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>详细法则与运作规则</label>
                <textarea
                  rows={5}
                  required
                  placeholder="详细写明运行规律、等级阶梯、硬性约束与触发反噬后果..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:outline-none font-mono text-xs"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg transition border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white rounded-lg shadow-md transition"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                保存设定
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
