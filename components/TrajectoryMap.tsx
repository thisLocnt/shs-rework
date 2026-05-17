import { Canvas, Path, Skia, Circle, Group } from '@shopify/react-native-skia';
import { View, Text } from 'react-native';
import { useMemo } from 'react';
import { TrajectoryPoint } from '@/types/sensors';

interface Props {
  points: TrajectoryPoint[];
  width: number;
  height: number;
  showGrid?: boolean;
}

const PADDING = 24;

export function TrajectoryMap({ points, width, height, showGrid = true }: Props) {
  const { path, startPos, currentPos, bounds, scale } = useMemo(() => {
    if (points.length === 0) {
      return { path: null, startPos: null, currentPos: null, bounds: null, scale: 1 };
    }

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 0);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 0);

    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);
    const canvasW = width - PADDING * 2;
    const canvasH = height - PADDING * 2;
    const computedScale = Math.min(canvasW / rangeX, canvasH / rangeY);

    const project = (p: TrajectoryPoint) => ({
      x: PADDING + (p.x - minX) * computedScale,
      y: PADDING + canvasH - (p.y - minY) * computedScale, // flip Y for screen coords
    });

    const skPath = Skia.Path.Make();
    const firstPt = project(points[0]);
    skPath.moveTo(firstPt.x, firstPt.y);
    points.slice(1).forEach((p) => {
      const { x, y } = project(p);
      skPath.lineTo(x, y);
    });

    const last = points[points.length - 1];
    return {
      path: skPath,
      startPos: firstPt,
      currentPos: project(last),
      bounds: { minX, maxX, minY, maxY },
      scale: computedScale,
    };
  }, [points, width, height]);

  return (
    <View style={{ width, height }} className="bg-surface rounded-2xl overflow-hidden">
      <Canvas style={{ flex: 1 }}>
        {/* Grid */}
        {showGrid && (
          <Group>
            {Array.from({ length: 5 }).map((_, i) => {
              const x = PADDING + (i * (width - PADDING * 2)) / 4;
              const y = PADDING + (i * (height - PADDING * 2)) / 4;
              const gridX = Skia.Path.Make();
              gridX.moveTo(x, PADDING);
              gridX.lineTo(x, height - PADDING);
              const gridY = Skia.Path.Make();
              gridY.moveTo(PADDING, y);
              gridY.lineTo(width - PADDING, y);
              return (
                <Group key={i}>
                  <Path path={gridX} color="#2d2d3f" style="stroke" strokeWidth={0.5} />
                  <Path path={gridY} color="#2d2d3f" style="stroke" strokeWidth={0.5} />
                </Group>
              );
            })}
          </Group>
        )}

        {/* Trajectory */}
        {path && (
          <Path
            path={path}
            color="#6366f1"
            style="stroke"
            strokeWidth={3}
            strokeCap="round"
            strokeJoin="round"
          />
        )}

        {/* Start marker — cyan dot at first recorded point */}
        {startPos && (
          <Circle cx={startPos.x} cy={startPos.y} r={6} color="#22d3ee" />
        )}

        {/* Current position */}
        {currentPos && (
          <Group>
            <Circle cx={currentPos.x} cy={currentPos.y} r={10} color="#6366f1" opacity={0.3} />
            <Circle cx={currentPos.x} cy={currentPos.y} r={5} color="#6366f1" />
          </Group>
        )}
      </Canvas>

      {/* Scale legend */}
      {bounds && (
        <View className="absolute bottom-2 right-3">
          <Text className="text-muted text-xs font-mono">
            {(bounds.maxX - bounds.minX).toFixed(1)}m × {(bounds.maxY - bounds.minY).toFixed(1)}m
          </Text>
        </View>
      )}

      {points.length === 0 && (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-muted text-sm">No trajectory data yet</Text>
        </View>
      )}
    </View>
  );
}
