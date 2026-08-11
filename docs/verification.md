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
