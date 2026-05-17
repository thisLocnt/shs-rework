import { StepEvent } from './sensors';

export type ActivityType = 'standing' | 'walking' | 'running' | 'turning';
export type PhonePose = 'hand' | 'pocket' | 'swinging' | 'unknown';

export interface ActivitySegment {
  type: ActivityType;
  startTs: number;
  endTs: number;
  stepStart: number;
  stepEnd: number;
}

export interface Session {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;

  steps: StepEvent[];
  segments: ActivitySegment[];

  totalDistanceM: number;
  totalSteps: number;
  avgCadenceSpm: number; // steps per minute
  maxCadenceSpm: number;

  calibrationK: number;
  notes?: string;
}

export interface SessionSummary {
  id: string;
  name: string;
  startedAt: number;
  durationMs: number;
  totalSteps: number;
  totalDistanceM: number;
  avgCadenceSpm: number;
}
