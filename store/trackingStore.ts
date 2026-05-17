import { create } from 'zustand';
import { SensorSample, StepEvent, CalibrationState, TrajectoryPoint } from '@/types/sensors';
import { ActivityType, PhonePose } from '@/types/session';

const TRAJECTORY_MAX = 2000;
const CHART_BUFFER_MAX = 150;
const CADENCE_WINDOW = 8;

interface TrackingState {
  isTracking: boolean;
  sessionId: string | null;
  calibration: CalibrationState;

  steps: StepEvent[];
  trajectory: TrajectoryPoint[];
  chartBuffer: number[];
  latestSample: SensorSample | null;

  activity: ActivityType;
  phonePose: PhonePose;
  cadenceSpm: number;

  setTracking: (v: boolean, sessionId?: string | null) => void;
  setCalibration: (c: Partial<CalibrationState>) => void;
  setActivity: (a: ActivityType) => void;
  setPhonePose: (p: PhonePose) => void;
  addSample: (s: SensorSample) => void;
  addStep: (e: StepEvent) => void;
  reset: () => void;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  isTracking: false,
  sessionId: null,
  calibration: { k: 1.0, isCalibrated: false, distanceMeters: 0, stepCount: 0 },
  steps: [],
  trajectory: [],
  chartBuffer: [],
  latestSample: null,
  activity: 'standing',
  phonePose: 'unknown',
  cadenceSpm: 0,

  setTracking: (v, sessionId = null) => set({ isTracking: v, sessionId }),
  setCalibration: (c) => set((s) => ({ calibration: { ...s.calibration, ...c } })),
  setActivity: (a) => set({ activity: a }),
  setPhonePose: (p) => set({ phonePose: p }),

  addSample: (sample) =>
    set((s) => {
      const buf = [...s.chartBuffer, sample.filteredAccelMag];
      return {
        latestSample: sample,
        chartBuffer: buf.length > CHART_BUFFER_MAX ? buf.slice(-CHART_BUFFER_MAX) : buf,
      };
    }),

  addStep: (event) =>
    set((s) => {
      const steps = [...s.steps, event].slice(-TRAJECTORY_MAX);
      const traj = [...s.trajectory, { step: event.index, x: event.x, y: event.y }].slice(
        -TRAJECTORY_MAX,
      );

      // Cadence from last N step timestamps
      const recentTs = steps.slice(-CADENCE_WINDOW).map((st) => st.timestamp);
      let cadence = 0;
      if (recentTs.length >= 2) {
        const duration = recentTs[recentTs.length - 1] - recentTs[0];
        if (duration > 0) cadence = ((recentTs.length - 1) / duration) * 60000;
      }

      return { steps, trajectory: traj, cadenceSpm: cadence };
    }),

  reset: () =>
    set({
      steps: [],
      trajectory: [],
      chartBuffer: [],
      latestSample: null,
      activity: 'standing',
      cadenceSpm: 0,
      sessionId: null,
    }),
}));
