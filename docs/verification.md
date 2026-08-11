# 验证记录

更新时间：2026-08-11

## 自动化检查

- `main.js` JavaScript 语法检查：通过
- Node 内置测试：10/10 通过
- 清单依赖：`RefinedNowPlayingNext`
- 清单加载顺序：在 `RefinedNowPlayingNext` 之后
- 禁止触碰歌词状态检查：通过
- 网络调用静态检查：通过
- 插件包内容白名单检查：通过
- 0.1.1 插件包 SHA-256：`17849faea433f07af12cdcfa328f9b4326b88e91a354ac395516666883cb8db7`

## 本机 BetterNCM 检查

- 检测到 RefinedNowPlaying Next `3.0.2`
- 网易云音乐启动后，BetterNCM 成功解包为 `plugins_runtime/rnp-video-background`
- 先前 0.1.0 的 BetterNCM 解包运行文件与对应源码逐项哈希一致
- 已安装 `rnp-video-background-0.1.1.plugin`，旧 0.1.0 包已改名保留为可恢复备份
- 已确认报告中的黑屏样本属于 HEVC/H.265 编码；0.1.1 会在解码失败时恢复原背景并提供兼容格式提示
- 需要重启网易云音乐或重新加载插件后，再确认 0.1.1 运行目录哈希并由用户完成视频画面的最终视觉确认

## 发布检查

- 源码仓库：https://github.com/wmgqdavid/BetterNCM-RNP-Video-Background
- BetterNCM 商店申请：https://github.com/BetterNCM/BetterNCM-Plugins/pull/725
- PR 仅新增 `plugins-list/rnp-video-background.json`
- PR 创建时状态：open、clean、非草稿
