import { ActivityType } from '@/types/session';

/**
 * Classifies current activity based on cadence (steps/min) + recent step rate.
 * Thresholds based on biomechanics research:
 *   - Standing: 0 spm (no steps in last 2s)
 *   - Walking: 60–130 spm
 *   - Running: > 140 spm
 *   - Turning: heading delta > 30° within 1 step (handled separately)
 */

const STAND_TIMEOUT_MS = 2000;
const TURN_THRESHOLD_RAD = (30 * Math.PI) / 180;

export interface ClassificationInput {
  lastStepTs: number;
  recentStepTimestamps: number[]; // last N step timestamps
  recentHeadings: number[]; // last N step headings (radians)
  now: number;
}

export function classifyActivity(input: ClassificationInput): ActivityType {
  const { lastStepTs, recentStepTimestamps, recentHeadings, now } = input;

  if (lastStepTs === 0 || now - lastStepTs > STAND_TIMEOUT_MS) {
    return 'standing';
  }

  // Detect turning: heading variance across last 3 steps > threshold
  if (recentHeadings.length >= 3) {
    const headings = recentHeadings.slice(-3);
    const deltas = headings.slice(1).map((h, i) => normalizeAngle(h - headings[i]));
    const totalDelta = Math.abs(deltas.reduce((a, b) => a + b, 0));
    if (totalDelta > TURN_THRESHOLD_RAD) return 'turning';
  }

  const cadence = computeCadence(recentStepTimestamps);
  if (cadence > 140) return 'running';
  return 'walking';
}

/**
 * Cadence (steps per minute) from recent step timestamps.
 * Uses moving window of last 8 steps for stability.
 */
export function computeCadence(timestamps: number[]): number {
  if (timestamps.length < 2) return 0;
  const window = timestamps.slice(-8);
  const duration = window[window.length - 1] - window[0];
  if (duration <= 0) return 0;
  const stepsInWindow = window.length - 1;
  return (stepsInWindow / duration) * 60000;
}

function normalizeAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}
