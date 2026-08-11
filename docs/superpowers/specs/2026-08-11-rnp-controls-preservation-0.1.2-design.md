# RNP Video Background 0.1.2 功能保留设计

日期：2026-08-11  
状态：已确认并实施  
适配基线：BetterNCM + RefinedNowPlaying Next 3.0.2

## 1. 问题与根因

0.1.1 已把视频正确放入 RefinedNowPlaying Next 的 `.rnp-bg` 背景层，解决了视频遮挡封面和歌词的问题。但同一版的“精简界面”CSS 仍无条件隐藏或禁用了以下交互区域：

- `#main-player`
- `.m-player-fm`
- `.rnp-v3-controls-host`
- `.rnp-v3-controls`
- `#rnp-settings`
- `.rnp-settings-menu`
- `.rnp-full-screen-button`
- `.rnp-full-screen-clock`
- `.rnp-mini-song-info`
- `.u-resize`

其中设置菜单、全屏和辅助交互属于 RNP 功能，而不是单纯的底部播放栏。它们被 `display: none`、`visibility: hidden` 或 `pointer-events: none` 处理后，造成“RNP 功能和设置失效”的回归。

## 2. 用户确认的目标

1. 默认完整保留 RNP 的设置、全屏、歌词、封面、布局和其他交互功能。
2. 视频仍只替换 RNP 的原生背景，不覆盖前景内容。
3. 新增“精简播放控件”开关，默认关闭。
4. 只有用户主动打开精简开关时，才隐藏底部播放器、进度条、音量和 v3 播放控制区。
5. 即使开启精简模式，RNP 设置入口、设置菜单、全屏和歌词功能仍必须可用。
6. 视频亮度和填充方式继续由本插件控制；RNP 的原生模糊、渐变或流体背景设置不映射到视频。

## 3. 设置模型与升级行为

在现有设置中增加：

```js
compactControls: false
```

- 新安装默认值为 `false`。
- 从 0.1.0 或 0.1.1 升级时，旧配置没有该字段，标准化后同样得到 `false`。
- 开关变化通过已有 `plugin.setConfig` 持久化。
- 设置页显示“精简播放控件”复选框，并说明它只隐藏底部播放控制区。

因此用户升级到 0.1.2 后，无需清理配置即可自动恢复完整 RNP 功能。

## 4. 状态与 CSS 职责分离

### 4.1 视频就绪状态

`body.rnpvb-ready` 只负责两件事：

1. 显示 `#rnpvb-video`。
2. 隐藏 `.rnp-bg` 中除视频以外的原生背景子层。

它不得再改变播放器、设置、全屏、歌词或其他 RNP 前景组件。

### 4.2 精简控制状态

当设置 `compactControls` 为 `true` 时，脚本给 `body` 增加：

```text
rnpvb-compact-controls
```

只有同时满足以下两个状态时才执行控制区隐藏：

```text
body.rnpvb-ready.rnpvb-compact-controls.mq-playing
```

允许隐藏的范围限定为：

- `#main-player`
- `.m-player-fm`
- `.rnp-v3-controls-host`
- `.rnp-v3-controls`
- `.rnp-progressbar-preview`
- `.progressbar-preview`
- 与底部播放器占位直接相关的高度和 `.g-single` 底部偏移

### 4.3 永久保护的 RNP 功能

无论精简模式是否开启，插件样式都不得隐藏、透明化或禁用点击：

- `#rnp-settings`
- `.rnp-settings-menu`
- `.rnp-full-screen-button`
- `.rnp-full-screen-clock`
- `.rnp-mini-song-info`
- `.rnp-lyrics-switch` 及其子按钮
- `.u-resize`
- 封面、歌曲信息、歌词容器和布局控件

## 5. 运行流程

```text
读取设置
  ├─ compactControls=false → 移除 rnpvb-compact-controls
  └─ compactControls=true  → 添加 rnpvb-compact-controls

视频未就绪 → 保留 RNP 原背景和完整功能
视频已就绪 → 仅切换背景
视频已就绪 + 精简开关开启 → 额外隐藏底部播放控制区
```

视频加载、首帧判断、错误恢复和 HEVC/H.265 兼容提示沿用 0.1.1，不改变其失败保护逻辑。

## 6. 设置界面

在“背景亮度”附近增加一行：

```text
精简播放控件  [复选框]
```

辅助说明：

```text
关闭时保留 RefinedNowPlaying Next 的全部控制；开启后仅隐藏底部播放栏、进度条、音量和 v3 控件。
```

更改开关后立即生效，不需要重新选择视频。

## 7. 自动验证

1. manifest 版本为 `0.1.2`。
2. `normalizeSettings({})` 返回 `compactControls: false`。
3. `normalizeSettings({ compactControls: true })` 保留 `true`。
4. CSS 中所有控制区隐藏规则必须包含 `.rnpvb-compact-controls`。
5. CSS 不得出现针对 RNP 设置、全屏、歌词切换、迷你信息和 `.u-resize` 的隐藏规则。
6. `rnpvb-ready` 单独出现时，只控制视频和原生背景子层。
7. 继续通过视频背景层、首帧失败恢复、无网络请求和歌词状态安全检查。

## 8. 人工验收

### 默认模式

- 选择兼容视频后，封面、歌曲信息和正常旋转歌词位于视频上层。
- RNP 设置按钮和菜单可以打开并操作。
- 全屏、歌词切换、封面交互和布局功能正常。
- 底部及 v3 播放控件正常保留。

### 精简模式

- 开启“精简播放控件”后，仅底部播放栏、进度、音量和 v3 控件隐藏。
- RNP 设置、全屏、歌词开关和其他前景功能仍可操作。
- 关闭开关后，隐藏的控制区立即恢复。

### 失败恢复

- 不兼容视频失败时恢复 RNP 原背景和全部功能，页面不黑屏。

## 9. 发布范围

- 版本升级到 `0.1.2`。
- 更新 JS、CSS、manifest、测试、README、设计说明、验证记录和更新日志。
- 生成并安装 0.1.2 插件包；0.1.1 改名保留为备份。
- 验证后同步 GitHub 仓库和 BetterNCM 商店 PR #725。
- 更新工作区与 E 盘成果归档、项目记忆和返工日志。

## 10. 自检结论

- 不存在占位文字或未决定项。
- 视频背景状态与控件精简状态已分离，不再互相隐式触发。
- “完整保留 RNP 功能”与“可选隐藏底部控件”的边界明确且可测试。
- 不扩展到 RNP 原生背景效果映射，避免无关功能膨胀。
- 0.1.1 的视频层级和失败恢复修复被保留。
