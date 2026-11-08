/**
 * 心流花园 · GitHub Pages 静态站点构建脚本
 *
 * 用法： node tools/build.mjs [source.html]
 *   - source.html 默认读取 source/Heartflow_CatFix_V16_Scroll.html
 *   - 产出： index.html + assets/*（图片/音乐从内联 base64 抽成独立文件）
 *
 * 设计原则：尽量不改动原项目的逻辑与结构，只做「静态化 + 已知 Bug 修复」所需的最小改动。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = process.argv[2] || path.join(ROOT, 'source', 'Heartflow_CatFix_V16_Scroll.html');
const OUT = path.join(ROOT, 'index.html');
const ASSETS = path.join(ROOT, 'assets');

fs.mkdirSync(ASSETS, { recursive: true });

let html = fs.readFileSync(SRC, 'utf8');
const log = (...a) => console.log('[build]', ...a);

/* ------------------------------------------------------------------ *
 * 1. 抽取主文件里内联 base64 资源 -> assets/*
 * ------------------------------------------------------------------ */
function takeAsset(re, file, label) {
  const m = html.match(re);
  if (!m) {
    log(`!! 未找到 ${label}，跳过`);
    return;
  }
  const b64 = m[1];
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) {
    log(`!! ${label} 解码为空，放弃替换`);
    return;
  }
  fs.writeFileSync(path.join(ASSETS, file), buf);
  // 把整个 `data:<mime>;base64,<payload>` 片段整体换掉，只留下相对路径
  const payloadStart = m.index + m[0].indexOf(b64);
  const head = html.lastIndexOf('data:', payloadStart);
  if (head < 0 || payloadStart - head > 64) {
    log(`!! ${label} 定位 data URI 失败，放弃替换`);
    return;
  }
  html = html.slice(0, head) + `assets/${file}` + html.slice(payloadStart + b64.length);
  log(`${label} -> assets/${file} (${(buf.length / 1024).toFixed(1)} KB)`);
}

takeAsset(
  /"day"\s*:\s*"data:image\/webp;base64,([A-Za-z0-9+/=]+)"/,
  'room_day.webp',
  '卧室白天底图',
);
takeAsset(
  /"night"\s*:\s*"data:image\/webp;base64,([A-Za-z0-9+/=]+)"/,
  'room_night.webp',
  '卧室夜晚底图',
);
takeAsset(
  /class="hf-cat-image hf-cat-day"[^>]*src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/,
  'cat_day.png',
  '猫咪精灵图(白天)',
);
takeAsset(
  /class="hf-cat-image hf-cat-night"[^>]*src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/,
  'cat_night.png',
  '猫咪精灵图(夜晚)',
);
takeAsset(
  /hfRoomAudio\.src\s*=\s*'data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)'/,
  'jasmine.mp3',
  '《茉莉花》古筝(卧室)',
);

/* ------------------------------------------------------------------ *
 * 2. 工作台源码以 base64 内嵌在 WB_SRC 中
 *    解码 -> 抽资源 + 改文案 -> 重新编码写回
 * ------------------------------------------------------------------ */
const wbMatch = html.match(/var WB_SRC = "([A-Za-z0-9+/=]+)"/);
let wb = null;
if (wbMatch) {
  wb = Buffer.from(wbMatch[1], 'base64').toString('utf8');
} else {
  log('!! 未找到 WB_SRC');
}

if (wb) {
  /* 2.1 工作台自带的背景音乐：与卧室《茉莉花》是同一份音频，复用同一个文件 */
  const audioM = wb.match(/<audio id="gardenMusic"[^>]*src="data:audio\/mpeg;base64,([A-Za-z0-9+/=]+)"/);
  if (audioM) {
    const buf = Buffer.from(audioM[1], 'base64');
    const roomAudio = fs.readFileSync(path.join(ASSETS, 'jasmine.mp3'));
    if (buf.equals(roomAudio)) {
      wb = wb.replace(
        `data:audio/mpeg;base64,${audioM[1]}`,
        'assets/jasmine.mp3',
      );
      log('工作台背景音乐 -> 复用 assets/jasmine.mp3（与卧室同一份）');
    } else {
      fs.writeFileSync(path.join(ASSETS, 'garden_music.mp3'), buf);
      wb = wb.replace(
        `data:audio/mpeg;base64,${audioM[1]}`,
        'assets/garden_music.mp3',
      );
      log(`工作台背景音乐 -> assets/garden_music.mp3 (${(buf.length / 1024).toFixed(1)} KB)`);
    }
  }

  /* 2.2 工作台里的猫咪插画 */
  const kitM = wb.match(/src="data:image\/webp;base64,([A-Za-z0-9+/=]+)"/);
  if (kitM) {
    const buf = Buffer.from(kitM[1], 'base64');
    fs.writeFileSync(path.join(ASSETS, 'kitten.webp'), buf);
    wb = wb.replace(`data:image/webp;base64,${kitM[1]}`, 'assets/kitten.webp');
    log(`工作台猫咪插画 -> assets/kitten.webp (${(buf.length / 1024).toFixed(1)} KB)`);
  }

  /* 2.3 AI 问答在公网环境下的降级提示
   *     DeepSeek 密钥始终只存在本地 Python 服务 (127.0.0.1:8765)，前端不含密钥。
   *     公网部署时该接口不可达，明确告知用户原因。 */
  const AI_OLD =
    '💡 本地资料检索已完成，但 AI 接口尚未连接或无法访问。\\n\\n如果想让模型综合回答，可按“⚙ 接入说明”运行本地 AI 服务。没有连接时不会向第三方发送资料。';
  const AI_NEW =
    '💡 本地资料检索已完成，但 AI 接口尚未连接或无法访问。\\n\\n如果想让模型综合回答，可按“⚙ 接入说明”运行本地 AI 服务。没有连接时不会向第三方发送资料。' +
    '\\n\\n📌 你现在访问的是公开的 GitHub Pages 站点，浏览器无法连接到运行在你自己电脑上的本地 AI 服务（127.0.0.1:8765），因此 AI 综合回答在此不可用；其余的本地检索、阅读、七日历与资料管理功能全部正常。';

  if (wb.includes(AI_OLD)) {
    wb = wb.replace(AI_OLD, AI_NEW);
    log('已优化：公网环境下 AI 问答的降级提示');
  } else {
    log('!! AI 降级提示片段未匹配（跳过）');
  }

  html = html.replace(wbMatch[1], Buffer.from(wb, 'utf8').toString('base64'));
}

/* ------------------------------------------------------------------ *
 * 3. 修复 1：Content-Security-Policy 放行同源资源
 *    资源从内联 base64 变成 assets/* 相对路径后，需要 'self' 才能加载。
 * ------------------------------------------------------------------ */
const oldCsp =
  "default-src 'none'; img-src data: blob:; media-src data: blob:; font-src data:; " +
  "style-src 'unsafe-inline'; script-src 'unsafe-inline'; " +
  "connect-src http://127.0.0.1:8765 http://localhost:8765; form-action 'none'";
const newCsp =
  "default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; " +
  "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; " +
  "connect-src 'self' http://127.0.0.1:8765 http://localhost:8765; form-action 'none'";
if (html.includes(oldCsp)) {
  html = html.replace(oldCsp, newCsp);
  log('已修复 CSP：img/media/font/style/script/connect 放行 same-origin');
} else {
  log('!! CSP 片段未匹配，请人工检查');
}

/* ------------------------------------------------------------------ *
 * 4. 修复 2：隐藏未使用的 game canvas
 *    该 canvas 没有绘制内容，却占据 100vh 流式高度，会在工作台顶部留下
 *    一段空白、并干扰滚动高度计算。
 * ------------------------------------------------------------------ */
const scrollFixId = '<style id="hf-scroll-fix">';
if (html.includes(scrollFixId)) {
  html = html.replace(
    scrollFixId,
    scrollFixId + '\n/* V1.6: 未使用的 game canvas 不参与布局 */\ncanvas#game{display:none!important}',
  );
  log('已修复：隐藏未使用的 game canvas');
}

/* ------------------------------------------------------------------ *
 * 5. 修复 3：进入 / 返回房间的「重复闪烁」
 *    原因：
 *      - 进入时房间在镜头动画中途淡出，过渡不同步会露底闪白；
 *      - 返回时 is-fading 与 is-hidden 的切换顺序会产生 0 -> 1 的二次淡入。
 *    处理：
 *      - 进入：淡出安排在镜头动画结束前，刚好与 TRANS 对齐；
 *      - 返回：先置 is-fading 再显示，保证只有一次淡入。
 * ------------------------------------------------------------------ */
const oldEnter = `  setTimeout(() => {
    root.classList.add('is-fading');
    flare.classList.remove('is-on');
    void flare.offsetWidth;
    flare.classList.add('is-on');
  }, Math.min(520, TRANS * 0.36));`;
const newEnter = `  setTimeout(() => {
    root.classList.add('is-fading');
    flare.classList.remove('is-on');
    void flare.offsetWidth;
    flare.classList.add('is-on');
  }, Math.max(0, TRANS - 420));`;
if (html.includes(oldEnter)) {
  html = html.replace(oldEnter, newEnter);
  log('已修复：进入房间时淡出与镜头动画对齐（消除中途闪白）');
} else {
  log('!! enterWork 片段未匹配');
}

const oldLeave = `  root.classList.remove('is-hidden');
  root.classList.add('is-fading');
  stage.style.transitionDuration = '0ms';
  stage.style.transform = lastZoom || zoomTransform().transform;
  zoomed = true;
  void root.offsetWidth;

  stage.style.transitionDuration = TRANS + 'ms';
  const base = \`translate(\${tx}px, \${ty}px) scale(\${s})\`;
  requestAnimationFrame(() => {
    stage.style.transform = base;
    root.classList.remove('is-fading');
    flare.classList.remove('is-on');
  });`;
const newLeave = `  root.classList.add('is-fading');
  root.classList.remove('is-hidden');
  stage.style.transitionDuration = '0ms';
  stage.style.transform = lastZoom || zoomTransform().transform;
  zoomed = true;
  void root.offsetWidth;

  const base = \`translate(\${tx}px, \${ty}px) scale(\${s})\`;
  requestAnimationFrame(() => {
    stage.style.transitionDuration = TRANS + 'ms';
    stage.style.transform = base;
    root.classList.remove('is-fading');
    flare.classList.remove('is-on');
  });`;
if (html.includes(oldLeave)) {
  html = html.replace(oldLeave, newLeave);
  log('已修复：返回房间时只淡入一次（消除重复闪烁）');
} else {
  log('!! leaveWork 片段未匹配');
}

/* ------------------------------------------------------------------ *
 * 6. 优化：自动播放被拦截时的提示更明确
 * ------------------------------------------------------------------ */
const oldStatus =
  `hfMusicStatus.textContent = playing ? '卧室循环播放中' : (hfMusicManuallyPaused ? '已暂停' : '点一下房间即可播放');`;
const newStatus =
  `hfMusicStatus.textContent = playing ? '卧室循环播放中' : (hfMusicManuallyPaused ? '已暂停' : '浏览器已拦截自动播放 · 点此或点房间即可播放');`;
if (html.includes(oldStatus)) {
  html = html.replace(oldStatus, newStatus);
  log('已优化：自动播放被拦截时的提示文案');
}

/* ------------------------------------------------------------------ *
 * 7. 写入产物
 * ------------------------------------------------------------------ */
fs.writeFileSync(OUT, html, 'utf8');
log(`写入 ${OUT} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
log('完成。');
