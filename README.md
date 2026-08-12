# RNP Video Background

为 BetterNCM 的 RefinedNowPlaying Next 播放页添加可记忆的本地 MP4/WebM 视频背景。

发布状态：源码已公开，BetterNCM 官方插件库上架申请为 [PR #725](https://github.com/BetterNCM/BetterNCM-Plugins/pull/725)，等待维护者审核。

插件只改动背景和播放页控制区，不会点击或切换歌词按钮，也不会修改 `.rnp-lyrics-line`、Overview/复制模式或 `body.lyric-rotate`。因此正常旋转歌词会继续由 RefinedNowPlaying Next 自己控制。

## 功能

- 从插件设置中选择本地 `.mp4` 或 `.webm` 文件
- 自动循环、静音、铺满播放
- 记住视频路径、填充方式和背景亮度
- 进入 RefinedNowPlaying Next 播放页时隐藏其自带背景
- 保留封面、歌名、歌手与正常旋转歌词
- 默认保留 RefinedNowPlaying Next 的设置、全屏、歌词与全部交互功能
- 可选开启“精简播放控件”，仅隐藏底部播放栏、进度条、音量和 v3 控件
- 离开播放页、停用插件或清除视频后恢复原界面
- 视频成功解码首帧后才切换背景；失败时自动恢复原背景，避免整页黑屏
- 视频只在本机读取，不上传文件、路径或使用数据
- 自动检测 H.264/VP8/VP9、HEVC、分辨率、帧率与像素格式
- 可选安装 FFmpeg 6.1.1 转换组件，将不兼容视频自动转为 H.264 1080p30 MP4
- 转换后另存新文件，不覆盖或删除原视频；支持进度与取消
- 背景视频声音可选，默认关闭，并提供独立音量
- 网易云音乐暂停时视频暂停，继续时从原位置恢复；切歌不中断视频时间线

## 依赖

- BetterNCM `>= 1.0.0`
- RefinedNowPlaying Next（已按本机 `3.0.2` 验证结构）
- 网易云音乐 `> 3.1.11`

## 安装

### 插件市场（上架后）

在 BetterNCM 插件市场搜索 `RNP Video Background`，安装后打开插件设置。

### 本地安装

1. 从项目 Release 或本地交付目录取得 `rnp-video-background-0.2.1.plugin`。
2. 把该文件放入 BetterNCM 数据目录下的 `plugins` 文件夹。
3. 重启网易云音乐，或在 BetterNCM 中重新加载插件。
4. 确认 RefinedNowPlaying Next 已安装并启用。
5. 打开本插件设置；需要自动转换时先点击“安装转换组件”，再点击“选择 MP4/WebM”。

开发者也可将源码目录放入 BetterNCM 的 `plugins_dev` 目录进行测试。

## 使用

1. BetterNCM → 插件 → `RNP Video Background` → 设置。
2. 点击“选择 MP4/WebM”，选择本地视频。
3. 按需调整“裁切铺满 / 完整显示”、背景亮度和“精简播放控件”。
4. 进入 RefinedNowPlaying Next 播放页。

设置页还提供“重新加载”“清除视频”和“恢复显示默认值”。清除视频后，RefinedNowPlaying Next 原背景与控制区会立即恢复。

“精简播放控件”默认关闭。开启后只隐藏底部播放栏、进度条、音量和 v3 控件；RNP 设置菜单、全屏、歌词切换和其他功能始终保留。

## 视频兼容性

文件扩展名正确不代表视频编码一定能由网易云音乐内置浏览器播放。若出现“媒体错误”，优先使用：

- MP4：H.264/AVC 视频编码（推荐 `yuv420p`）
- WebM：VP8 或 VP9 视频编码

HEVC/H.265 是否可播放取决于网易云音乐内置 Chromium/CEF，不能仅根据 `.mp4` 扩展名判断。

背景视频声音默认关闭，用户可在设置里开启并单独调节音量。关闭声音时，自动转换会移除视频音轨；开启时保留为 AAC 128 kbps 立体声。

## 自动转换组件

转换组件不塞入插件包。用户首次在设置中点击“安装转换组件”后，插件会启动随包提供的开源 PowerShell 工作器：

1. 优先从 npmmirror 下载固定的 FFmpeg/ffprobe 6.1.1 Windows x64 静态构建；失败后切换到 GitHub Release。
2. 对压缩包和解压后的程序分别执行固定 SHA-256 校验，校验失败不会运行。
3. 组件存放在 `%LOCALAPPDATA%\RNPVideoBackground\ffmpeg-6.1.1`，约占 158 MB。
4. 无法连接两个在线源时，可在设置中导入包含对应 `ffmpeg.exe` 与 `ffprobe.exe` 的离线 ZIP 包；同样执行 SHA-256 校验。

固定构建与许可证说明见 [`tools/FFMPEG-NOTICE.txt`](tools/FFMPEG-NOTICE.txt)。

## 常见问题

### 歌词不旋转或显示成纵向总览

这通常是 RefinedNowPlaying Next 自己进入了 Overview/复制模式，或歌曲被判断为非同步歌词。本插件不进入也不强制退出该模式。请先关闭复制模式，并确认 `body` 仍有 `lyric-rotate`。

### 重启后视频丢失

插件保存的是本地文件路径。移动、重命名或删除视频后，需要重新选择文件。

### 视频黑屏

插件会保留或自动恢复 RefinedNowPlaying Next 原背景。先查看设置页状态并点击“重新加载”；仍失败时请把视频转为 H.264 MP4 或 VP8/VP9 WebM。

## 开发与检查

无需第三方依赖。使用 Node.js 运行：

```powershell
node --check main.js
node --test tests/run-tests.js
pwsh -File scripts/package.ps1
```

## 发布到 BetterNCM 插件市场

项目根目录已经包含 `.betterncm-ignore`，商店只会同步运行所需文件和预览图。完整步骤见 [`publishing/release-checklist.md`](publishing/release-checklist.md)，商店登记文件模板见 [`publishing/rnp-video-background.json`](publishing/rnp-video-background.json)。

## 隐私

本插件不发起网络请求。视频路径仅通过 BetterNCM 的插件配置保存在本机，视频通过 BetterNCM 本地文件挂载接口读取。

## 许可证

[MIT](LICENSE)
