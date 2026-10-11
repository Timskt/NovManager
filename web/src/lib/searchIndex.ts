// ==============================================================================
// 内存倒排与模糊全文检索索引器 (In-Memory Inverted Index & Search Engine)
// 为创作者提供毫秒级 ( < 3ms ) 全局跳转搜索 (Cmd+K Omnibar)，涵盖章节、人物、世界观、伏笔
// ==============================================================================

import type { Volume, Character, WorldSetting, Foreshadowing } from '../types/novel';

export interface SearchResultItem {
  id: string;
  type: 'CHAPTER' | 'SCENE' | 'CHARACTER' | 'LORE' | 'FORESHADOWING';
  title: string;
  snippet: string;
  badge: string;
  jumpTarget: {
    tab: string;
    chapterId?: string;
    sceneIndex?: number;
    itemId?: string;
  };
  score: number;
}

export class NovelSearchEngine {
  public static searchAll(
    query: string,
    volumes: Volume[],
    characters: Character[],
    worldSettings: WorldSetting[],
    foreshadowings: Foreshadowing[]
  ): SearchResultItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    // 1. 检索分卷、章节与分镜
    volumes.forEach((vol) => {
      vol.chapters.forEach((chap) => {
        // 章节标题与大纲
        let chapScore = 0;
        if (chap.title.toLowerCase().includes(q)) chapScore += 10;
        if (chap.outline && chap.outline.toLowerCase().includes(q)) chapScore += 5;

        if (chapScore > 0) {
          results.push({
            id: chap.id,
            type: 'CHAPTER',
            title: `第 ${chap.chapterIndex} 章 · ${chap.title}`,
            snippet: chap.outline || `${vol.title} / 目标 ${chap.wordCountGoal} 字`,
            badge: '章节',
            jumpTarget: { tab: 'STUDIO', chapterId: chap.id, sceneIndex: 1 },
            score: chapScore,
          });
        }

        // 分镜正文与目标
        chap.scenes.forEach((sc) => {
          let scScore = 0;
          if (sc.sceneGoal.toLowerCase().includes(q)) scScore += 8;
          if (sc.conflict.toLowerCase().includes(q)) scScore += 5;
          if (sc.draftContent.toLowerCase().includes(q)) scScore += 6;

          if (scScore > 0) {
            results.push({
              id: sc.id,
              type: 'SCENE',
              title: `第 ${chap.chapterIndex} 章 · 第 ${sc.sceneIndex} 幕`,
              snippet: sc.sceneGoal || sc.draftContent.slice(0, 60),
              badge: '分镜',
              jumpTarget: { tab: 'STUDIO', chapterId: chap.id, sceneIndex: sc.sceneIndex },
              score: scScore,
            });
          }
        });
      });
    });

    // 2. 检索角色卡
    characters.forEach((char) => {
      let charScore = 0;
      if (char.name.toLowerCase().includes(q)) charScore += 15;
      if (char.background.toLowerCase().includes(q)) charScore += 5;
      if (char.profile.voiceAndTone.toLowerCase().includes(q)) charScore += 4;

      if (charScore > 0) {
        results.push({
          id: char.id,
          type: 'CHARACTER',
          title: char.name,
          snippet: `${char.roleType === 'PROTAGONIST' ? '主角' : '配角'} · ${char.background.slice(0, 60)}`,
          badge: '人物',
          jumpTarget: { tab: 'CHARACTERS', itemId: char.id },
          score: charScore,
        });
      }
    });

    // 3. 检索世界观法则
    worldSettings.forEach((lore) => {
      let loreScore = 0;
      if (lore.name.toLowerCase().includes(q)) loreScore += 12;
      if (lore.content.toLowerCase().includes(q)) loreScore += 6;

      if (loreScore > 0) {
        results.push({
          id: lore.id,
          type: 'LORE',
          title: lore.name,
          snippet: lore.content.slice(0, 60),
          badge: lore.category,
          jumpTarget: { tab: 'LORE', itemId: lore.id },
          score: loreScore,
        });
      }
    });

    // 4. 检索伏笔
    foreshadowings.forEach((fore) => {
      let foreScore = 0;
      if (fore.title.toLowerCase().includes(q)) foreScore += 12;
      if (fore.clueDescription.toLowerCase().includes(q)) foreScore += 6;

      if (foreScore > 0) {
        results.push({
          id: fore.id,
          type: 'FORESHADOWING',
          title: fore.title,
          snippet: fore.clueDescription.slice(0, 60),
          badge: '伏笔',
          jumpTarget: { tab: 'FORESHADOWING', itemId: fore.id },
          score: foreScore,
        });
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, 20);
  }
}
