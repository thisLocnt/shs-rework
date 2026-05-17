/**
 * Peak detection + step length estimation.
 * Ported from detect.js with memory-safe circular buffer + typed output.
 */

const K = 10; // look-back window for local max check

export interface PeakCandidate {
  index: number;
  magnitude: number;
  variance: number;
  heading: number;
  stepLength: number;
}

/**
 * Detects if the latest sample is a valid step peak.
 * Returns a PeakCandidate if detected, null otherwise.
 */
export function detectPeak(
  filteredBuffer: number[],
  heading: number,
  variance: number,
  calibrationK: number,
  stepFreq: number,
): PeakCandidate | null {
  const len = filteredBuffer.length;
  if (len < K + 1) return null;

  const current = filteredBuffer[len - 1];
  const window = filteredBuffer.slice(len - K - 1, len - 1);

  const windowMin = Math.min(...window);
  const windowMax = Math.max(...window);

  // Must be local maximum
  if (current <= windowMax) return null;

  // Absolute magnitude threshold
  if (current < 0.075) return null;

  // Dynamic threshold: must exceed midpoint of recent range
  const dynamicThreshold = (windowMin + windowMax) / 2 + 0.05;
  if (current <= dynamicThreshold) return null;

  const sl = estimateStepLength(variance, stepFreq, calibrationK);
  if (sl <= 0 || sl > 2.5) return null; // sanity bound (meters)

  return {
    index: len - 1,
    magnitude: current,
    variance,
    heading,
    stepLength: sl,
  };
}

/**
 * Polynomial model: a(f)*sl² + b(f)*sl + c(f) = variance
 * Coefficients empirically fitted in original research.
 */
function estimateStepLength(variance: number, f: number, k: number): number {
  const a = 0.0000545 * f * f - 0.00501 * f + 0.15495;
  const b = -0.0000461 * f * f + 0.00404 * f - 0.13;
  const c = 0.0000102 * f * f - 0.000913 * f + 0.0336;

  const discriminant = b * b - 4 * a * (c - variance);
  if (discriminant < 0) return 0;

  const sl = (-b + Math.sqrt(discriminant)) / (2 * a);
  return k * sl;
}
