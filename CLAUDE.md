@AGENTS.md

# SHS Rework — Indoor Pedestrian Tracking

GPS-less pedestrian tracking cho môi trường nhỏ (phòng, văn phòng, công viên). Dùng inertial sensors (accel + gyro + magnetometer) để track lộ trình đi bộ, **không cần GPS**.

Rework từ [Step-and-Heading-System](https://github.com/thisLocnt/Step-and-Heading-System). Repo mới: https://github.com/thisLocnt/shs-rework

## Business goals

| # | Goal | Status |
|---|---|---|
| 1 | Đếm bước + đo heading liên tục | ✅ Phase 1 |
| 2 | **Cadence** (bước/phút) — phân loại walk/run/stand | 🟡 Phase 2 |
| 3 | **Activity type** — walk, run, stand, turn, sideways | 🟡 Phase 2 |
| 4 | **Phone position adaptive** — pocket/hand/swing detection | 🟡 Phase 2 |
| 5 | Magnetometer fusion (heading drift correction) | 🟡 Phase 2 |
| 6 | **Session recording** — start → end timeline | 🟡 Phase 1 |
| 7 | **2D map view** — vẽ trajectory lộ trình | 🟡 Phase 1 |
| 8 | Persistent storage (sessions list) | 🟡 Phase 1 |
| 9 | Export CSV/XLSX/GeoJSON | 🟡 Phase 3 |
| 10 | Photo-scan map overlay | 🔮 Phase 4 |
| 11 | Area/dimension estimation từ trajectory | 🔮 Phase 4 |
| 12 | Obstacle detection từ movement patterns | 🔮 Phase 4 |

## Stack (đã upgrade)

| Layer | Lib | Notes |
|---|---|---|
| Framework | Expo SDK 54 + RN 0.81 + React 19 | New Architecture ON |
| Router | expo-router v6 | File-based |
| State | Zustand v5 | Global store + ref-based for hot paths |
| **Storage** | **react-native-mmkv** | 30x faster than AsyncStorage |
| **Charts** | **victory-native v41** + **@shopify/react-native-skia** | GPU-accelerated, 60fps |
| **2D Map** | **react-native-svg** + Skia canvas | Trajectory visualization |
| Sensors | expo-sensors v15 | DeviceMotion + Magnetometer |
| UI | NativeWind v4 (Tailwind) | |
| Export | xlsx + expo-file-system + expo-sharing | |
| Dev | expo-dev-client | Required for MMKV native module |

**Removed**: `mathjs` (~1MB, không thực sự dùng — đã inline math)

## Folder structure

```
app/
  _layout.tsx              — root, imports global.css
  (tabs)/
    _layout.tsx            — tab bar
    index.tsx              — Track screen (live PDR)
    map.tsx                — 2D trajectory map (current/replay)
    sessions.tsx           — List of recorded sessions
    calibrate.tsx          — Calibration workflow
    debug.tsx              — Raw sensor debug + export

algorithms/
  rotationMatrix.ts        — device → ground frame
  movingAverage.ts         — filter + variance
  stepDetection.ts         — peak detection + polynomial step length
  activityClassifier.ts    — walk/run/stand/turn classifier (cadence-based)
  phonePoseDetector.ts     — pocket/hand/swing detection from gravity vector
  headingFusion.ts         — gyro + magnetometer complementary filter

services/
  sensorService.ts         — DeviceMotion subscription (bounded buffer)
  sessionService.ts        — Session lifecycle (start/stop/save/load)
  storageService.ts        — MMKV wrapper

store/
  trackingStore.ts         — Live tracking state
  sessionsStore.ts         — Saved sessions list

components/
  TrajectoryMap.tsx        — Skia/SVG trajectory canvas
  ActivityIndicator.tsx    — Walk/run/stand badge
  CadenceMeter.tsx         — Steps/min display

types/
  sensors.ts               — Sensor data types
  session.ts               — Session schema

old-source/                — Original codebase (read-only ref)
```

## Constraints / Conventions

- Sensor buffer max: 300 samples (~6s @ 50Hz) — prevent memory leak
- Chart buffer max: 150 samples — limit re-renders
- Session storage key prefix: `session:` in MMKV
- All sensor math runs on JS thread for now (no worklets yet)
- Calibration `k`: `actualStepLength / 0.75` (baseline model output)
- Heading stored in radians, displayed in degrees

## Critical insight from migration

The original algorithm assumes **fixed device orientation** (held vertically in hand). For real-world use:
- **Phone pose** must be detected first (gravity vector direction)
- **Activity** affects step length model (running has longer steps)
- **Cadence** is the primary feature for walk/run/stand classification (avg human walk: ~100 spm, run: ~160+ spm)

## TODO priority order

1. Session lifecycle + MMKV persistence (Phase 1)
2. 2D trajectory map with Skia (Phase 1)
3. Activity classifier with cadence (Phase 2)
4. Phone pose detector (Phase 2)
5. Magnetometer fusion (Phase 2)
6. Session list / replay UI (Phase 3)
