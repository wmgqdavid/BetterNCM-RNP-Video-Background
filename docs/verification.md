# 验证记录

更新时间：2026-08-11

## 自动化检查

- `main.js` JavaScript 语法检查：通过
- Node 内置测试：11/11 通过
- 清单依赖：`RefinedNowPlayingNext`
- 清单加载顺序：在 `RefinedNowPlayingNext` 之后
- 禁止触碰歌词状态检查：通过
- 网络调用静态检查：通过
- 插件包内容白名单检查：通过
- 0.1.2 插件包 SHA-256：`c053e951b0467b8a0475af2c226f351f09d2ab8886307f619dd5b1c38925c879`

## 本机 BetterNCM 检查

- 检测到 RefinedNowPlaying Next `3.0.2`
- 网易云音乐启动后，BetterNCM 成功解包为 `plugins_runtime/rnp-video-background`
- 先前 0.1.0 的 BetterNCM 解包运行文件与对应源码逐项哈希一致
- 已安装 `rnp-video-background-0.1.2.plugin`，旧 0.1.0 和 0.1.1 包已改名保留为可恢复备份
- 已确认报告中的黑屏样本属于 HEVC/H.265 编码；0.1.1 会在解码失败时恢复原背景并提供兼容格式提示
- 0.1.2 默认不再隐藏 RNP 设置、全屏、歌词切换或其他交互；精简底部控件改为默认关闭的独立设置
- 需要重启网易云音乐或重新加载插件后，再确认 0.1.2 运行目录哈希并由用户完成最终视觉确认

## 发布检查

- 源码仓库：https://github.com/wmgqdavid/BetterNCM-RNP-Video-Background
- BetterNCM 商店申请：https://github.com/BetterNCM/BetterNCM-Plugins/pull/725
- PR 仅新增 `plugins-list/rnp-video-background.json`
- PR 创建时状态：open、clean、非草稿
# 0.2.0 验证记录（2026-08-12）

- JavaScript 语法检查通过。
- Node 自动化测试 13/13 通过。
- PowerShell 工作器语法检查通过。
- 包内容校验通过，仅包含 manifest、主脚本、样式、预览图和三个转换工具文件。
- 合成 4K60 HEVC + AAC 输入成功转换为 H.264 High、1920×1080、30fps、yuv420p MP4。
- 静音转换输出无音轨；有声转换输出为 AAC-LC、48 kHz、双声道。
- 原文件保持不变，输出使用新的 `.rnp-compatible.mp4` 路径。
- 安装包 SHA-256：`7bb94a590b76ab39a752ed9fc43247eb3d2949b8478ce33a1db3741623163e9b`。
- 受当前环境对 BetterNCM 目录写入权限限制，安装与网易云 GUI 重载需要用户在本机执行或通过商店更新完成。

# 0.2.1 验证记录（2026-08-12）

- 从本机 worker 日志复现并定位 `out_time_ms=N/A` 被强制转换为 `System.Double` 的异常。
- 改为固定文化设置的 `Int64.TryParse`；`N/A`、空值和畸形值不会再中断 FFmpeg。
- JavaScript 回归测试 13/13 通过，PowerShell 语法检查通过。
- 使用真实 `C:\Users\34735\Videos\liang.mp4` 验证任务成功进入 `transcoding` 状态，随后安全取消长耗时验证；原视频未修改。
