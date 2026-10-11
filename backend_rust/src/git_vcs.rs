use chrono::Utc;
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tracing::{info, warn};

pub struct GitVcsManager {
    repo_dir: PathBuf,
}

impl GitVcsManager {
    pub fn new() -> Self {
        let repo_dir = Self::find_repo_dir();
        let mgr = Self { repo_dir };
        mgr.ensure_git_initialized();
        mgr
    }

    fn find_repo_dir() -> PathBuf {
        if let Ok(dir) = std::env::var("NOV_REPO_DIR") {
            return PathBuf::from(dir);
        }

        // 向上查找包含 .git 目录的根路径
        let current = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let mut cur: &Path = &current;
        loop {
            if cur.join(".git").exists() {
                return cur.to_path_buf();
            }
            match cur.parent() {
                Some(p) => cur = p,
                None => break,
            }
        }

        // 若没找到，默认使用上级目录（项目根目录）或当前目录
        PathBuf::from("..")
    }

    pub fn get_repo_dir(&self) -> String {
        self.repo_dir.to_string_lossy().to_string()
    }

    fn run_git(&self, args: &[&str]) -> (bool, String, String) {
        match Command::new("git").args(args).current_dir(&self.repo_dir).output() {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
                (output.status.success(), stdout, stderr)
            }
            Err(e) => (false, String::new(), e.to_string()),
        }
    }

    fn ensure_git_initialized(&self) {
        let (ok, _, _) = self.run_git(&["rev-parse", "--is-inside-work-tree"]);
        if !ok {
            info!("Initializing Git repo at {:?}", self.repo_dir);
            self.run_git(&["init"]);
            self.run_git(&["config", "user.name", "NovManager Bot"]);
            self.run_git(&["config", "user.email", "bot@novmanager.local"]);
        }
    }

    pub fn create_milestone_snapshot(
        &self,
        novel_id: &str,
        chapter_id: &str,
        scene_index: i64,
        content: &str,
        message: &str,
        tag: &str,
    ) -> Value {
        let snapshots_dir = self
            .repo_dir
            .join("manuscripts")
            .join(novel_id)
            .join(chapter_id);
        let _ = fs::create_dir_all(&snapshots_dir);

        let file_name = format!("scene_{}.md", scene_index);
        let file_path = snapshots_dir.join(&file_name);

        if let Err(e) = fs::write(&file_path, content) {
            warn!("Failed to write manuscript snapshot: {}", e);
            return json!({
                "success": false,
                "error": e.to_string()
            });
        }

        let rel_path = format!("manuscripts/{}/{}/{}", novel_id, chapter_id, file_name);
        self.run_git(&["add", &rel_path]);

        let now_str = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let commit_msg = format!("[{}] {} ({})", tag.to_uppercase(), message, now_str);
        self.run_git(&["commit", "-m", &commit_msg]);

        let (ok_head, commit_hash, _) = self.run_git(&["rev-parse", "HEAD"]);
        let hash = if ok_head && !commit_hash.is_empty() {
            commit_hash
        } else {
            "head-local".to_string()
        };

        json!({
            "success": true,
            "commit_hash": hash,
            "file_path": rel_path,
            "message": commit_msg,
            "timestamp": Utc::now().to_rfc3339()
        })
    }

    pub fn list_history(&self, novel_id: &str, chapter_id: Option<&str>, limit: i64) -> Vec<Value> {
        let limit_arg = format!("-n{}", limit);
        let mut args = vec![
            "log",
            &limit_arg,
            "--pretty=format:%H|%an|%ad|%s",
            "--date=iso",
        ];

        let target_path;
        if let Some(cid) = chapter_id {
            target_path = format!("manuscripts/{}/{}", novel_id, cid);
            if self.repo_dir.join(&target_path).exists() {
                args.push("--");
                args.push(&target_path);
            }
        }

        let (ok, stdout, _) = self.run_git(&args);
        if !ok || stdout.is_empty() {
            return Vec::new();
        }

        let mut entries = Vec::new();
        for line in stdout.lines() {
            let parts: Vec<&str> = line.splitn(4, '|').collect();
            if parts.len() == 4 {
                entries.push(json!({
                    "commit_hash": parts[0],
                    "author": parts[1],
                    "date": parts[2],
                    "message": parts[3]
                }));
            }
        }

        entries
    }

    pub fn get_commit_diff(&self, commit_hash: &str) -> String {
        let (ok, stdout, _) = self.run_git(&["show", "--color=never", commit_hash]);
        if ok {
            stdout
        } else {
            String::new()
        }
    }

    pub fn restore_file_at_commit(&self, rel_path: &str, commit_hash: &str) -> bool {
        let (ok, _, _) = self.run_git(&["checkout", commit_hash, "--", rel_path]);
        ok
    }
}
