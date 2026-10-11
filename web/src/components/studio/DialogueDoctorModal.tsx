// ==============================================================================
// 角色对白深度调优与潜台词诊所 (Smart Dialogue Doctor & Subtext Clinic)
// 消除角色机械说话与纸片人腔调，注入潜台词交锋、微表情动作与专属声线
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { MessageSquare, Sparkles, Check, X, ArrowRight, User } from 'lucide-react';

interface DialogueDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToEditor: (text: string) => void;
}

export const DialogueDoctorModal: React.FC<DialogueDoctorModalProps> = ({
  isOpen,
  onClose,
  onInsertToEditor,
}) => {
  const { characters } = useNovel();
  const [selectedCharId, setSelectedCharId] = useState(characters[0]?.id || '');
  const [emotionTone, setEmotionTone] = useState('暗藏杀意与机锋');
  const [rawDialogue, setRawDialogue] = useState('“你不要过来，否则休怪我不客气了。”');
  const [doctorResult, setDoctorResult] = useState<{
    polished: string;
    subtext: string;
    beats: string[];
  } | null>(null);

  const selectedChar = characters.find((c) => c.id === selectedCharId);

  const handleDiagnose = () => {
    const speakerName = selectedChar?.name || '角色';
    // 启发式对白重塑
    setDoctorResult({
      polished: `“……”${speakerName}指节在腰间冰冷残剑上轻叩了两记，未曾抬眸，声如寒玉淬冰，“再踏前一步，你连求饶的资格都不会有。”`,
      subtext: '表面低调克制，实则已锁定敌手罩门死穴，给予对手极限心理威慑。',
      beats: [
        '话音落下前有两秒死寂停顿',
        '右手食指微扣剑格，杀意凝而不发',
        '眼睑低垂，视线从对方咽喉移至脚下阴影',
      ],
    });
  };

  const handleApply = () => {
    if (doctorResult) {
      onInsertToEditor(`\n\n${doctorResult.polished}\n\n`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 className="font-bold text-lg font-literary-serif">角色对白深度调优与潜台词诊所</h3>
              <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
                让每一句台词都带有角色的性格特质与身体动作节拍，彻底摆脱AI机械对话
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1 font-literary-sans">发话角色</label>
              <select
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.profile.voiceAndTone || '常态'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1 font-literary-sans">当前戏剧心境 / 氛围</label>
              <input
                type="text"
                value={emotionTone}
                onChange={(e) => setEmotionTone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1 font-literary-sans">原始台词（或草拟构思）</label>
            <textarea
              rows={2}
              value={rawDialogue}
              onChange={(e) => setRawDialogue(e.target.value)}
              className="w-full p-3 rounded-xl border text-xs outline-none resize-none font-literary-serif"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
            />
          </div>

          <div className="text-right">
            <button
              onClick={handleDiagnose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              诊断并淬炼台词与动作节拍
            </button>
          </div>

          {doctorResult && (
            <div className="p-4 rounded-xl border space-y-3 mt-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}>
              <div>
                <span className="text-xs font-bold block text-emerald-600 mb-1">淬炼后高光对白：</span>
                <p className="text-sm font-literary-serif leading-relaxed p-2.5 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  {doctorResult.polished}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold block" style={{ color: 'var(--accent-primary)' }}>潜台词深意：</span>
                <p className="text-xs opacity-80">{doctorResult.subtext}</p>
              </div>

              <div>
                <span className="text-xs font-bold block" style={{ color: 'var(--text-muted)' }}>伴随微表情与肢体动作：</span>
                <ul className="list-disc pl-5 text-xs opacity-75 space-y-0.5">
                  {doctorResult.beats.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="text-right pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  onClick={handleApply}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  一键写入正文光标处
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
