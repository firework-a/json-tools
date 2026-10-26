use std::fs;
use std::path::Path;

use serde::Serialize;
use tauri::path::BaseDirectory;
use tauri::Manager;

/// 随安装包分发的 MCP/CLI 可执行文件信息。
#[derive(Serialize)]
struct McpBinary {
    /// 安装后的绝对路径（Tauri resource 解析结果）
    path: String,
    /// 文件是否真实存在；dev 模式下未构建 exe 时为 false
    exists: bool,
}

/// 返回安装目录内 MCP 可执行文件的位置，供设置页生成客户端配置。
#[tauri::command]
fn mcp_binary_path(app: tauri::AppHandle) -> Result<McpBinary, String> {
    let path = app
        .path()
        .resolve("binaries/json-tools-mcp.exe", BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    Ok(McpBinary {
        path: path.to_string_lossy().to_string(),
        exists: path.is_file(),
    })
}

/// 读取拖拽到窗口上的文件内容。
/// 与对话框选取不同，拖拽路径不会自动进入 fs 插件 scope，
/// 因此用一个受控命令在后端直接读取，仅返回该文件的文本内容。
#[tauri::command]
fn read_dropped_file(path: String) -> Result<String, String> {
    let p = Path::new(&path);
    if !p.is_file() {
        return Err("不是有效的文件".into());
    }
    // 限制可读取的扩展名，避免被滥用为任意文件读取
    let allowed = ["json", "txt", "yaml", "yml"];
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();
    if !allowed.contains(&ext.as_str()) {
        return Err(format!("不支持的文件类型: .{ext}"));
    }
    fs::read_to_string(p).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![read_dropped_file, mcp_binary_path])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
