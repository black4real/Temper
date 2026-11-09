// Speaking progression system — ported from the macOS app's SpeakingSystem.
// Stage advances after 5 successful sessions at the current stage (max stage 4). Prompts are
// deterministic per day so they don't shift between loads.

export const TOPIC_LIBRARY: string[] = [
  "Discipline", "Failure", "Friendship", "Technology", "Creativity",
  "Fear", "Leadership", "Learning", "Money", "Health",
  "Confidence", "Communication", "Loneliness", "Purpose", "Happiness",
  "Responsibility", "Social Media", "AI", "Risk", "Freedom",
  "Patience", "Ambition", "Honesty", "Solitude", "Perseverance",
  "Humility", "Curiosity", "Authenticity", "Time Management", "Vulnerability",
  "Adaptability", "Gratitude", "Regret", "Focus", "Legacy",
  "Identity", "Intuition", "Self-Reliance", "Mastery", "Perspective",
];

export const STANDARD_CURVEBALLS: string[] = [
  "Pen", "Potato Chips", "Umbrella", "Coffee Mug", "Bicycle",
  "Shoe", "Mirror", "Backpack", "Train", "Door",
  "Candle", "Tree", "Clock", "Toothbrush", "Pizza",
  "Phone", "Book", "Water Bottle", "Keyboard", "Chair",
  "Flashlight", "Sunglasses", "Envelope", "Key", "Coin",
  "Window", "Headphones", "Fork", "Notebook", "Blanket",
  "Scissors", "Brick", "Matches", "Stairs", "Pencil Sharpener",
  "Teapot", "Compass", "Hammer", "Chess Pawn", "Bridge",
];

export const ADVANCED_CURVEBALLS: string[] = [
  "Hourglass", "Labyrinth", "Kaleidoscope", "Telescope", "Metronome",
  "Prism", "Echo", "Anchor", "Blueprint", "Fossil",
  "Thermostat", "Microscope", "Lighthouse", "Sundial", "Magnet",
  "Sponge", "Pendulum", "Circuit Board", "Padlock", "Seed",
  "Lightning Rod", "Crossroads", "Shadow", "Scale", "Lens",
];

const STAGE_TARGETS: Record<number, number> = { 1: 300, 2: 360, 3: 420, 4: 480 };

export type StageInput = { dayNumber: number; stage: number; completedTarget: boolean };

export function targetSeconds(stage: number): number {
  return STAGE_TARGETS[stage] ?? 300;
}

export function stageTitle(stage: number): string {
  switch (stage) {
    case 1: return "Stage 1 · Foundation";
    case 2: return "Stage 2 · Connection";
    case 3: return "Stage 3 · Improvisation";
    case 4: return "Stage 4 · Communication";
    default: return "Stage 1 · Foundation";
  }
}

export function stagePurpose(stage: number): string {
  switch (stage) {
    case 1: return "Speak continuously.";
    case 2: return "Topic + Curveball";
    case 3: return "Topic + Curveball";
    case 4: return "Topic + 2 Curveballs";
    default: return "Speak continuously.";
  }
}

/** Current stage (1..4) derived from successful session history. */
export function currentStage(sessions: StageInput[]): number {
  let stage = 1;
  let successes = 0;
  for (const s of [...sessions].sort((a, b) => a.dayNumber - b.dayNumber)) {
    if (!s.completedTarget) continue;
    if (s.stage === stage) {
      successes += 1;
      if (successes >= 5 && stage < 4) {
        stage += 1;
        successes = 0;
      }
    }
  }
  return stage;
}

/** Successful sessions completed at the current stage (0..4). */
export function successesAtCurrentStage(sessions: StageInput[]): number {
  const target = currentStage(sessions);
  let runningStage = 1;
  let runningCount = 0;
  for (const s of [...sessions].sort((a, b) => a.dayNumber - b.dayNumber)) {
    if (!s.completedTarget) continue;
    if (s.stage === runningStage) {
      runningCount += 1;
      if (runningCount >= 5 && runningStage < 4) {
        runningStage += 1;
        runningCount = 0;
      }
    }
  }
  return runningStage === target ? runningCount : 0;
}

/** Deterministic curveballs for a stage + day. */
export function curveballsFor(stage: number, dayNumber: number): string[] {
  const day = Math.max(1, Math.min(120, dayNumber));
  switch (stage) {
    case 1:
      return [];
    case 2:
      return [STANDARD_CURVEBALLS[(day * 7) % STANDARD_CURVEBALLS.length]];
    case 3:
      return [
        STANDARD_CURVEBALLS[(day * 7) % STANDARD_CURVEBALLS.length],
        ADVANCED_CURVEBALLS[(day * 11) % ADVANCED_CURVEBALLS.length],
      ];
    case 4:
      return [
        STANDARD_CURVEBALLS[(day * 5) % STANDARD_CURVEBALLS.length],
        ADVANCED_CURVEBALLS[(day * 13) % ADVANCED_CURVEBALLS.length],
      ];
    default:
      return [];
  }
}

/** Randomised curveballs for the "shuffle" action. */
export function randomCurveballs(stage: number): string[] {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  switch (stage) {
    case 1: return [];
    case 2: return [pick(STANDARD_CURVEBALLS)];
    case 3:
    case 4: return [pick(STANDARD_CURVEBALLS), pick(ADVANCED_CURVEBALLS)];
    default: return [];
  }
}

export type SpeakingPrompt = {
  dayNumber: number;
  stage: number;
  stageTitle: string;
  stagePurpose: string;
  topic: string;
  curveballs: string[];
  targetDurationSeconds: number;
};

export function promptFor(stage: number, dayNumber: number): SpeakingPrompt {
  const day = Math.max(1, Math.min(120, dayNumber));
  return {
    dayNumber: day,
    stage,
    stageTitle: stageTitle(stage),
    stagePurpose: stagePurpose(stage),
    topic: TOPIC_LIBRARY[(day - 1) % TOPIC_LIBRARY.length],
    curveballs: curveballsFor(stage, day),
    targetDurationSeconds: targetSeconds(stage),
  };
}

export function randomTopic(exclude?: string): string {
  const candidates = exclude ? TOPIC_LIBRARY.filter((t) => t !== exclude) : TOPIC_LIBRARY;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? "Discipline";
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
