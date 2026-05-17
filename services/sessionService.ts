import { Session, ActivitySegment, ActivityType } from '@/types/session';
import { StepEvent } from '@/types/sensors';
import { storageService } from './storageService';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class SessionRecorder {
  private id: string = '';
  private startedAt: number = 0;
  private steps: StepEvent[] = [];
  private segments: ActivitySegment[] = [];
  private currentActivity: ActivityType = 'standing';
  private currentSegmentStart: number = 0;
  private currentSegmentStepStart: number = 0;

  start(): string {
    this.id = generateId();
    this.startedAt = Date.now();
    this.steps = [];
    this.segments = [];
    this.currentActivity = 'standing';
    this.currentSegmentStart = this.startedAt;
    this.currentSegmentStepStart = 0;
    return this.id;
  }

  addStep(step: StepEvent) {
    this.steps.push(step);
  }

  setActivity(type: ActivityType) {
    if (type === this.currentActivity) return;

    const now = Date.now();
    this.segments.push({
      type: this.currentActivity,
      startTs: this.currentSegmentStart,
      endTs: now,
      stepStart: this.currentSegmentStepStart,
      stepEnd: this.steps.length,
    });

    this.currentActivity = type;
    this.currentSegmentStart = now;
    this.currentSegmentStepStart = this.steps.length;
  }

  stop(name: string, calibrationK: number): Session {
    const endedAt = Date.now();

    // Close out final segment
    this.segments.push({
      type: this.currentActivity,
      startTs: this.currentSegmentStart,
      endTs: endedAt,
      stepStart: this.currentSegmentStepStart,
      stepEnd: this.steps.length,
    });

    const totalDistance = this.steps.reduce((acc, s) => acc + s.stepLength, 0);
    const duration = endedAt - this.startedAt;

    const session: Session = {
      id: this.id,
      name,
      startedAt: this.startedAt,
      endedAt,
      durationMs: duration,
      steps: this.steps,
      segments: this.segments,
      totalDistanceM: totalDistance,
      totalSteps: this.steps.length,
      avgCadenceSpm: duration > 0 ? (this.steps.length / duration) * 60000 : 0,
      maxCadenceSpm: this.computeMaxCadence(),
      calibrationK,
    };

    storageService.saveSession(session);
    return session;
  }

  private computeMaxCadence(): number {
    if (this.steps.length < 2) return 0;
    const WINDOW = 8;
    let max = 0;
    for (let i = WINDOW; i < this.steps.length; i++) {
      const window = this.steps.slice(i - WINDOW, i);
      const duration = window[WINDOW - 1].timestamp - window[0].timestamp;
      if (duration <= 0) continue;
      const cadence = ((WINDOW - 1) / duration) * 60000;
      if (cadence > max) max = cadence;
    }
    return max;
  }

  getCurrentSteps(): StepEvent[] {
    return this.steps;
  }
}

export const sessionRecorder = new SessionRecorder();
