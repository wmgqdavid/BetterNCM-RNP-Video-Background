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
  assert.equal(manifest.version, "0.1.1");
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
});

test("plugin code uses local BetterNCM file APIs and has no network call", () => {
  assert.match(mainSource, /betterncm\.app\.openFileDialog/);
  assert.match(mainSource, /betterncm\.fs\.mountFile/);
  assert.doesNotMatch(mainSource, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
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
});
