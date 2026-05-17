import { Vec3 } from '@/types/sensors';

/**
 * Transforms device-frame acceleration to ground frame using pitch/roll.
 * Ported from the original rotationMatrix.js — same math, now typed.
 */
export function toGroundFrame(accel: Vec3, beta: number, gamma: number): Vec3 {
  const b = (beta * Math.PI) / 180;
  const g = (gamma * Math.PI) / 180;

  const cosBeta = Math.cos(b);
  const sinBeta = Math.sin(b);
  const cosGamma = Math.cos(g);
  const sinGamma = Math.sin(g);

  // R = R_roll(gamma) × R_pitch(beta)
  const x =
    accel.x * cosGamma +
    accel.y * sinBeta * sinGamma +
    accel.z * cosBeta * sinGamma;
  const y = accel.y * cosBeta - accel.z * sinBeta;
  const z =
    -accel.x * sinGamma +
    accel.y * sinBeta * cosGamma +
    accel.z * cosBeta * cosGamma;

  return { x, y, z };
}

export function magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
