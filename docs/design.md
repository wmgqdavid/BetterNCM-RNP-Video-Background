# 设计说明

## 目标

在 RefinedNowPlaying Next 播放页中，以本地 MP4/WebM 替换自带背景，同时保留封面、歌曲信息与正常旋转歌词，并精简底部控制区。

## 运行结构

- `manifest.json`：BetterNCM 插件清单，声明依赖和加载顺序。
- `main.js`：设置持久化、文件选择、本地文件挂载、页面状态监听和视频生命周期。
- `style.css`：只在 `body.rnpvb-active.mq-playing` 下隐藏背景和控制区。
- `preview.svg`：BetterNCM 插件市场预览图，便于源码仓库直接分发。

## 关键边界

- 视频元素唯一 ID 为 `#rnpvb-video`，注入 `.g-single` 的第一个子节点。
- 仅在 `body.refined-now-playing.mq-playing` 且存在 `.g-single` 时激活。
- 只隐藏 `.rnp-bg`、旧版控制区、`.rnp-v3-controls-host` 和列出的 RNP 辅助按钮。
- 不查询、不点击、不修改 `.rnp-lyrics-switch-btn-overview-mode`。
- 不对 `.rnp-lyrics-line`、`.rnp-lyrics-overview-container`、`.overview-mode-hide` 或 `body.lyric-rotate` 应用样式或脚本。
- 离开播放页时暂停视频；停用或清除视频时移除元素并恢复界面。

## 设置模型

设置通过 `plugin.getConfig` / `plugin.setConfig` 保存在 BetterNCM 本机配置：

- `enabled`
- `filePath`
- `fileName`
- `lastDirectory`
- `fit`
- `brightness`

文件通过 `betterncm.app.openFileDialog` 选择，并通过 `betterncm.fs.mountFile` 转换为内置浏览器可读取的地址。

## 已知边界

- 实际媒体编码兼容性取决于网易云音乐内置 Chromium/CEF。
- 本地视频被移动或删除后，需要重新选择。
- RNP DOM 结构将来若发生重大变化，需要更新选择器。
