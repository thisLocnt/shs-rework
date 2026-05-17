import { Vec3 } from '@/types/sensors';
import { PhonePose } from '@/types/session';

/**
 * Detects phone position from gravity vector + accel magnitude variance.
 *
 * - HAND held flat / vertical: gravity mostly on Z (or Y), low pitch/roll variance
 * - POCKET: gravity tilted ~60-90°, mid variance
 * - SWINGING: high variance on horizontal axes (arm motion)
 * - UNKNOWN: insufficient data
 *
 * Uses last N gravity samples + accel magnitude variance.
 */

const PI_2 = Math.PI / 2;

export interface PoseInput {
  gravitySamples: Vec3[]; // last N gravity readings
  accelMagVariance: number; // recent variance in |accel|
}

export function detectPhonePose({ gravitySamples, accelMagVariance }: PoseInput): PhonePose {
  if (gravitySamples.length < 10) return 'unknown';

  const recent = gravitySamples.slice(-20);
  const avg = recent.reduce(
    (acc, g) => ({ x: acc.x + g.x, y: acc.y + g.y, z: acc.z + g.z }),
    { x: 0, y: 0, z: 0 },
  );
  avg.x /= recent.length;
  avg.y /= recent.length;
  avg.z /= recent.length;

  const gMag = Math.sqrt(avg.x ** 2 + avg.y ** 2 + avg.z ** 2);
  if (gMag < 0.1) return 'unknown';

  // Pitch angle from gravity Z (how tilted forward/back)
  const pitchAbs = Math.abs(Math.atan2(avg.y, avg.z));
  // Roll angle from gravity X
  const rollAbs = Math.abs(Math.atan2(avg.x, avg.z));

  // Swinging: high variance in accel magnitude due to arm motion
  if (accelMagVariance > 5) return 'swinging';

  // Pocket: phone tilted significantly (typical 50–90°), moderate variance
  if (pitchAbs > (50 * Math.PI) / 180 || rollAbs > (50 * Math.PI) / 180) {
    return 'pocket';
  }

  // Hand: relatively flat or vertical, low variance
  return 'hand';
}
