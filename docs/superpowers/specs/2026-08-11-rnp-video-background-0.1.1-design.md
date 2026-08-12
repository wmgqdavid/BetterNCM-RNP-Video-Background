# RNP Video Background 0.1.1 修复设计

日期：2026-08-11  
状态：待用户复核  
适配基线：BetterNCM + RefinedNowPlaying Next 3.0.2

## 1. 问题与证据

### 1.1 视频遮住封面与歌词

当前插件把 `#rnpvb-video` 直接插入 `.g-single`。RefinedNowPlaying Next 3.0.2 自带以下层级规则：

```css
#rnp-view .g-single {
  position: relative;
  isolation: isolate;
}

#rnp-view .g-single > :not(.rnp-bg) {
  position: relative;
  z-index: 1;
}

#rnp-view .rnp-bg {
  position: absolute;
  z-index: 0;
}
```

视频不是 `.rnp-bg`，因此被 RNP 视为前景内容并提升到 `z-index: 1`，覆盖封面、歌曲信息和歌词。

### 1.2 `liang.mp4` 黑屏

本机只读检查结果：

- 路径：`C:\Users\34735\Videos\liang.mp4`
- 大小：235,824,653 字节（约 225 MiB）
- 视频编码：H.265 / HEVC Main
- 分辨率与帧率：3840×2160，60 fps
- 视频码率：约 23 Mbps
- 音频编码：AAC LC

黑屏的主要风险是 BetterNCM 内置 Chromium/CEF 对 HEVC 的解码兼容性，而不是文件体积本身。当前插件在视频真正解码成功前就隐藏 RNP 原背景，因此不兼容视频会留下黑色画面。

## 2. 目标

1. 视频永远处于 RNP 原生背景层，不能覆盖封面、歌名、歌手或正常旋转歌词。
2. 只有在视频至少成功解码出首帧后，才切换到视频背景。
3. 读取、解码或播放失败时自动恢复 RNP 原背景，不能留下全黑页面。
4. 设置页显示用户可理解的错误原因和兼容格式建议。
5. 保持底部控制区隐藏功能，但只在视频背景进入可用状态后启用精简界面。
6. 不读取、不点击、不添加、不删除任何歌词 Overview/复制模式或旋转状态。

## 3. 非目标

- 不在插件内集成 FFmpeg 或自动转码。
- 不承诺播放 H.265/HEVC、AV1 或其他取决于 CEF 编译选项的格式。
- 不修改 RefinedNowPlaying Next 的正常歌词动画、同步逻辑或布局结构。
- 不覆盖或修改用户的原始视频文件。

## 4. 方案

### 4.1 背景层挂载

挂载目标从 `.g-single` 改为：

```text
#rnp-view .g-single > .rnp-bg
```

兼容查找顺序：

1. `#rnp-view .g-single > .rnp-bg`
2. `.g-single > .rnp-bg`

找不到 RNP 背景容器时不创建伪造容器、不回退到 `.g-single`，而是保留原界面并提示“等待 RefinedNowPlaying Next 背景层”。MutationObserver 继续监听，背景层出现后自动重试。

`#rnpvb-video` 作为 `.rnp-bg` 的直接子元素，使用绝对定位覆盖该背景容器。视频可以在 `.rnp-bg` 内使用较高子层级，但由于 `.rnp-bg` 自身处于 RNP 的 `z-index: 0` 隔离层，视频不会越过前景内容的 `z-index: 1`。

### 4.2 原背景隐藏方式

不再隐藏 `.rnp-bg` 根元素。视频就绪时仅隐藏其原生直接子元素：

```css
body.rnpvb-ready .rnp-bg > :not(#rnpvb-video) {
  visibility: hidden;
  opacity: 0;
}
```

视频未就绪或失败时移除 `rnpvb-ready`，原背景立即恢复。

### 4.3 加载状态机

状态分为：

```text
未启用/离开播放页 → loading → ready
                         └→ error → 恢复原背景
```

- `loading`：完成路径检查和文件挂载，视频透明；RNP 原背景和完整前景保持可见。
- `ready`：收到 `loadeddata` 或 `canplay`，证明至少能够解码首帧；显示视频、隐藏原背景和多余控制区。
- `error`：媒体错误、挂载错误或加载超时；移除视频就绪类并恢复原背景。
- 离开播放页或关闭插件：暂停视频，清理运行时类和节点。

每次更换文件都使用挂载令牌识别陈旧事件，旧视频的延迟 `canplay/error` 不能覆盖新视频状态。

### 4.4 错误提示

媒体错误码映射为：

- 1：播放被取消。
- 2：文件读取失败。
- 3：视频解码失败。
- 4：视频编码或封装格式不受支持。

错误码 3 或 4 时，设置页提示：

```text
无法解码此视频。建议使用 MP4（H.264/AVC + AAC，yuv420p）或 WebM（VP8/VP9）。
```

加载超过合理时限仍未产生首帧时，恢复原背景并提示用户重新加载或转换视频。插件不根据“文件很大”直接拒绝播放。

### 4.5 歌词安全边界

运行代码和样式继续禁止引用以下标识：

- `rnp-lyrics-switch-btn-overview-mode`
- `rnp-lyrics-overview-container`
- `overview-mode-hide`
- `rnp-lyrics-line`
- `lyric-rotate`

因此插件不会触发复制模式，也不会强制开启或关闭歌词旋转。

## 5. 设置与兼容说明

保留已有视频路径、填充方式、亮度和启用状态。设置页新增简短兼容提示：

```text
推荐格式：MP4（H.264/AVC + AAC）或 WebM（VP8/VP9）。HEVC/H.265 可能黑屏。
```

状态区域显示实际加载结果；发生错误时，即使设置页未打开，播放页也会恢复为 RNP 原背景而不是黑屏。

## 6. 验证标准

### 自动检查

1. manifest 版本为 `0.1.1`。
2. 运行代码只把视频挂载到 `.rnp-bg`，没有回退到 `.g-single`。
3. 样式不再隐藏 `.rnp-bg` 根元素。
4. 原背景仅在 `rnpvb-ready` 状态隐藏。
5. 发生媒体错误时会清除就绪状态。
6. 继续通过歌词安全边界检查。
7. 插件仍无网络请求。

### 人工验收

1. 选择已知兼容的 H.264 MP4：视频在背景循环静音播放，封面、歌名、歌手和旋转歌词可见。
2. 选择 `liang.mp4`：若 CEF 不支持 HEVC，RNP 原背景保留或自动恢复，页面不会全黑；设置页显示编码兼容提示。
3. 切歌、退出并重新进入播放页：视频背景可恢复，前景层级不改变。
4. 打开或关闭 RNP 的歌词复制模式：插件不介入该状态。
5. 清除视频或禁用插件：恢复 RNP 原界面。

## 7. 发布范围

- 版本：`0.1.1`
- 更新主 JS、CSS、manifest、测试、README/更新日志和验证记录。
- 生成新的 BetterNCM 插件包并安装到本机测试目录。
- 验证后同步 GitHub 仓库；现有 BetterNCM 商店 PR 继续指向同一仓库。

## 8. 自检结论

- 根因与实际 RNP 3.0.2 样式证据一致。
- 修复利用 RNP 已有隔离层，不依赖强行抬高多个前景选择器。
- 失败路径先恢复界面，再报告错误，避免黑屏锁死。
- 设计不触碰歌词 Overview 或旋转状态。
- 自动转码被明确排除，避免扩大插件体积和商店审核风险。

