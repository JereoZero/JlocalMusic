#!/bin/bash
# 自动同步全部文档的版本号
# 用法: bash scripts/sync-docs.sh
# 读取 package.json 的版本号，更新所有文档中的版本引用

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

VERSION=$(node -p "require('$PROJECT_DIR/package.json').version")

echo "Syncing docs to version $VERSION..."

# 1. 更新 docs/DEVELOPMENT_LOG.md 的版本头
if grep -q '\*\*当前版本\*\*' "$PROJECT_DIR/docs/DEVELOPMENT_LOG.md"; then
  perl -i -pe "s/\\*\\*当前版本\\*\\*: v[0-9]+\\.[0-9]+\\.[0-9]+/**当前版本**: v$VERSION/" "$PROJECT_DIR/docs/DEVELOPMENT_LOG.md"
fi

# 2. 更新 docs/BUGS.md 中 E2E 待修复条目的版本描述
perl -i -pe "s/UI 版本也已到 v[0-9]+\\.[0-9]+\\.[0-9]+/UI 版本也已到 v$VERSION/" "$PROJECT_DIR/docs/BUGS.md" 2>/dev/null || true

# 3. 更新 README.md / README-zh.md 的 badge 版本（如果有的话）
# 通常 README badge 没有硬编码版本号，跳过

printf "✅ Docs synced to v%s\n" "$VERSION"