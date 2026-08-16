use std::fs;
use std::path::Path;

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
        .invoke_handler(tauri::generate_handler![read_dropped_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
