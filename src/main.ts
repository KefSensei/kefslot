import { Application, Rectangle } from 'pixi.js';
import { Game } from '@/core/Game';
import { GameConfig } from '@/config/GameConfig';
import gsap from 'gsap';

declare global {
  interface Window {
    __kefslot_app?: Application;
    __kefslot_resize?: () => void;
  }
}

const dbg = (msg: string) => {
  const d = document.getElementById('loading');
  if (d) {
    d.style.display = 'block';
    d.innerHTML += `<div style="color:lime;font-size:12px;text-align:left;padding:2px 20px">${msg}</div>`;
  }
};

async function boot() {
  dbg('boot: start');
  // Clean up previous instance (HMR)
  if (window.__kefslot_app) {
    if (window.__kefslot_resize) window.removeEventListener('resize', window.__kefslot_resize);
    gsap.globalTimeline.clear();
    window.__kefslot_app.destroy(true, { children: true });
    window.__kefslot_app = undefined;
  }

  // Remove any leftover canvases
  document.querySelectorAll('canvas').forEach((c) => c.remove());

  const app = new Application();
  window.__kefslot_app = app;

  dbg('boot: app.init...');
  await app.init({
    width: GameConfig.width,
    height: GameConfig.height,
    backgroundColor: GameConfig.backgroundColor,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    resizeTo: window,
  });
  dbg('boot: app.init done');

  // Add canvas to DOM
  document.body.appendChild(app.canvas);

  // Detect touch device once
  GameConfig.isTouch = 'ontouchstart' in window;

  let game: Game | null = null;

  // Scale stage to fit window, with portrait/landscape detection
  const resize = () => {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const isPortrait = windowH > windowW * 1.2;

    // Update active dimensions
    GameConfig.isPortrait = isPortrait;
    if (isPortrait) {
      GameConfig.activeWidth = GameConfig.portraitWidth;
      GameConfig.activeHeight = GameConfig.portraitHeight;
      GameConfig.cellSize = GameConfig.cellSizePortrait;
    } else {
      GameConfig.activeWidth = GameConfig.width;
      GameConfig.activeHeight = GameConfig.height;
      GameConfig.cellSize = GameConfig.cellSizeLandscape;
    }

    const activeW = GameConfig.activeWidth;
    const activeH = GameConfig.activeHeight;
    const scale = Math.min(windowW / activeW, windowH / activeH);

    app.stage.scale.set(scale);
    app.stage.x = (windowW - activeW * scale) / 2;
    app.stage.y = (windowH - activeH * scale) / 2;

    app.stage.hitArea = new Rectangle(0, 0, activeW, activeH);

    // Notify game of layout change
    game?.relayout(isPortrait);
  };

  window.__kefslot_resize = resize;
  window.addEventListener('resize', resize);

  // Ensure interactivity on stage (hitArea is set in resize())
  app.stage.eventMode = 'static';

  // Wait for custom fonts to load before rendering any text
  dbg('boot: fonts.ready...');
  await document.fonts.ready;
  dbg('boot: fonts done');

  // Start game — await init so scenes are built before first resize
  dbg('boot: Game.init...');
  const _g = new Game(app);
  await _g.init();
  game = _g;
  dbg('boot: Game.init done');

  // Remove loading indicator
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'none';

  // Initial resize after game scenes are ready
  resize();
}

boot().catch((err) => {
  console.error(err);
  const d = document.getElementById('err-overlay');
  if (d) {
    d.style.display = 'block';
    d.textContent = 'BOOT ERROR:\n\n' + (err?.message || '') + '\n\n' + (err?.stack || String(err));
  }
});

// HMR support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    boot().catch(console.error);
  });
}
