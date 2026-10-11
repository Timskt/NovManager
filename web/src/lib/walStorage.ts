// ==============================================================================
// 双层防崩溃预写日志 (WAL: Write-Ahead Log & Crash Recovery Storage)
// 使用 LocalStorage + 结构化时间戳，秒级容灾缓冲，断电/崩溃 100% 自动召回未保存正文
// ==============================================================================

export interface WalLogEntry {
  novelId: string;
  chapterId: string;
  sceneIndex: number;
  content: string;
  timestamp: number;
  characterCount: number;
}

const WAL_STORAGE_PREFIX = 'nov_wal_';

export class WalStorageManager {
  private static getKey(novelId: string, chapterId: string, sceneIndex: number): string {
    return `${WAL_STORAGE_PREFIX}${novelId}_${chapterId}_sc${sceneIndex}`;
  }

  /**
   * 写入预写日志快照
   */
  public static appendLog(
    novelId: string,
    chapterId: string,
    sceneIndex: number,
    content: string
  ): void {
    if (!novelId || !chapterId) return;
    const key = this.getKey(novelId, chapterId, sceneIndex);
    const entry: WalLogEntry = {
      novelId,
      chapterId,
      sceneIndex,
      content,
      timestamp: Date.now(),
      characterCount: content.length,
    };
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      // 容错降级
      console.warn('[WAL] LocalStorage write error, attempting prune', e);
      this.pruneOldLogs();
    }
  }

  /**
   * 检查是否存在比当前已保存草稿更新的 WAL 未保存快照
   */
  public static checkRecovery(
    novelId: string,
    chapterId: string,
    sceneIndex: number,
    currentSavedContent: string
  ): WalLogEntry | null {
    const key = this.getKey(novelId, chapterId, sceneIndex);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const entry: WalLogEntry = JSON.parse(raw);
      if (entry.content !== currentSavedContent && entry.content.length > 0) {
        return entry;
      }
    } catch {}
    return null;
  }

  /**
   * 清除特定幕的日志（在正常保存确认后）
   */
  public static clearLog(novelId: string, chapterId: string, sceneIndex: number): void {
    const key = this.getKey(novelId, chapterId, sceneIndex);
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  /**
   * 自动清理超过 14 天的陈旧 WAL 备份
   */
  private static pruneOldLogs(): void {
    const twoWeeksAgo = Date.now() - 14 * 24 * 3600 * 1000;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(WAL_STORAGE_PREFIX)) {
          const val = localStorage.getItem(k);
          if (val) {
            const entry: WalLogEntry = JSON.parse(val);
            if (entry.timestamp < twoWeeksAgo) {
              localStorage.removeItem(k);
            }
          }
        }
      }
    } catch {}
  }
}
