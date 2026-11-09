// Speaking statistics computed locally from a transcript and the spoken duration. No AI and
// no network: simple counts the speaker can check against their own transcript.

/** Filler words and phrases counted as whole words, case-insensitive. */
export const FILLERS = ["um", "uh", "erm", "like", "you know", "basically", "actually", "literally", "sort of", "kind of"];

const FILLER_RE = new RegExp(
  `\\b(${FILLERS.map((f) => f.replace(/\s+/g, "\\s+")).join("|")})\\b`,
  "gi",
);

export function wordCount(transcript: string): number {
  const words = transcript.trim().match(/[\p{L}\p{N}'’-]+/gu);
  return words ? words.length : 0;
}

/** Words per minute, or null when there isn't enough to measure (no words or under 10 s). */
export function wordsPerMinute(transcript: string, seconds: number): number | null {
  const words = wordCount(transcript);
  if (words === 0 || seconds < 10) return null;
  return Math.round(words / (seconds / 60));
}

export function fillerCount(transcript: string): number {
  return transcript.match(FILLER_RE)?.length ?? 0;
}

export type SpeakingStats = { words: number; wpm: number | null; fillers: number };

export function speakingStats(transcript: string, seconds: number): SpeakingStats {
  return {
    words: wordCount(transcript),
    wpm: wordsPerMinute(transcript, seconds),
    fillers: fillerCount(transcript),
  };
}

/** Average WPM across sessions that have a measurable pace. */
export function averageWpm(sessions: { transcript: string; seconds: number }[]): number | null {
  const paces = sessions
    .map((s) => wordsPerMinute(s.transcript, s.seconds))
    .filter((n): n is number => n !== null);
  if (paces.length === 0) return null;
  return Math.round(paces.reduce((a, b) => a + b, 0) / paces.length);
}
