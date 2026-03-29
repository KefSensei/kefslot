/**
 * DevConsole — only active in import.meta.env.DEV builds.
 *
 * Features:
 *  - Toggle with  `  (backtick)
 *  - Live game-state readout (refreshed on each toggle / cheat)
 *  - Keyboard cheats (Shift+W win, Shift+L lose, Shift+U unlock-all, Shift+S +1 spin)
 *  - "Report Bug" button → opens a pre-filled GitHub issue in a new tab
 *  - Captures the last 10 JS errors for inclusion in bug reports
 */

const REPO = 'KefSensei/kefslot';

export interface DevState {
  level: number;
  levelName: string;
  fsmState: string;
  score: number;
  spinsRemaining: number;
  movesRemaining: number;
  powerUps: number;
  grid: string; // compact symbol-initial grid string
}

export interface DevCallbacks {
  getState: () => DevState;
  winLevel: () => void;
  loseLevel: () => void;
  unlockAll: () => void;
  addSpin: () => void;
  jumpToLevel: (n: number) => void;
}

export class DevConsole {
  private el!: HTMLDivElement;
  private visible = false;
  private errors: { time: string; msg: string }[] = [];
  private callbacks: DevCallbacks;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(callbacks: DevCallbacks) {
    this.callbacks = callbacks;
    this.buildDOM();
    this.captureErrors();
    this.keyHandler = this.handleKey.bind(this);
    window.addEventListener('keydown', this.keyHandler);
    // Show a small indicator so devs know the panel exists
    this.showBadge();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.el?.remove();
    document.getElementById('dev-badge')?.remove();
  }

  // Call from Game whenever state changes meaningfully (spin, swap, etc.)
  refresh(): void {
    if (!this.visible) return;
    this.updateStatePanel();
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private buildDOM(): void {
    this.el = document.createElement('div');
    this.el.id = 'dev-console';
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '8px',
      right: '8px',
      width: '320px',
      background: 'rgba(10,10,20,0.93)',
      color: '#e0e0e0',
      fontFamily: 'monospace',
      fontSize: '12px',
      borderRadius: '8px',
      border: '1px solid #444',
      boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
      zIndex: '99999',
      display: 'none',
      userSelect: 'text',
      overflow: 'hidden',
    });

    this.el.innerHTML = `
      <div id="dv-header" style="
        background:#1a1a2e;padding:8px 10px;display:flex;
        justify-content:space-between;align-items:center;
        border-bottom:1px solid #333;cursor:move">
        <span style="color:#f5d060;font-weight:bold">🔧 Dev Console</span>
        <span style="color:#888;font-size:10px">[ \` ] to toggle</span>
        <button id="dv-close" style="${btnStyle('#333','#aaa')}">✕</button>
      </div>

      <div style="padding:8px 10px;border-bottom:1px solid #222">
        <div id="dv-state" style="line-height:1.7;color:#b0c4de"></div>
      </div>

      <div style="padding:8px 10px;border-bottom:1px solid #222">
        <div style="color:#888;font-size:10px;margin-bottom:5px;text-transform:uppercase;letter-spacing:1px">Cheats</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${cheatBtn('dv-win',  '🏆 Win',      'Shift+W')}
          ${cheatBtn('dv-lose', '💀 Lose',     'Shift+L')}
          ${cheatBtn('dv-spin', '+1 Spin',     'Shift+S')}
          ${cheatBtn('dv-unlock','🔓 Unlock All','Shift+U')}
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px">
          <label style="color:#888;white-space:nowrap">Jump to level:</label>
          <input id="dv-lvl-input" type="number" min="1" max="20" value="1"
            style="width:48px;background:#111;color:#e0e0e0;border:1px solid #444;
                   border-radius:4px;padding:2px 4px;font-family:monospace"/>
          <button id="dv-jump" style="${btnStyle('#1a3a2e','#6fcf97')}">Go</button>
        </div>
      </div>

      <div style="padding:8px 10px;border-bottom:1px solid #222">
        <div style="color:#888;font-size:10px;margin-bottom:5px;text-transform:uppercase;letter-spacing:1px">Recent Errors (last 10)</div>
        <div id="dv-errors" style="max-height:80px;overflow-y:auto;color:#ff8080;font-size:10px;line-height:1.5"></div>
      </div>

      <div style="padding:8px 10px">
        <button id="dv-report" style="${btnStyle('#2a0a0a','#ff8080')};width:100%;padding:7px 0;font-size:12px">
          🐛 Report Bug (opens GitHub)
        </button>
      </div>
    `;

    document.body.appendChild(this.el);
    this.bindButtons();
    this.makeDraggable();
  }

  private bindButtons(): void {
    this.el.querySelector('#dv-close')!.addEventListener('click', () => this.hide());

    this.el.querySelector('#dv-win')!.addEventListener('click', () => {
      this.callbacks.winLevel();
      this.refresh();
    });
    this.el.querySelector('#dv-lose')!.addEventListener('click', () => {
      this.callbacks.loseLevel();
      this.refresh();
    });
    this.el.querySelector('#dv-spin')!.addEventListener('click', () => {
      this.callbacks.addSpin();
      this.refresh();
    });
    this.el.querySelector('#dv-unlock')!.addEventListener('click', () => {
      this.callbacks.unlockAll();
      this.refresh();
    });
    this.el.querySelector('#dv-jump')!.addEventListener('click', () => {
      const input = this.el.querySelector('#dv-lvl-input') as HTMLInputElement;
      const n = parseInt(input.value, 10);
      if (n >= 1 && n <= 20) {
        this.callbacks.jumpToLevel(n);
        this.refresh();
      }
    });
    this.el.querySelector('#dv-report')!.addEventListener('click', () => this.openBugReport());

    // Stop pointer events from leaking to the game canvas
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.el.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  private handleKey(e: KeyboardEvent): void {
    // Backtick toggles panel
    if (e.key === '`') {
      e.preventDefault();
      this.toggle();
      return;
    }
    // Shift+letter cheats — only fire when not typing in an input
    if (!e.shiftKey) return;
    const tag = (document.activeElement?.tagName ?? '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    switch (e.key.toUpperCase()) {
      case 'W': e.preventDefault(); this.callbacks.winLevel();   this.refresh(); break;
      case 'L': e.preventDefault(); this.callbacks.loseLevel();  this.refresh(); break;
      case 'S': e.preventDefault(); this.callbacks.addSpin();    this.refresh(); break;
      case 'U': e.preventDefault(); this.callbacks.unlockAll();  this.refresh(); break;
    }
  }

  private toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  private show(): void {
    this.visible = true;
    this.el.style.display = 'block';
    this.updateStatePanel();
    this.updateErrorPanel();
  }

  private hide(): void {
    this.visible = false;
    this.el.style.display = 'none';
  }

  private updateStatePanel(): void {
    const s = this.callbacks.getState();
    const stateEl = this.el.querySelector('#dv-state')!;
    stateEl.innerHTML = `
      <div><span style="color:#888">Level:</span>  <b style="color:#f5d060">${s.level}</b> — ${esc(s.levelName)}</div>
      <div><span style="color:#888">FSM:</span>    <b style="color:#6fcf97">${esc(s.fsmState)}</b></div>
      <div><span style="color:#888">Score:</span>  ${s.score.toLocaleString()}</div>
      <div><span style="color:#888">Spins:</span>  ${s.spinsRemaining} &nbsp; <span style="color:#888">Moves:</span> ${s.movesRemaining} &nbsp; <span style="color:#888">⚡:</span> ${s.powerUps}</div>
      <div style="margin-top:4px;color:#888;font-size:10px">Grid (R=ruby E=emerald S=sapphire A=amethyst T=topaz P=potion W=wild SC=scatter M=mult X=blocker):</div>
      <div style="font-size:10px;letter-spacing:1px;color:#b0e0e6;margin-top:2px">${esc(s.grid)}</div>
    `;
  }

  private updateErrorPanel(): void {
    const errEl = this.el.querySelector('#dv-errors')!;
    if (this.errors.length === 0) {
      errEl.textContent = 'No errors ✓';
      (errEl as HTMLElement).style.color = '#6fcf97';
    } else {
      (errEl as HTMLElement).style.color = '#ff8080';
      errEl.innerHTML = this.errors
        .map((e) => `<div>[${esc(e.time)}] ${esc(e.msg)}</div>`)
        .join('');
    }
  }

  private openBugReport(): void {
    const s = this.callbacks.getState();
    const now = new Date().toISOString();

    const title = `BUG [L${s.level}/${esc(s.levelName)}]: <describe issue here>`;

    const errLines =
      this.errors.length > 0
        ? this.errors.map((e) => `- [${e.time}] ${e.msg}`).join('\n')
        : '_None_';

    const body = [
      '## Bug Report',
      '',
      '**Describe the issue:**',
      '<!-- What happened? What did you expect? Steps to reproduce? -->',
      '',
      '## Captured State',
      `| Field | Value |`,
      `|---|---|`,
      `| Level | ${s.level} — ${s.levelName} |`,
      `| FSM State | \`${s.fsmState}\` |`,
      `| Score | ${s.score} |`,
      `| Spins Remaining | ${s.spinsRemaining} |`,
      `| Moves Remaining | ${s.movesRemaining} |`,
      `| Power-ups on Board | ${s.powerUps} |`,
      `| Captured At | ${now} |`,
      '',
      '## Grid Snapshot',
      '```',
      s.grid,
      '```',
      '',
      '## Recent Console Errors',
      errLines,
    ].join('\n');

    const url =
      `https://github.com/${REPO}/issues/new` +
      `?title=${encodeURIComponent(title)}` +
      `&body=${encodeURIComponent(body.slice(0, 3000))}`; // GitHub URL length cap

    window.open(url, '_blank');
  }

  private captureErrors(): void {
    const push = (msg: string) => {
      const time = new Date().toTimeString().slice(0, 8);
      this.errors.push({ time, msg: msg.slice(0, 200) });
      if (this.errors.length > 10) this.errors.shift();
      if (this.visible) this.updateErrorPanel();
    };

    window.addEventListener('error', (e) => push(e.message || String(e)));
    window.addEventListener('unhandledrejection', (e) => push(String(e.reason)));

    const origError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      push(args.map(String).join(' '));
      origError(...args);
    };
  }

  private showBadge(): void {
    const badge = document.createElement('div');
    badge.id = 'dev-badge';
    Object.assign(badge.style, {
      position: 'fixed',
      bottom: '8px',
      right: '8px',
      background: 'rgba(245,208,96,0.15)',
      border: '1px solid rgba(245,208,96,0.4)',
      color: '#f5d060',
      fontFamily: 'monospace',
      fontSize: '10px',
      padding: '3px 7px',
      borderRadius: '4px',
      zIndex: '99998',
      cursor: 'pointer',
      userSelect: 'none',
    });
    badge.textContent = '🔧 DEV  [ ` ]';
    badge.addEventListener('click', () => this.toggle());
    document.body.appendChild(badge);
  }

  private makeDraggable(): void {
    const header = this.el.querySelector('#dv-header') as HTMLElement;
    let ox = 0, oy = 0, startX = 0, startY = 0;
    let dragging = false;

    header.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = this.el.getBoundingClientRect();
      ox = rect.left; oy = rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      Object.assign(this.el.style, { left: ox + dx + 'px', top: oy + dy + 'px', right: 'auto' });
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function esc(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function btnStyle(bg: string, color: string): string {
  return `background:${bg};color:${color};border:1px solid ${color}33;
          border-radius:4px;padding:4px 8px;cursor:pointer;font-family:monospace;font-size:11px`;
}

function cheatBtn(id: string, label: string, shortcut: string): string {
  return `<button id="${id}" style="${btnStyle('#1a1a2e','#b0c4de')}" title="${shortcut}">
    ${label} <span style="color:#555;font-size:9px">${shortcut}</span>
  </button>`;
}
