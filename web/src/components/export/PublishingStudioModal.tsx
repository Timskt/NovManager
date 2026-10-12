// ==============================================================================
// 全格式出版级排版导出工坊 (Multi-Format Publishing Studio)
// 支持标准中文网文 TXT (全角首行缩进)、Markdown 书籍工程卷包及出版级排版编译
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { useBrand } from '../BrandLogo';
import { FileDown, Copy, Check, X, BookOpen, FileText, Download } from 'lucide-react';

interface PublishingStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PublishingStudioModal: React.FC<PublishingStudioModalProps> = ({ isOpen, onClose }) => {
  const { novel, volumes } = useNovel();
  const { brand } = useBrand();
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'markdown' | 'summary'>('txt');
  const [copied, setCopied] = useState(false);

  // 编译全书正文
  const compiledText = React.useMemo(() => {
    let output = '';
    let totalWords = 0;

    if (selectedFormat === 'txt') {
      output += `书名：《${novel.title}》\n`;
      if (novel.subtitle) output += `副标题：${novel.subtitle}\n`;
      output += `作者 / 品牌主理人：${brand.brandAuthor} (「${brand.sealText}」藏书印)\n`;
      output += `出品平台：${brand.brandName} (${brand.brandSubtitle})\n`;
      output += `题材：${novel.genre}\n`;
      output += `视角：${novel.defaultPov}\n`;
      output += `----------------------------------------\n\n`;

      volumes.forEach((v) => {
        output += `【${v.title}】\n\n`;
        v.chapters.forEach((c) => {
          output += `第 ${c.chapterIndex} 章 ${c.title}\n\n`;
          c.scenes.forEach((sc) => {
            const draft = sc.draftContent || '';
            totalWords += draft.length;
            if (draft) {
              const paragraphs = draft.split('\n');
              paragraphs.forEach((p) => {
                const trimmed = p.trim();
                if (trimmed) {
                  // 中文标准两全角空格缩进
                  output += `　　${trimmed}\n`;
                }
              });
              output += '\n';
            }
          });
          output += '\n';
        });
      });
      if (brand.exportWatermark) {
        output += `----------------------------------------\n${brand.exportWatermark}\n`;
      }
    } else if (selectedFormat === 'markdown') {
      output += `# ${novel.title}\n\n`;
      output += `> **作者**：${brand.brandAuthor} (「${brand.sealText}」印) | **出品**：${brand.brandName} | **题材**：${novel.genre} | **视角**：${novel.defaultPov}\n\n---\n\n`;

      volumes.forEach((v) => {
        output += `## ${v.title}\n\n`;
        if (v.summary) output += `*卷纲走向：${v.summary}*\n\n`;
        v.chapters.forEach((c) => {
          output += `### 第 ${c.chapterIndex} 章 · ${c.title}\n\n`;
          c.scenes.forEach((sc) => {
            if (sc.draftContent) {
              output += `${sc.draftContent}\n\n`;
            }
          });
        });
      });
      if (brand.exportWatermark) {
        output += `\n---\n> ${brand.exportWatermark}\n`;
      }
    } else {
      // 全书大纲与设定白皮书
      output += `# 《${novel.title}》创世设定与架构全书白皮书\n\n`;
      output += `> 品牌出品：**${brand.brandName}** · 主理人：**${brand.brandAuthor}** (「${brand.sealText}」印)\n\n`;
      output += `## 核心文风指南\n`;
      output += `- 基调：${novel.styleGuide?.tone || '严谨'}\n`;
      output += `- 节奏：${novel.styleGuide?.pacing || '紧凑'}\n`;
      output += `- 禁忌词库：${(novel.styleGuide?.forbiddenPhrases || []).join('、')}\n\n`;

      output += `## 卷章结构总览\n`;
      volumes.forEach((v) => {
        output += `### ${v.title}\n`;
        output += `核心矛盾：${v.mainConflict}\n`;
        output += `终局高潮：${v.targetClimax}\n`;
        v.chapters.forEach((c) => {
          output += `- 第 ${c.chapterIndex} 章 ${c.title} (${c.wordCountGoal}字)\n`;
        });
        output += '\n';
      });
      if (brand.exportWatermark) {
        output += `\n---\n> ${brand.exportWatermark}\n`;
      }
    }

    return output;
  }, [novel, volumes, selectedFormat, brand]);

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = selectedFormat === 'txt' ? 'txt' : 'md';
    const blob = new Blob([compiledText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${novel.title}_${selectedFormat}_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        {/* 顶栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 className="font-bold text-lg font-literary-serif">出版级排版导出工坊</h3>
              <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
                为《{novel.title}》自动编译符合中文网文及出版社标准规范的格式文件
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 格式选择与操作栏 */}
        <div className="flex items-center justify-between px-6 py-3 border-b text-xs font-literary-sans" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedFormat('txt')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${selectedFormat === 'txt' ? 'bg-amber-600 text-white shadow-xs' : 'hover:opacity-75'}`}
            >
              网文标准 TXT (全角缩进)
            </button>
            <button
              onClick={() => setSelectedFormat('markdown')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${selectedFormat === 'markdown' ? 'bg-amber-600 text-white shadow-xs' : 'hover:opacity-75'}`}
            >
              标准 Markdown (整本卷包)
            </button>
            <button
              onClick={() => setSelectedFormat('summary')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${selectedFormat === 'summary' ? 'bg-amber-600 text-white shadow-xs' : 'hover:opacity-75'}`}
            >
              设定与架构白皮书
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border flex items-center gap-1.5 hover:opacity-85 transition"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)' }}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制全文'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg text-white font-medium flex items-center gap-1.5 hover:opacity-90 transition"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载文件</span>
            </button>
          </div>
        </div>

        {/* 文本预览区 */}
        <div className="flex-1 p-6 overflow-y-auto">
          <textarea
            readOnly
            value={compiledText}
            className="w-full h-96 p-4 rounded-xl border bg-transparent outline-none font-mono text-xs leading-relaxed resize-none"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
          />
        </div>
      </div>
    </div>
  );
};
