#!/usr/bin/env python3
# ==============================================================================
# NovManager PostgreSQL 数据库一键初始化与全量数据同步脚本
# 用法:
#   PYTHONPATH=backend python3 backend/scripts/init_postgres.py
# ==============================================================================

import os
import sys
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("init_postgres")

# 确保 backend 在系统路径中
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app.db import DatabaseManager, DATABASE_URL

def main():
    logger.info("=" * 60)
    logger.info("NovManager PostgreSQL 生产级数据库初始化工具")
    logger.info(f"目标数据库 URL: {DATABASE_URL}")
    logger.info("=" * 60)

    # 1. 连通性测试
    logger.info("正在检测数据库服务连接与扩展...")
    health = DatabaseManager.check_health()
    if not health.get("connected"):
        logger.error(f"连接数据库失败: {health.get('error')}")
        logger.error("请确认 PostgreSQL 服务已启动，且已正确创建 novmanager 数据库与 novadmin 用户。")
        sys.exit(1)

    logger.info(f"成功连接至: {health.get('version')}")
    logger.info(f"pgvector 扩展就绪: {'已开启 (OK)' if health.get('pgvector_enabled') else '未检测到 (建议安装 postgresql-16-pgvector)'}")

    # 2. 表结构创建
    logger.info("正在执行 DDL 创建领域模型表结构...")
    if not DatabaseManager.init_schema():
        logger.error("数据表初始化失败！")
        sys.exit(1)
    logger.info("所有 10 大核心实体表结构初始化完成！")

    # 3. 种子数据同步
    store_file = os.path.join(ROOT_DIR, "data", "novel_store.json")
    if os.path.exists(store_file):
        logger.info(f"检测到本地 JSON 种子库: {store_file}，正在同步至 PostgreSQL...")
        try:
            with open(store_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            if DatabaseManager.sync_from_json(data):
                logger.info("种子数据同步完成！")
            else:
                logger.warning("种子数据同步存在部分警告，请检查日志。")
        except Exception as e:
            logger.error(f"加载种子数据文件失败: {e}")
    else:
        logger.info("未发现本地 JSON 种子库，跳过数据填充。")

    # 4. 汇总验证
    final_health = DatabaseManager.check_health()
    logger.info("=" * 60)
    logger.info("数据库初始化与落地完成！汇总状态:")
    logger.info(f"  - 数据库连接: 正常")
    logger.info(f"  - pgvector 向量扩展: {final_health.get('pgvector_enabled')}")
    logger.info(f"  - 数据表创建状态: {final_health.get('tables_initialized')}")
    logger.info(f"  - 已收录作品总数: {final_health.get('novels_count')}")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()
