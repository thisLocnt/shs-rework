const WINDOW = 5;

/**
 * Applies a moving average filter over the last WINDOW samples.
 * Returns only the latest filtered value (avoids storing full filtered array).
 */
export function movingAverage(buffer: number[]): number {
  const len = buffer.length;
  if (len === 0) return 0;
  const start = Math.max(0, len - WINDOW);
  const slice = buffer.slice(start);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Computes variance over the last WINDOW samples of the buffer.
 */
export function localVariance(buffer: number[]): number {
  const len = buffer.length;
  if (len < 2) return 0;
  const start = Math.max(0, len - WINDOW);
  const slice = buffer.slice(start);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const sqDiff = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  return sqDiff / slice.length;
}
