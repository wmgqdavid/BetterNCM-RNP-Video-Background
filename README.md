# RNP Video Background

为 BetterNCM 的 RefinedNowPlaying Next 播放页添加本地视频背景，同时保留封面、歌名、歌手和正常旋转歌词。

当前版本：**0.2.2**

## 演示

这是一个真实运行录屏：RNP 页面使用本地视频背景，歌词、封面和播放信息保持可见。

https://github.com/user-attachments/assets/31debbca-5090-4433-82ff-2ac716d3e461

如果当前浏览器无法显示播放器，也可以直接打开仓库文件：[media/demo.mp4](media/demo.mp4)

## 功能

- 选择本地 MP4 或 WebM 作为循环视频背景。
- 视频默认静音，可单独开启声音和调节视频音量。
- 跟随网易云音乐暂停/继续，切歌不会重置视频时间线。
- 仅在视频成功解码首帧后切换背景，失败时自动恢复 RNP 原背景。
- 保留 RNP 的封面、歌名、歌手、全屏、设置和正常旋转歌词。
- 不点击或修改歌词 Overview/复制模式，也不修改 `body.lyric-rotate`。
- 自动检测 HEVC、4K、超高帧率等兼容性问题。
- 可自动安装并校验 FFmpeg 6.1.1，将不兼容视频转换为 H.264、1080p、30fps MP4。
- 转换始终生成新文件，不覆盖原视频。
- 播放控件精简由 RefinedNowPlaying Next 自带功能管理，本插件不重复实现。

## 安装

### BetterNCM 插件市场

上架后，在 BetterNCM 插件市场搜索 **RNP Video Background** 并安装。

### 本地安装

1. 下载本项目提供的 `rnp-video-background-0.2.2.plugin`，或等待 BetterNCM 插件市场完成同步。
2. 在 BetterNCM 插件管理器中导入该文件。
3. 重启网易云音乐，或使用 BetterNCM 的重新加载功能。
4. 确认已安装并启用 **RefinedNowPlaying Next**。

## 使用

1. 打开 BetterNCM → 插件 → **RNP Video Background** → 设置。
2. 点击“选择 MP4/WebM”，选择本地视频。
3. 需要声音时勾选“播放视频声音”，再调节视频音量。
4. 需要自动转换时，首次点击“安装转换组件”，之后选择视频即可自动检测。
5. 进入 RefinedNowPlaying Next 播放页，视频会自动循环播放。

播放控件是否精简、全屏和其他控制区显示，直接使用 RNP 自带设置。本插件不会隐藏 RNP 底部播放栏。

## 自动转换

插件会优先检测视频编码、分辨率、帧率和像素格式。HEVC/H.265、4K、超过 30fps 或浏览器不兼容的视频会转换为：

- H.264/AVC
- 最高 1920×1080
- 最高 30fps
- `yuv420p`
- MP4 Fast Start

视频声音默认关闭。关闭声音时转换结果移除音轨；开启声音时保留 AAC 128 kbps 立体声。

FFmpeg 组件安装在 `%LOCALAPPDATA%\\RNPVideoBackground\\ffmpeg-6.1.1`，插件会对下载包和可执行文件执行固定 SHA-256 校验。无法联网时，可在设置页导入离线 ZIP 组件包。

## 兼容性

推荐使用：

- MP4：H.264/AVC + `yuv420p`
- WebM：VP8 或 VP9

HEVC/H.265 是否能直接播放取决于网易云音乐内置浏览器；不兼容时请使用自动转换。

## 常见问题

### 视频黑屏

查看插件设置页的“当前媒体”和“转换组件”状态。若视频是 HEVC、4K 或 60fps，等待自动转换完成后会生成新的 `.rnp-compatible.mp4` 文件。

### 歌词变成纵向总览

这通常是 RNP 自己进入了 Overview/复制模式。本插件不会切换该模式，请使用 RNP 自带的歌词按钮恢复正常旋转歌词。

### 视频声音太大

打开“播放视频声音”，然后使用“视频音量”单独调节；网易云音乐主音量不受插件修改。

## 隐私与安全

- 视频只在本机读取，不上传视频文件或路径。
- FFmpeg 下载源和 SHA-256 固定在 `tools/worker.ps1` 中。
- 原视频不会被覆盖或删除。

## 开发与检查

```powershell
node --check main.js
node --test tests/run-tests.js
powershell -ExecutionPolicy Bypass -File scripts/package.ps1
```

## 发布状态

- 源码仓库：<https://github.com/wmgqdavid/BetterNCM-RNP-Video-Background>
- BetterNCM 商店申请：<https://github.com/BetterNCM/BetterNCM-Plugins/pull/725>
- 0.2.2 变更：移除重复的“精简播放控件”，交还 RNP 自带功能管理。
