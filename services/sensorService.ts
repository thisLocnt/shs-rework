import { DeviceMotion, DeviceMotionMeasurement, Magnetometer, MagnetometerMeasurement } from 'expo-sensors';
import { toGroundFrame, magnitude } from '@/algorithms/rotationMatrix';
import { movingAverage, localVariance } from '@/algorithms/movingAverage';
import { detectPeak } from '@/algorithms/stepDetection';
import { detectPhonePose } from '@/algorithms/phonePoseDetector';
import { classifyActivity, computeCadence } from '@/algorithms/activityClassifier';
import { HeadingFusion, magnetometerHeading } from '@/algorithms/headingFusion';
import { SensorSample, StepEvent, Vec3 } from '@/types/sensors';
import { ActivityType, PhonePose } from '@/types/session';

const SAMPLE_INTERVAL_MS = 20;
const BUFFER_MAX = 300;
const GRAVITY_BUFFER_MAX = 50;

export type SensorCallback = (sample: SensorSample) => void;
export type StepCallback = (step: StepEvent) => void;
export type ActivityCallback = (activity: ActivityType, pose: PhonePose, cadence: number) => void;

export class SensorService {
  private motionSub: ReturnType<typeof DeviceMotion.addListener> | null = null;
  private magSub: ReturnType<typeof Magnetometer.addListener> | null = null;

  private accelBuffer: number[] = [];
  private gravityBuffer: Vec3[] = [];
  private stepTimestamps: number[] = [];
  private stepHeadings: number[] = [];

  private stepCount = 0;
  private posX = 0;
  private posY = 0;
  private lastStepTs = 0;
  private calibrationK = 1.0;
  private magHeading: number | null = null;
  private fusion = new HeadingFusion();

  private onSample: SensorCallback | null = null;
  private onStep: StepCallback | null = null;
  private onActivity: ActivityCallback | null = null;
  private activityCheckCounter = 0;

  setCalibration(k: number) {
    this.calibrationK = k;
  }

  async requestPermissions(): Promise<boolean> {
    const motion = await DeviceMotion.requestPermissionsAsync();
    return motion.granted;
  }

  async start(onSample: SensorCallback, onStep: StepCallback, onActivity: ActivityCallback) {
    this.onSample = onSample;
    this.onStep = onStep;
    this.onActivity = onActivity;
    this.reset();

    DeviceMotion.setUpdateInterval(SAMPLE_INTERVAL_MS);
    this.motionSub = DeviceMotion.addListener(this.handleMotion);

    if (await Magnetometer.isAvailableAsync()) {
      Magnetometer.setUpdateInterval(SAMPLE_INTERVAL_MS * 2);
      this.magSub = Magnetometer.addListener(this.handleMag);
    }
  }

  stop() {
    this.motionSub?.remove();
    this.magSub?.remove();
    this.motionSub = null;
    this.magSub = null;
  }

  reset() {
    this.accelBuffer = [];
    this.gravityBuffer = [];
    this.stepTimestamps = [];
    this.stepHeadings = [];
    this.stepCount = 0;
    this.posX = 0;
    this.posY = 0;
    this.lastStepTs = 0;
    this.magHeading = null;
    this.fusion.reset();
    this.activityCheckCounter = 0;
  }

  private handleMag = (data: MagnetometerMeasurement) => {
    this.magHeading = magnetometerHeading(data.x, data.y);
  };

  private handleMotion = (data: DeviceMotionMeasurement) => {
    const { acceleration, accelerationIncludingGravity, rotation } = data;
    if (!acceleration || !rotation) return;

    const beta = rotation.beta ?? 0;
    const gamma = rotation.gamma ?? 0;
    const gyroYaw = ((rotation.alpha ?? 0) * Math.PI) / 180;

    // Heading fusion: gyro + magnetometer
    const heading = this.fusion.update(gyroYaw, this.magHeading);

    const groundAccel = toGroundFrame(acceleration, beta, gamma);
    const mag = magnitude(groundAccel);

    // Bounded circular buffer
    this.accelBuffer.push(mag);
    if (this.accelBuffer.length > BUFFER_MAX) this.accelBuffer.shift();

    if (accelerationIncludingGravity) {
      this.gravityBuffer.push(accelerationIncludingGravity);
      if (this.gravityBuffer.length > GRAVITY_BUFFER_MAX) this.gravityBuffer.shift();
    }

    const filtered = movingAverage(this.accelBuffer);
    const variance = localVariance(this.accelBuffer);

    const now = Date.now();
    const stepFreq = this.lastStepTs > 0 ? 1000 / (now - this.lastStepTs) : 1.5;

    const peak = detectPeak(
      this.accelBuffer,
      heading,
      variance,
      this.calibrationK,
      stepFreq,
    );

    const sample: SensorSample = {
      timestamp: now,
      rawAccel: acceleration,
      groundAccel,
      filteredAccelMag: filtered,
      heading,
    };
    this.onSample?.(sample);

    if (peak) {
      this.stepCount++;
      this.posX += peak.stepLength * Math.cos(heading);
      this.posY += peak.stepLength * Math.sin(heading);
      this.lastStepTs = now;
      this.stepTimestamps.push(now);
      this.stepHeadings.push(heading);
      if (this.stepTimestamps.length > 20) this.stepTimestamps.shift();
      if (this.stepHeadings.length > 20) this.stepHeadings.shift();

      this.onStep?.({
        index: this.stepCount,
        timestamp: now,
        heading,
        stepLength: peak.stepLength,
        variance: peak.variance,
        x: this.posX,
        y: this.posY,
      });
    }

    // Activity + pose classification at ~5Hz (every 10 samples)
    this.activityCheckCounter++;
    if (this.activityCheckCounter >= 10) {
      this.activityCheckCounter = 0;
      const activity = classifyActivity({
        lastStepTs: this.lastStepTs,
        recentStepTimestamps: this.stepTimestamps,
        recentHeadings: this.stepHeadings,
        now,
      });
      const pose = detectPhonePose({
        gravitySamples: this.gravityBuffer,
        accelMagVariance: variance,
      });
      const cadence = computeCadence(this.stepTimestamps);
      this.onActivity?.(activity, pose, cadence);
    }
  };
}

export const sensorService = new SensorService();
