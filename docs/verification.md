# 验证记录

更新时间：2026-08-11

## 自动化检查

- `main.js` JavaScript 语法检查：通过
- Node 内置测试：7/7 通过
- 清单依赖：`RefinedNowPlayingNext`
- 清单加载顺序：在 `RefinedNowPlayingNext` 之后
- 禁止触碰歌词状态检查：通过
- 网络调用静态检查：通过
- 插件包内容白名单检查：通过

## 本机 BetterNCM 检查

- 检测到 RefinedNowPlaying Next `3.0.2`
- 网易云音乐启动后，BetterNCM 成功解包为 `plugins_runtime/rnp-video-background`
- 解包后的运行文件与源码逐项哈希一致
- 桌面自动化模块受本机权限限制，未代替用户在设置页选择私人视频；视频画面的最终视觉确认需用户自行选择文件后完成

## 发布检查

- 源码仓库：https://github.com/wmgqdavid/BetterNCM-RNP-Video-Background
- BetterNCM 商店申请：https://github.com/BetterNCM/BetterNCM-Plugins/pull/725
- PR 仅新增 `plugins-list/rnp-video-background.json`
- PR 创建时状态：open、clean、非草稿
