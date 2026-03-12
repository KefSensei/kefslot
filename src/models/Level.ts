export type GoalType = 'score' | 'collect' | 'clear_blockers' | 'cascades' | 'power_ups';

export interface LevelGoal {
  type: GoalType;
  target: number;
  symbolId?: string; // for 'collect' type
  current: number;
}

export interface LevelDef {
  id: number;
  world: number;
  name: string;
  spins: number;        // total spins allowed
  movesPerSpin: number; // match-3 moves per spin
  goals: Omit<LevelGoal, 'current'>[];
  availableSymbolIds: string[];
  hasBlockers: boolean;
  starThresholds: [number, number, number]; // score thresholds for 1/2/3 stars
}
