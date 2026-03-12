import { Application } from 'pixi.js';
import { Game } from '@/core/Game';
import { GameConfig } from '@/config/GameConfig';
import gsap from 'gsap';

declare global {
  interface Window {
    __kefslot_app?: Application;
    __kefslot_resize?: () => void;
  }
}

async function boot() {
  // Clean up previous instance (HMR)
  if (window.__kefslot_app) {
    if (window.__kefslot_resize) window.removeEventListener('resize', window.__kefslot_resize);
    gsap.globalTimeline.clear();
    window.__kefslot_app.destroy(true, { children: true });
    window.__kefslot_app = undefined;
  }

  // Remove any leftover canvases
  document.querySelectorAll('canvas').forEach(c => c.remove());

  const app = new Application();
  window.__kefslot_app = app;

  await app.init({
    width: GameConfig.width,
    height: GameConfig.height,
    backgroundColor: GameConfig.backgroundColor,
    antialias: true,
    resizeTo: window,
  });

  // Remove loading indicator
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'none';

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
    } else {
      GameConfig.activeWidth = GameConfig.width;
      GameConfig.activeHeight = GameConfig.height;
    }

    const activeW = GameConfig.activeWidth;
    const activeH = GameConfig.activeHeight;
    const scale = Math.min(windowW / activeW, windowH / activeH);

    app.stage.scale.set(scale);
    app.stage.x = (windowW - activeW * scale) / 2;
    app.stage.y = (windowH - activeH * scale) / 2;

    // Notify game of layout change
    game?.relayout(isPortrait);
  };

  window.__kefslot_resize = resize;
  window.addEventListener('resize', resize);

  // Ensure interactivity on stage
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  // Start game
  game = new Game(app);

  // Initial resize after game is constructed
  resize();
}

boot().catch(console.error);

// HMR support
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    boot().catch(console.error);
  });
}
