#!/bin/bash

# 生成 TypeScript 类型文件脚本

echo "Generating TypeScript types from Rust..."

cd "$(dirname "$0")/src-tauri"

# 创建临时测试文件来触发类型导出
mkdir -p src/bin

cat > src/bin/export_types.rs << 'EOF'
use jlocal::database::{Song, AppLog, PlayHistory};
use jlocal::player::{PlaybackState, PlayerState};
use jlocal::metadata::Metadata;
use jlocal::scanner::ScanResult;

fn main() {
    println!("Exporting types...");
    let _ = <Song as ts_rs::TS>::export_all_to("../src/types/generated/");
    let _ = <AppLog as ts_rs::TS>::export_all_to("../src/types/generated/");
    let _ = <PlayHistory as ts_rs::TS>::export_all_to("../src/types/generated/");
    let _ = <PlaybackState as ts_rs::TS>::export_all_to("../src/types/generated/");
    let _ = <PlayerState as ts_rs::TS>::export_all_to("../src/types/generated/");
    let _ = <Metadata as ts_rs::TS>::export_all_to("../src/types/generated/");
    let _ = <ScanResult as ts_rs::TS>::export_all_to("../src/types/generated/");
    println!("Types exported successfully!");
}
EOF

# 创建目标目录
mkdir -p ../src/types/generated

# 编译并运行
cargo run --bin export_types 2>/dev/null

# 清理
rm -rf src/bin

echo "Done!"
