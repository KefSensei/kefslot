export type GameState =
  | 'MENU'
  | 'LEVEL_SELECT'
  | 'IDLE'
  | 'SPINNING'
  | 'CASCADE_RESOLVE'
  | 'MATCH3_PHASE'
  | 'SCORING'
  | 'LEVEL_CHECK';

const validTransitions: Record<GameState, GameState[]> = {
  MENU:            ['LEVEL_SELECT'],
  LEVEL_SELECT:    ['IDLE', 'MENU'],
  IDLE:            ['SPINNING', 'LEVEL_SELECT'],
  SPINNING:        ['CASCADE_RESOLVE'],
  CASCADE_RESOLVE: ['MATCH3_PHASE'],
  MATCH3_PHASE:    ['SCORING', 'SPINNING'],
  SCORING:         ['LEVEL_CHECK'],
  LEVEL_CHECK:     ['IDLE', 'LEVEL_SELECT'],
};

type StateChangeCallback = (from: GameState, to: GameState) => void;

export class StateMachine {
  private _state: GameState = 'MENU';
  private callbacks: StateChangeCallback[] = [];

  get state(): GameState {
    return this._state;
  }

  onChange(cb: StateChangeCallback): void {
    this.callbacks.push(cb);
  }

  transition(to: GameState): boolean {
    const allowed = validTransitions[this._state];
    if (!allowed.includes(to)) {
      console.warn(`Invalid transition: ${this._state} → ${to}`);
      return false;
    }
    const from = this._state;
    this._state = to;
    this.callbacks.forEach(cb => cb(from, to));
    return true;
  }
}
