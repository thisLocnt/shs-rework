/**
 * Complementary filter fusing gyroscope yaw + magnetometer heading.
 *
 * Gyro is responsive but drifts; magnetometer is stable but noisy + affected
 * by indoor magnetic disturbances. Weighted fusion gives a stable heading.
 *
 *   fused = alpha * (prev + gyroDeltaYaw) + (1 - alpha) * magnetometerHeading
 *
 * alpha typically 0.95-0.98 — trust gyro short-term, magnetometer long-term.
 */

const ALPHA = 0.96;

export class HeadingFusion {
  private fused: number = 0;
  private initialized = false;

  reset() {
    this.fused = 0;
    this.initialized = false;
  }

  update(gyroYawRad: number, magnetometerHeadingRad: number | null): number {
    if (!this.initialized) {
      this.fused = magnetometerHeadingRad ?? gyroYawRad;
      this.initialized = true;
      return this.fused;
    }

    if (magnetometerHeadingRad === null) {
      this.fused = gyroYawRad;
      return this.fused;
    }

    // Unwrap angle difference to avoid jumps at ±π
    let diff = magnetometerHeadingRad - this.fused;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    this.fused = ALPHA * gyroYawRad + (1 - ALPHA) * (this.fused + diff);
    return this.fused;
  }
}

/**
 * Compute heading (yaw) from magnetometer x/y in horizontal plane.
 * Returns radians, 0 = North.
 */
export function magnetometerHeading(mx: number, my: number): number {
  return Math.atan2(-mx, my);
}
