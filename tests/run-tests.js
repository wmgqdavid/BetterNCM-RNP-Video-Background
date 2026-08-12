const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const mainPath = path.join(root, "main.js");
const stylePath = path.join(root, "style.css");
const manifestPath = path.join(root, "manifest.json");
const mainSource = fs.readFileSync(mainPath, "utf8");
const styleSource = fs.readFileSync(stylePath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function loadPureApi() {
  const callbacks = {};
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    globalThis: null,
    plugin: {
      pluginPath: root,
      getConfig: (_key, fallback) => fallback,
      setConfig: () => {},
      onLoad: (callback) => { callbacks.onLoad = callback; },
      onAllPluginsLoaded: (callback) => { callbacks.onAllPluginsLoaded = callback; },
      onConfig: (callback) => { callbacks.onConfig = callback; }
    }
  });
  context.globalThis = context;
  context.__RNPVB_TESTING__ = true;
  new vm.Script(mainSource, { filename: mainPath }).runInContext(context);
  return { api: context.__RNPVB_TEST_API__, callbacks };
}

test("manifest contains the required BetterNCM metadata", () => {
  assert.equal(manifest.manifest_version, 1);
  assert.equal(manifest.slug, "rnp-video-background");
  assert.equal(manifest.version, "0.2.0");
  assert.deepEqual(manifest.requirements, ["RefinedNowPlayingNext"]);
  assert.deepEqual(manifest.loadAfter, ["RefinedNowPlayingNext"]);
  assert.equal(manifest.injects.Main[0].file, "main.js");
  assert.equal(manifest.preview, "preview.svg");
});

test("main script registers all three BetterNCM lifecycle callbacks", () => {
  const { callbacks } = loadPureApi();
  assert.equal(typeof callbacks.onLoad, "function");
  assert.equal(typeof callbacks.onAllPluginsLoaded, "function");
  assert.equal(typeof callbacks.onConfig, "function");
});

test("path helpers accept only MP4 and WebM case-insensitively", () => {
  const { api } = loadPureApi();
  assert.equal(api.isSupportedVideoPath("D:\\media\\bg.MP4"), true);
  assert.equal(api.isSupportedVideoPath("/media/bg.webm"), true);
  assert.equal(api.isSupportedVideoPath("/media/bg.mov"), false);
  assert.equal(api.baseName("D:\\media\\bg.mp4"), "bg.mp4");
  assert.equal(api.directoryName("D:\\media\\bg.mp4"), "D:\\media");
});

test("settings normalization clamps brightness and rejects unknown fit", () => {
  const { api } = loadPureApi();
  assert.equal(api.normalizeSettings({ brightness: 9 }).brightness, 1);
  assert.equal(api.normalizeSettings({ brightness: 0 }).brightness, 0.15);
  assert.equal(api.normalizeSettings({ fit: "stretch" }).fit, "cover");
  assert.equal(api.normalizeSettings({ fit: "contain" }).fit, "contain");
  assert.equal(api.normalizeSettings({}).compactControls, false);
  assert.equal(api.normalizeSettings({ compactControls: true }).compactControls, true);
  assert.equal(api.normalizeSettings({}).videoAudioEnabled, false);
  assert.equal(api.normalizeSettings({}).videoVolume, 0.35);
  assert.equal(api.normalizeSettings({ videoVolume: 9 }).videoVolume, 1);
  assert.equal(api.normalizeSettings({}).syncWithMusicPlayback, true);
  assert.equal(api.normalizeSettings({}).autoConvert, true);
});

test("plugin code uses BetterNCM file and worker APIs", () => {
  assert.match(mainSource, /betterncm\.app\.openFileDialog/);
  assert.match(mainSource, /betterncm\.fs\.mountFile/);
  assert.match(mainSource, /betterncm\.fs\.writeFileText/);
  assert.match(mainSource, /betterncm\.app\.exec/);
  assert.doesNotMatch(mainSource, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
});

test("media analysis converts HEVC, 4K and high frame rate sources", () => {
  const { api } = loadPureApi();
  const compatible = api.analyzeMedia({
    format: { format_name: "mov,mp4,m4a,3gp,3g2,mj2", duration: "10", size: "1000" },
    streams: [{ codec_type: "video", codec_name: "h264", pix_fmt: "yuv420p", width: 1920, height: 1080, avg_frame_rate: "30000/1001" }]
  });
  assert.equal(compatible.compatible, true);

  const incompatible = api.analyzeMedia({
    format: { format_name: "mov,mp4" },
    streams: [{ codec_type: "video", codec_name: "hevc", pix_fmt: "yuv420p10le", width: 3840, height: 2160, avg_frame_rate: "120/1" }]
  });
  assert.equal(incompatible.compatible, false);
  assert.ok(incompatible.reasons.length >= 3);
});

test("video mounts inside the native RNP background layer", () => {
  assert.match(mainSource, /#rnp-view \.g-single > \.rnp-bg/);
  assert.match(mainSource, /backgroundContainer\.appendChild\(video\)/);
  assert.doesNotMatch(mainSource, /currentContainer|insertBefore\(video/);
  assert.match(styleSource, /#rnpvb-video\s*\{[\s\S]*?position:\s*absolute/);
});

test("native background is hidden only after the video is ready", () => {
  assert.match(styleSource, /body\.rnpvb-ready\.mq-playing \.rnp-bg > :not\(#rnpvb-video\)/);
  assert.match(styleSource, /body\.rnpvb-ready\.mq-playing \.rnp-bg\s*\{[\s\S]*?visibility:\s*visible/);
  assert.doesNotMatch(styleSource, /body\.rnpvb-active\.mq-playing \.rnp-bg/);
  assert.match(mainSource, /rnpvbSetPagePhase\("ready"\)/);
  assert.match(mainSource, /rnpvbFailVideo\(video/);
});

test("compact controls are opt-in and cannot hide RNP settings", () => {
  assert.match(mainSource, /compactControls:\s*false/);
  assert.match(mainSource, /classList\.toggle\("rnpvb-compact-controls"/);
  assert.match(mainSource, /data-rnpvb-field":\s*"compact-controls"/);
  assert.match(
    styleSource,
    /body\.rnpvb-ready\.rnpvb-compact-controls\.mq-playing #main-player/
  );
  assert.doesNotMatch(styleSource, /body\.rnpvb-ready\.mq-playing #main-player/);

  const protectedSelectors = [
    "#rnp-settings",
    ".rnp-settings-menu",
    ".rnp-full-screen-button",
    ".rnp-full-screen-clock",
    ".rnp-mini-song-info",
    ".rnp-lyrics-switch",
    ".u-resize"
  ];
  protectedSelectors.forEach((selector) => {
    assert.equal(styleSource.includes(selector), false, selector);
  });
});

test("media errors provide actionable codec guidance", () => {
  const { api } = loadPureApi();
  assert.match(api.mediaErrorMessage({ code: 2 }), /读取失败/);
  assert.match(api.mediaErrorMessage({ code: 3 }), /H\.264\/AVC/);
  assert.match(api.mediaErrorMessage({ code: 4 }), /不受支持/);
});

test("plugin cannot switch or style lyric overview/rotation state", () => {
  const combined = `${mainSource}\n${styleSource}`;
  const forbidden = [
    "rnp-lyrics-switch-btn-overview-mode",
    "rnp-lyrics-overview-container",
    "overview-mode-hide",
    "rnp-lyrics-line",
    "lyric-rotate"
  ];
  forbidden.forEach((token) => assert.equal(combined.includes(token), false, token));
});

test("runtime files referenced by the manifest exist", () => {
  assert.equal(fs.existsSync(mainPath), true);
  assert.equal(fs.existsSync(stylePath), true);
  assert.equal(fs.existsSync(path.join(root, manifest.preview)), true);
  assert.ok(fs.statSync(path.join(root, manifest.preview)).size < 500_000);
  ["launcher.vbs", "worker.ps1", "FFMPEG-NOTICE.txt"].forEach((name) => {
    assert.equal(fs.existsSync(path.join(root, "tools", name)), true, name);
  });
});

test("worker pins and verifies FFmpeg and never overwrites the source", () => {
  const worker = fs.readFileSync(path.join(root, "tools", "worker.ps1"), "utf8");
  assert.match(worker, /ComponentVersion = "6\.1\.1"/);
  assert.match(worker, /8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77/);
  assert.match(worker, /f309e6223ad89d2fe54bccd420a7709b66fd27540674e92309578ed491a43c8d/);
  assert.match(worker, /output.*不得覆盖原视频/i);
  assert.match(worker, /-c:v", "libx264"/);
  assert.match(worker, /-pix_fmt", "yuv420p"/);
  assert.match(worker, /-an/);
  assert.match(worker, /-b:a", "128k"/);
});
