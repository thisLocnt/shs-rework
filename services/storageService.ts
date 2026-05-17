import { MMKV } from 'react-native-mmkv';
import { Session, SessionSummary } from '@/types/session';

const storage = new MMKV({ id: 'shs-rework' });

const SESSION_PREFIX = 'session:';
const SESSION_INDEX_KEY = 'session:index';
const CALIBRATION_KEY = 'calibration';

interface CalibrationData {
  k: number;
  distanceMeters: number;
  stepCount: number;
  savedAt: number;
}

export const storageService = {
  saveSession(session: Session) {
    const key = `${SESSION_PREFIX}${session.id}`;
    storage.set(key, JSON.stringify(session));

    const index = this.getSessionIndex();
    const exists = index.find((s) => s.id === session.id);
    const summary: SessionSummary = {
      id: session.id,
      name: session.name,
      startedAt: session.startedAt,
      durationMs: session.durationMs,
      totalSteps: session.totalSteps,
      totalDistanceM: session.totalDistanceM,
      avgCadenceSpm: session.avgCadenceSpm,
    };
    const next = exists ? index.map((s) => (s.id === session.id ? summary : s)) : [...index, summary];
    storage.set(SESSION_INDEX_KEY, JSON.stringify(next));
  },

  loadSession(id: string): Session | null {
    const raw = storage.getString(`${SESSION_PREFIX}${id}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  },

  deleteSession(id: string) {
    storage.delete(`${SESSION_PREFIX}${id}`);
    const index = this.getSessionIndex().filter((s) => s.id !== id);
    storage.set(SESSION_INDEX_KEY, JSON.stringify(index));
  },

  getSessionIndex(): SessionSummary[] {
    const raw = storage.getString(SESSION_INDEX_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SessionSummary[];
    } catch {
      return [];
    }
  },

  saveCalibration(data: CalibrationData) {
    storage.set(CALIBRATION_KEY, JSON.stringify(data));
  },

  loadCalibration(): CalibrationData | null {
    const raw = storage.getString(CALIBRATION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CalibrationData;
    } catch {
      return null;
    }
  },

  clearAll() {
    storage.clearAll();
  },
};
