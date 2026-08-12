# GitHub 与 BetterNCM 插件市场发布清单

## 一、首次发布 GitHub

- [x] 公开作者已统一为 GitHub 用户名 `wmgqdavid`。
- [x] 商店登记文件已填写 `wmgqdavid/BetterNCM-RNP-Video-Background`。
- [x] 已创建公开仓库 `wmgqdavid/BetterNCM-RNP-Video-Background`。
- [x] 已推送 `main` 分支。
- [ ] 创建版本标签与 Release：`v0.2.1`。
- [ ] 把 `outputs/rnp-video-background-0.2.1.plugin` 和 `SHA256SUMS.txt` 添加为 Release 附件。

## 二、提交 BetterNCM 插件市场

- [x] 已阅读并确认当前上架准则。
- [x] 已 Fork `BetterNCM/BetterNCM-Plugins`。
- [x] 已提交 `plugins-list/rnp-video-background.json`。
- [x] 已创建 `add-rnp-video-background` 分支，且只改动一个登记文件。
- [x] 已创建 [BetterNCM-Plugins PR #725](https://github.com/BetterNCM/BetterNCM-Plugins/pull/725)。
- [x] PR 已说明依赖、隐私边界和歌词模式边界。
- [ ] 等待自动抓取与审核；如有反馈，修正源仓库并递增语义化版本号。

## 三、每次更新

- [ ] 更新 `manifest.json` 版本。
- [ ] 更新 `CHANGELOG.md`。
- [ ] 运行语法和自动化检查。
- [ ] 重新生成 `.plugin` 与 SHA-256。
- [ ] 推送标签并创建 GitHub Release。
- [ ] BetterNCM 商店会定期抓取清单版本，无需反复修改登记 JSON。

## 建议 PR 标题

`Add RNP Video Background`

## 建议 PR 描述

> 为 RefinedNowPlaying Next 添加本地 MP4/WebM 视频背景、可选声音、播放同步，以及经过 SHA-256 校验的 FFmpeg 自动兼容转换。插件不会切换歌词 Overview/复制模式，也不会修改正常旋转歌词状态。
