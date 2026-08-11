const RNPVB_ID = "rnp-video-background";
const RNPVB_VIDEO_ID = "rnpvb-video";
const RNPVB_STYLE_ID = "rnpvb-style";
const RNPVB_FILTER = "视频文件 (*.mp4;*.webm)\0*.mp4;*.webm\0所有文件 (*.*)\0*.*\0";
const RNPVB_DEFAULTS = Object.freeze({
  enabled: true,
  filePath: "",
  fileName: "",
  lastDirectory: "",
  fit: "cover",
  brightness: 0.65
});

function rnpvbClamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rnpvbBaseName(filePath) {
  return String(filePath || "").split(/[\\/]/).pop() || "";
}

function rnpvbDirectoryName(filePath) {
  const value = String(filePath || "");
  const index = Math.max(value.lastIndexOf("\\"), value.lastIndexOf("/"));
  return index > 0 ? value.slice(0, index) : "";
}

function rnpvbIsSupportedVideoPath(filePath) {
  return /\.(mp4|webm)$/i.test(String(filePath || "").trim());
}

function rnpvbNormalizeSettings(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const numericBrightness = Number(input.brightness);
  return {
    enabled: input.enabled === undefined ? RNPVB_DEFAULTS.enabled : Boolean(input.enabled),
    filePath: typeof input.filePath === "string" ? input.filePath : "",
    fileName: typeof input.fileName === "string" ? input.fileName : "",
    lastDirectory: typeof input.lastDirectory === "string" ? input.lastDirectory : "",
    fit: input.fit === "contain" ? "contain" : "cover",
    brightness: Number.isFinite(numericBrightness)
      ? rnpvbClamp(numericBrightness, 0.15, 1)
      : RNPVB_DEFAULTS.brightness
  };
}

const rnpvbState = {
  settings: rnpvbNormalizeSettings(plugin.getConfig("settings", RNPVB_DEFAULTS)),
  observer: null,
  syncTimer: null,
  destroyed: false,
  styleElement: null,
  videoElement: null,
  sourcePath: "",
  sourceUrl: "",
  mountToken: 0,
  retryPlayHandler: null,
  configRoots: new Set(),
  status: {
    kind: "idle",
    message: "请选择一个 MP4 或 WebM 视频。"
  }
};

function rnpvbSetStatus(message, kind) {
  rnpvbState.status = {
    message: String(message || ""),
    kind: kind || "idle"
  };
  rnpvbRefreshConfigViews();
  if (kind === "error") {
    console.warn(`[${RNPVB_ID}] ${message}`);
  }
}

function rnpvbSaveSettings(nextSettings) {
  rnpvbState.settings = rnpvbNormalizeSettings(nextSettings);
  plugin.setConfig("settings", rnpvbState.settings);
  rnpvbRefreshConfigViews();
}

function rnpvbUpdateSettings(patch, options) {
  const previousPath = rnpvbState.settings.filePath;
  rnpvbSaveSettings(Object.assign({}, rnpvbState.settings, patch));
  if ((options && options.reloadSource) || previousPath !== rnpvbState.settings.filePath) {
    rnpvbClearMountedSource();
  }
  rnpvbApplyVisualSettings();
  rnpvbScheduleSync();
}

function rnpvbApplyVisualSettings() {
  const body = document.body;
  if (!body) return;
  body.style.setProperty("--rnpvb-fit", rnpvbState.settings.fit);
  body.style.setProperty("--rnpvb-brightness", String(rnpvbState.settings.brightness));
}

async function rnpvbInjectStyles() {
  const previous = document.getElementById(RNPVB_STYLE_ID);
  if (previous) previous.remove();

  const style = document.createElement("style");
  style.id = RNPVB_STYLE_ID;
  try {
    const cssPath = `${plugin.pluginPath}/style.css`;
    const cssText = await betterncm.fs.readFileText(cssPath);
    if (!cssText || !String(cssText).includes(`#${RNPVB_VIDEO_ID}`)) {
      throw new Error("style.css 内容为空或不完整");
    }
    style.textContent = String(cssText);
  } catch (error) {
    style.textContent = `#${RNPVB_VIDEO_ID}{position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;pointer-events:none;z-index:0}`;
    rnpvbSetStatus(`样式文件加载失败：${error.message || error}`, "error");
  }
  document.head.appendChild(style);
  rnpvbState.styleElement = style;
}

function rnpvbClearMountedSource() {
  rnpvbState.mountToken += 1;
  rnpvbState.sourcePath = "";
  rnpvbState.sourceUrl = "";
  const video = rnpvbState.videoElement;
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

async function rnpvbMountSource(filePath) {
  if (!rnpvbIsSupportedVideoPath(filePath)) {
    throw new Error("仅支持 MP4 或 WebM 文件");
  }

  if (typeof betterncm.fs.exists === "function") {
    const exists = await betterncm.fs.exists(filePath);
    if (!exists) throw new Error("视频文件不存在，请重新选择");
  }

  const mountedUrl = await betterncm.fs.mountFile(filePath);
  const normalizedUrl = String(mountedUrl || "").trim();
  if (!normalizedUrl) throw new Error("BetterNCM 未能挂载该视频文件");
  return normalizedUrl;
}

async function rnpvbEnsureMountedSource() {
  const filePath = rnpvbState.settings.filePath;
  if (rnpvbState.sourcePath === filePath && rnpvbState.sourceUrl) {
    return rnpvbState.sourceUrl;
  }

  const token = ++rnpvbState.mountToken;
  rnpvbSetStatus(`正在加载 ${rnpvbState.settings.fileName || rnpvbBaseName(filePath)}…`, "loading");
  const mountedUrl = await rnpvbMountSource(filePath);
  if (token !== rnpvbState.mountToken) return "";
  rnpvbState.sourcePath = filePath;
  rnpvbState.sourceUrl = mountedUrl;
  return mountedUrl;
}

function rnpvbBindVideoEvents(video) {
  if (video.dataset.rnpvbBound === "1") return;
  video.dataset.rnpvbBound = "1";
  video.addEventListener("canplay", () => {
    rnpvbSetStatus(`正在播放 ${rnpvbState.settings.fileName || "本地视频"}`, "ok");
  });
  video.addEventListener("error", () => {
    const mediaError = video.error;
    const code = mediaError ? `（媒体错误 ${mediaError.code}）` : "";
    rnpvbSetStatus(`视频无法播放${code}，请确认编码或重新选择文件。`, "error");
  });
}

function rnpvbEnsureVideo(container, sourceUrl) {
  let video = document.getElementById(RNPVB_VIDEO_ID);
  if (!video) {
    video = document.createElement("video");
    video.id = RNPVB_VIDEO_ID;
    video.setAttribute("aria-hidden", "true");
    video.setAttribute("playsinline", "");
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.preload = "auto";
    rnpvbBindVideoEvents(video);
  }

  if (video.parentElement !== container) {
    container.insertBefore(video, container.firstChild || null);
  }

  if (video.getAttribute("src") !== sourceUrl) {
    video.src = sourceUrl;
    video.load();
  }

  rnpvbState.videoElement = video;
  return video;
}

async function rnpvbAttemptPlay(video) {
  try {
    const playResult = video.play();
    if (playResult && typeof playResult.then === "function") await playResult;
  } catch (error) {
    rnpvbSetStatus("自动播放被拦截；在播放页点击一次即可继续。", "error");
    if (rnpvbState.retryPlayHandler) {
      document.removeEventListener("pointerdown", rnpvbState.retryPlayHandler, true);
    }
    rnpvbState.retryPlayHandler = () => {
      video.muted = true;
      video.play().catch(() => {
        rnpvbSetStatus("仍无法自动播放，请在插件设置中点击“重新加载”。", "error");
      });
      rnpvbState.retryPlayHandler = null;
    };
    document.addEventListener("pointerdown", rnpvbState.retryPlayHandler, {
      once: true,
      capture: true
    });
  }
}

function rnpvbDeactivate(removeVideo) {
  if (document.body) {
    document.body.classList.remove("rnpvb-active", "rnpvb-has-source");
  }
  const video = rnpvbState.videoElement || document.getElementById(RNPVB_VIDEO_ID);
  if (video) {
    video.pause();
    if (removeVideo) video.remove();
  }
  if (removeVideo) rnpvbState.videoElement = null;
}

async function rnpvbSyncPage() {
  if (rnpvbState.destroyed) return;
  const body = document.body;
  const container = document.querySelector(".g-single");
  const onRefinedNowPlaying = Boolean(
    body &&
    container &&
    body.classList.contains("refined-now-playing") &&
    body.classList.contains("mq-playing")
  );

  if (!rnpvbState.settings.enabled || !rnpvbState.settings.filePath) {
    rnpvbDeactivate(true);
    return;
  }

  if (!onRefinedNowPlaying) {
    rnpvbDeactivate(false);
    return;
  }

  try {
    const sourceUrl = await rnpvbEnsureMountedSource();
    if (!sourceUrl || rnpvbState.destroyed) return;
    const currentContainer = document.querySelector(".g-single");
    if (!currentContainer || !document.body.classList.contains("mq-playing")) return;

    const video = rnpvbEnsureVideo(currentContainer, sourceUrl);
    rnpvbApplyVisualSettings();
    document.body.classList.add("rnpvb-active", "rnpvb-has-source");
    await rnpvbAttemptPlay(video);
  } catch (error) {
    rnpvbDeactivate(true);
    rnpvbSetStatus(error.message || String(error), "error");
  }
}

function rnpvbScheduleSync() {
  if (rnpvbState.destroyed) return;
  if (rnpvbState.syncTimer) clearTimeout(rnpvbState.syncTimer);
  rnpvbState.syncTimer = setTimeout(() => {
    rnpvbState.syncTimer = null;
    rnpvbSyncPage();
  }, 80);
}

function rnpvbCreateElement(tagName, attributes, children) {
  const element = document.createElement(tagName);
  Object.entries(attributes || {}).forEach(([key, value]) => {
    if (key === "className") element.className = value;
    else if (key === "textContent") element.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      element.setAttribute(key, String(value));
    }
  });
  (children || []).forEach((child) => {
    element.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return element;
}

function rnpvbConfigRow(label, control) {
  return rnpvbCreateElement("div", { className: "rnpvb-row" }, [
    rnpvbCreateElement("div", { textContent: label }),
    rnpvbCreateElement("div", { className: "rnpvb-control" }, [control])
  ]);
}

async function rnpvbChooseVideo(button) {
  if (button) button.disabled = true;
  try {
    const filePath = await betterncm.app.openFileDialog(
      RNPVB_FILTER,
      rnpvbState.settings.lastDirectory || ""
    );
    if (!filePath) {
      rnpvbSetStatus("未更改视频。", "idle");
      return;
    }
    if (!rnpvbIsSupportedVideoPath(filePath)) {
      throw new Error("请选择扩展名为 .mp4 或 .webm 的视频文件");
    }
    rnpvbUpdateSettings({
      enabled: true,
      filePath,
      fileName: rnpvbBaseName(filePath),
      lastDirectory: rnpvbDirectoryName(filePath)
    }, { reloadSource: true });
    rnpvbSetStatus("视频已选择，进入 RefinedNowPlaying Next 播放页即可查看。", "ok");
  } catch (error) {
    rnpvbSetStatus(error.message || String(error), "error");
  } finally {
    if (button) button.disabled = false;
  }
}

function rnpvbRefreshConfigViews() {
  rnpvbState.configRoots.forEach((root) => {
    if (!root) return;
    const enabled = root.querySelector('[data-rnpvb-field="enabled"]');
    const fit = root.querySelector('[data-rnpvb-field="fit"]');
    const brightness = root.querySelector('[data-rnpvb-field="brightness"]');
    const brightnessValue = root.querySelector('[data-rnpvb-field="brightness-value"]');
    const fileName = root.querySelector('[data-rnpvb-field="file-name"]');
    const status = root.querySelector('[data-rnpvb-field="status"]');
    const dependency = root.querySelector('[data-rnpvb-field="dependency"]');

    if (enabled) enabled.checked = rnpvbState.settings.enabled;
    if (fit) fit.value = rnpvbState.settings.fit;
    if (brightness) brightness.value = String(rnpvbState.settings.brightness);
    if (brightnessValue) brightnessValue.textContent = `${Math.round(rnpvbState.settings.brightness * 100)}%`;
    if (fileName) fileName.textContent = rnpvbState.settings.fileName || "尚未选择";
    if (status) {
      status.textContent = rnpvbState.status.message;
      status.dataset.kind = rnpvbState.status.kind;
    }
    if (dependency) {
      const ready = Boolean(window.loadedPlugins && window.loadedPlugins.RefinedNowPlayingNext);
      dependency.textContent = ready
        ? "RefinedNowPlaying Next 已加载"
        : "未检测到 RefinedNowPlaying Next";
    }
  });
}

function rnpvbCreateConfigView() {
  const root = rnpvbCreateElement("div", { className: "rnpvb-config" });
  rnpvbState.configRoots.add(root);

  const title = rnpvbCreateElement("h2", { textContent: "RNP Video Background" });
  const lead = rnpvbCreateElement("p", {
    className: "rnpvb-lead",
    textContent: "在 RefinedNowPlaying Next 中循环静音播放本地视频，并隐藏原背景与底部控制区。"
  });

  const enabledInput = rnpvbCreateElement("input", {
    type: "checkbox",
    "data-rnpvb-field": "enabled",
    onchange: (event) => rnpvbUpdateSettings({ enabled: event.target.checked })
  });

  const fileName = rnpvbCreateElement("span", {
    className: "rnpvb-file-name",
    "data-rnpvb-field": "file-name"
  });
  const chooseButton = rnpvbCreateElement("button", {
    type: "button",
    textContent: "选择 MP4/WebM"
  });
  chooseButton.addEventListener("click", () => rnpvbChooseVideo(chooseButton));
  const fileControl = rnpvbCreateElement("div", { className: "rnpvb-control" }, [
    fileName,
    chooseButton
  ]);

  const fitSelect = rnpvbCreateElement("select", {
    "data-rnpvb-field": "fit",
    onchange: (event) => rnpvbUpdateSettings({ fit: event.target.value })
  }, [
    rnpvbCreateElement("option", { value: "cover", textContent: "裁切铺满" }),
    rnpvbCreateElement("option", { value: "contain", textContent: "完整显示" })
  ]);

  const brightnessInput = rnpvbCreateElement("input", {
    type: "range",
    min: "0.15",
    max: "1",
    step: "0.05",
    "data-rnpvb-field": "brightness",
    oninput: (event) => rnpvbUpdateSettings({ brightness: Number(event.target.value) })
  });
  const brightnessValue = rnpvbCreateElement("span", {
    className: "rnpvb-range-value",
    "data-rnpvb-field": "brightness-value"
  });
  const brightnessControl = rnpvbCreateElement("div", { className: "rnpvb-control" }, [
    brightnessInput,
    brightnessValue
  ]);

  const dependency = rnpvbCreateElement("span", {
    "data-rnpvb-field": "dependency"
  });

  const card = rnpvbCreateElement("div", { className: "rnpvb-card" }, [
    rnpvbConfigRow("启用视频背景", enabledInput),
    rnpvbCreateElement("div", { className: "rnpvb-row" }, [
      rnpvbCreateElement("div", { textContent: "本地视频" }),
      fileControl
    ]),
    rnpvbConfigRow("填充方式", fitSelect),
    rnpvbCreateElement("div", { className: "rnpvb-row" }, [
      rnpvbCreateElement("div", { textContent: "背景亮度" }),
      brightnessControl
    ]),
    rnpvbConfigRow("依赖状态", dependency)
  ]);

  const reloadButton = rnpvbCreateElement("button", {
    type: "button",
    textContent: "重新加载",
    onclick: () => {
      rnpvbClearMountedSource();
      rnpvbSetStatus("正在重新加载视频…", "loading");
      rnpvbScheduleSync();
    }
  });
  const clearButton = rnpvbCreateElement("button", {
    type: "button",
    textContent: "清除视频",
    onclick: () => {
      rnpvbUpdateSettings({ filePath: "", fileName: "" }, { reloadSource: true });
      rnpvbSetStatus("视频已清除，RefinedNowPlaying Next 原界面已恢复。", "idle");
    }
  });
  const resetButton = rnpvbCreateElement("button", {
    type: "button",
    textContent: "恢复显示默认值",
    onclick: () => {
      rnpvbUpdateSettings({
        enabled: RNPVB_DEFAULTS.enabled,
        fit: RNPVB_DEFAULTS.fit,
        brightness: RNPVB_DEFAULTS.brightness
      });
      rnpvbSetStatus("显示设置已恢复；当前视频保留。", "ok");
    }
  });

  const actions = rnpvbCreateElement("div", { className: "rnpvb-actions" }, [
    reloadButton,
    clearButton,
    resetButton
  ]);
  const status = rnpvbCreateElement("div", {
    className: "rnpvb-status",
    "data-rnpvb-field": "status"
  });
  const note = rnpvbCreateElement("p", {
    className: "rnpvb-note",
    textContent: "文件路径仅保存在本机 BetterNCM 配置中；插件不会上传视频、路径或使用数据。"
  });

  root.append(title, lead, card, actions, status, note);
  rnpvbRefreshConfigViews();
  return root;
}

function rnpvbDestroy() {
  rnpvbState.destroyed = true;
  if (rnpvbState.syncTimer) clearTimeout(rnpvbState.syncTimer);
  if (rnpvbState.observer) rnpvbState.observer.disconnect();
  if (rnpvbState.retryPlayHandler) {
    document.removeEventListener("pointerdown", rnpvbState.retryPlayHandler, true);
  }
  rnpvbDeactivate(true);
  rnpvbClearMountedSource();
  if (rnpvbState.styleElement) rnpvbState.styleElement.remove();
  if (document.body) {
    document.body.style.removeProperty("--rnpvb-fit");
    document.body.style.removeProperty("--rnpvb-brightness");
  }
}

async function rnpvbBootstrap(selfPlugin) {
  if (window.__RNPVB_RUNTIME__ && typeof window.__RNPVB_RUNTIME__.destroy === "function") {
    window.__RNPVB_RUNTIME__.destroy();
  }
  rnpvbState.destroyed = false;
  await rnpvbInjectStyles();
  rnpvbApplyVisualSettings();

  rnpvbState.observer = new MutationObserver(rnpvbScheduleSync);
  rnpvbState.observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true
  });
  window.addEventListener("hashchange", rnpvbScheduleSync);

  const runtime = {
    destroy: () => {
      window.removeEventListener("hashchange", rnpvbScheduleSync);
      rnpvbDestroy();
    },
    reload: () => {
      rnpvbClearMountedSource();
      rnpvbScheduleSync();
    },
    getStatus: () => Object.assign({}, rnpvbState.status)
  };
  window.__RNPVB_RUNTIME__ = runtime;
  selfPlugin.rnpVideoBackground = runtime;
  rnpvbScheduleSync();
}

if (g…2093 tokens truncated…ill="none" stroke="url(#ring)">
      <circle r="112" stroke-width="3" opacity=".5"/>
      <circle r="91" stroke-width="4" opacity=".65"/>
      <circle r="69" stroke-width="5" opacity=".78"/>
      <circle r="48" stroke-width="6" opacity=".92"/>
      <circle r="26" stroke-width="7"/>
    </g>
    <circle cx="239" cy="58" r="5" fill="#53e5ff"/>
  </g>
  <text x="65" y="472" fill="#fff" font-family="Segoe UI, Arial, sans-serif" font-size="31" font-weight="700" letter-spacing="2">MIDNIGHT SIGNAL</text>
  <text x="66" y="507" fill="#bcb0ff" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600" letter-spacing="5">LOCAL VIDEO</text>

  <g font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">
    <text x="654" y="178" fill="#aaa9c9" opacity=".34" font-size="20" transform="rotate(7 654 178)">Through the silence, I still hear you call</text>
    <text x="647" y="226" fill="#c6c2e7" opacity=".58" font-size="24" transform="rotate(5 647 226)">Neon skies are falling down</text>
    <text x="650" y="287" fill="#fff" font-size="30" font-weight="700" transform="rotate(-3 650 287)">Echoes travel far in the midnight signal</text>
    <text x="650" y="337" fill="#c6c2e7" opacity=".62" font-size="23" transform="rotate(-4 650 337)">Lost between the waves of time</text>
    <text x="647" y="380" fill="#aaa9c9" opacity=".34" font-size="19" transform="rotate(-6 647 380)">Someday soon, we’ll find the light</text>
  </g>

  <g transform="translate(615 414)" filter="url(#shadow)" font-family="Segoe UI, Arial, sans-serif">
    <rect width="292" height="166" rx="16" fill="#08132b" fill-opacity=".84" stroke="#655bc3"/>
    <g fill="#e8e9ff" font-size="15">
      <text x="60" y="38">MP4 / WebM</text>
      <text x="60" y="78">LOOP</text>
      <text x="60" y="118">MUTE</text>
      <text x="60" y="152">BRIGHTNESS</text>
    </g>
    <g stroke="#41d8ff" stroke-width="2" fill="none">
      <rect x="18" y="21" width="18" height="20" rx="2"/>
      <path d="M24 21v20M30 21v20M18 27h18M18 35h18"/>
      <path d="M18 71a12 12 0 0 1 20-7l3 3M41 59v8h-8M40 73a12 12 0 0 1-20 7l-3-3M17 85v-8h8"/>
      <path d="M20 112h6l8-7v22l-8-7h-6zM39 108l9 14M48 108l-9 14"/>
      <circle cx="27" cy="147" r="7"/>
      <path d="M27 134v-5M27 165v-5M14 147H9M45 147h-5M18 138l-4-4M40 160l-4-4M36 138l4-4M14 160l4-4"/>
    </g>
    <g>
      <rect x="224" y="61" width="45" height="22" rx="11" fill="#30cfff"/>
      <circle cx="258" cy="72" r="8" fill="#fff"/>
      <rect x="224" y="101" width="45" height="22" rx="11" fill="#42465e"/>
      <circle cx="235" cy="112" r="8" fill="#d8d8df"/>
      <rect x="176" y="145" width="93" height="4" rx="2" fill="#38415d"/>
      <rect x="176" y="145" width="62" height="4" rx="2" fill="#45d9ff"/>
      <circle cx="238" cy="147" r="7" fill="#b8adff"/>
    </g>
  </g>
  <rect x="5" y="5" width="950" height="630" rx="19" fill="none" stroke="#7772bb" stroke-opacity=".45"/>
</svg>
