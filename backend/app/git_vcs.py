# ==============================================================================
# NovManager 静默 Git 版本控制底座 (Silent Git Version Control Engine)
# 为创作者提供无感知、原子级、段落级的小说版本快照、分支沙盒与安全回滚
# ==============================================================================

import subprocess
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

class GitVCSManager:
    """Git 静默版本控制管理器，管理小说主线提交、分支沙盒与差异审阅"""

    def __init__(self, repo_dir: Optional[str] = None):
        if repo_dir is None:
            # 默认为仓库根目录下的 .novmanager_git 或当前项目根目录
            current_dir = os.path.dirname(os.path.abspath(__file__))
            repo_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
        self.repo_dir = repo_dir
        self._ensure_git_initialized()

    def _run_git(self, args: List[str]) -> Dict[str, Any]:
        try:
            res = subprocess.run(
                ["git"] + args,
                cwd=self.repo_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False
            )
            return {
                "success": res.returncode == 0,
                "returncode": res.returncode,
                "stdout": res.stdout.strip(),
                "stderr": res.stderr.strip()
            }
        except Exception as e:
            return {
                "success": False,
                "returncode": -1,
                "stdout": "",
                "stderr": str(e)
            }

    def _ensure_git_initialized(self):
        check = self._run_git(["rev-parse", "--is-inside-work-tree"])
        if not check["success"]:
            self._run_git(["init"])
            self._run_git(["config", "user.name", "NovManager Bot"])
            self._run_git(["config", "user.email", "bot@novmanager.local"])

    def create_milestone_snapshot(
        self,
        novel_id: str,
        chapter_id: str,
        scene_index: int,
        content: str,
        message: str,
        tag: str = "draft"
    ) -> Dict[str, Any]:
        """静默落盘并提交版本快照"""
        snapshots_dir = os.path.join(self.repo_dir, "manuscripts", novel_id, chapter_id)
        os.makedirs(snapshots_dir, exist_ok=True)
        file_path = os.path.join(snapshots_dir, f"scene_{scene_index}.md")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        # 添加并提交
        rel_path = os.path.relpath(file_path, self.repo_dir)
        self._run_git(["add", rel_path])

        commit_msg = f"[{tag.upper()}] {message} ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})"
        commit_res = self._run_git(["commit", "-m", commit_msg])

        rev_res = self._run_git(["rev-parse", "HEAD"])
        commit_hash = rev_res["stdout"] if rev_res["success"] else "head-local"

        return {
            "success": True,
            "commit_hash": commit_hash,
            "file_path": rel_path,
            "message": commit_msg,
            "timestamp": datetime.now().isoformat()
        }

    def list_history(self, novel_id: str, chapter_id: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """获取章节正文历史提交快照列表"""
        path_filter = []
        if chapter_id:
            target_path = os.path.join("manuscripts", novel_id, chapter_id)
            if os.path.exists(os.path.join(self.repo_dir, target_path)):
                path_filter = ["--", target_path]

        log_args = ["log", f"-n{limit}", "--pretty=format:%H|%an|%ad|%s", "--date=iso"] + path_filter
        res = self._run_git(log_args)
        if not res["success"] or not res["stdout"]:
            return []

        entries = []
        for line in res["stdout"].splitlines():
            parts = line.split("|", 3)
            if len(parts) == 4:
                entries.append({
                    "commit_hash": parts[0],
                    "author": parts[1],
                    "date": parts[2],
                    "message": parts[3]
                })
        return entries

    def get_commit_diff(self, commit_hash: str) -> str:
        """获取特定提交的差异文本"""
        res = self._run_git(["show", "--color=never", commit_hash])
        return res["stdout"] if res["success"] else ""

    def restore_file_at_commit(self, rel_path: str, commit_hash: str) -> bool:
        """从历史提交恢复文件"""
        res = self._run_git(["checkout", commit_hash, "--", rel_path])
        return res["success"]
