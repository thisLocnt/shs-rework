export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface DeviceMotionData {
  acceleration: Vec3 | null;
  accelerationIncludingGravity: Vec3 | null;
  rotation: { alpha: number; beta: number; gamma: number } | null;
  rotationRate: { alpha: number; beta: number; gamma: number } | null;
  interval: number;
}

export interface SensorSample {
  timestamp: number;
  rawAccel: Vec3;
  groundAccel: Vec3;
  filteredAccelMag: number;
  heading: number;
}

export interface StepEvent {
  index: number;
  timestamp: number;
  heading: number;
  stepLength: number;
  variance: number;
  x: number;
  y: number;
}

export interface CalibrationState {
  k: number;
  isCalibrated: boolean;
  distanceMeters: number;
  stepCount: number;
}

export interface TrajectoryPoint {
  step: number;
  x: number;
  y: number;
}
