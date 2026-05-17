import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeviceMotion } from 'expo-sensors';
import { toGroundFrame, magnitude } from '@/algorithms/rotationMatrix';
import { movingAverage } from '@/algorithms/movingAverage';
import { detectPeak } from '@/algorithms/stepDetection';
import { useTrackingStore } from '@/store/trackingStore';
import { sensorService } from '@/services/sensorService';
import { storageService } from '@/services/storageService';

type Phase = 'idle' | 'walking' | 'done';

export default function CalibrateScreen() {
  const { calibration, setCalibration } = useTrackingStore();
  const [distance, setDistance] = useState('10');
  const [phase, setPhase] = useState<Phase>('idle');
  const [stepCount, setStepCount] = useState(0);
  const bufRef = useRef<number[]>([]);
  const [subscription, setSubscription] = useState<ReturnType<typeof DeviceMotion.addListener> | null>(null);

  function startCalibration() {
    const dist = parseFloat(distance);
    if (isNaN(dist) || dist <= 0) {
      Alert.alert('Invalid distance', 'Enter a positive distance in meters.');
      return;
    }
    setPhase('walking');
    setStepCount(0);
    bufRef.current = [];

    DeviceMotion.setUpdateInterval(20);
    let steps = 0;

    const sub = DeviceMotion.addListener((data) => {
      const { acceleration, rotation } = data;
      if (!acceleration || !rotation) return;

      const ground = toGroundFrame(acceleration, rotation.beta ?? 0, rotation.gamma ?? 0);
      const mag = magnitude(ground);
      bufRef.current.push(mag);
      if (bufRef.current.length > 300) bufRef.current.shift();

      const buf = bufRef.current;
      const variance = buf.slice(-5).reduce((acc, v, _, arr) => {
        const mean = arr.reduce((a, b) => a + b) / arr.length;
        return acc + (v - mean) ** 2;
      }, 0) / Math.min(buf.length, 5);

      const heading = ((rotation.alpha ?? 0) * Math.PI) / 180;
      const peak = detectPeak(buf, heading, variance, 1.0, 1.5);
      if (peak) {
        steps++;
        setStepCount(steps);
      }
    });

    setSubscription(sub);
  }

  function finishCalibration() {
    subscription?.remove();
    setSubscription(null);
    setPhase('done');

    const dist = parseFloat(distance);
    if (stepCount === 0) {
      Alert.alert('No steps detected', 'Walk again and try.');
      setPhase('idle');
      return;
    }

    const avgStepLength = dist / stepCount;
    const k = avgStepLength / 0.75;
    setCalibration({ k, isCalibrated: true, distanceMeters: dist, stepCount });
    sensorService.setCalibration(k);
    storageService.saveCalibration({ k, distanceMeters: dist, stepCount, savedAt: Date.now() });
  }

  function cancelCalibration() {
    subscription?.remove();
    setSubscription(null);
    setPhase('idle');
    setStepCount(0);
  }

  return (
    <SafeAreaView className="flex-1 bg-background px-4 pt-6">
      <Text className="text-white text-2xl font-bold mb-6">Calibration</Text>

      {/* Current calibration */}
      <View className="bg-surface rounded-xl p-4 mb-6">
        <Text className="text-muted text-xs mb-1">Current k factor</Text>
        <Text className="text-white text-3xl font-mono font-bold">
          {calibration.k.toFixed(4)}
        </Text>
        {calibration.isCalibrated && (
          <Text className="text-secondary text-sm mt-1">
            Calibrated over {calibration.distanceMeters}m / {calibration.stepCount} steps
          </Text>
        )}
        {!calibration.isCalibrated && (
          <Text className="text-yellow-400 text-sm mt-1">Not calibrated (default)</Text>
        )}
      </View>

      {phase === 'idle' && (
        <View className="gap-4">
          <View>
            <Text className="text-muted text-sm mb-2">Known distance (meters)</Text>
            <TextInput
              className="bg-surface text-white rounded-xl px-4 py-3 font-mono text-lg"
              keyboardType="numeric"
              value={distance}
              onChangeText={setDistance}
              placeholderTextColor="#6b7280"
            />
          </View>
          <Text className="text-muted text-sm">
            1. Enter a distance you'll walk in a straight line.{'\n'}
            2. Hold phone still in pocket or hand.{'\n'}
            3. Press Start, walk the distance, press Done.
          </Text>
          <TouchableOpacity
            onPress={startCalibration}
            className="bg-primary rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-bold text-lg">Start Walking</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'walking' && (
        <View className="gap-4 items-center">
          <View className="bg-surface rounded-full w-40 h-40 items-center justify-center">
            <Text className="text-white text-5xl font-mono font-bold">{stepCount}</Text>
            <Text className="text-muted text-sm mt-1">steps detected</Text>
          </View>
          <Text className="text-white text-base">
            Walk {distance}m in a straight line, then tap Done.
          </Text>
          <TouchableOpacity
            onPress={finishCalibration}
            className="bg-green-600 rounded-2xl py-4 items-center w-full"
          >
            <Text className="text-white font-bold text-lg">Done Walking</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={cancelCalibration}>
            <Text className="text-muted">Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'done' && (
        <View className="gap-4">
          <View className="bg-green-900/40 border border-green-600 rounded-xl p-4">
            <Text className="text-green-400 font-bold text-lg">Calibration saved!</Text>
            <Text className="text-white text-sm mt-1">
              k = {calibration.k.toFixed(4)} ({calibration.stepCount} steps / {calibration.distanceMeters}m)
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPhase('idle')}
            className="border border-white/20 rounded-2xl py-3 items-center"
          >
            <Text className="text-muted">Recalibrate</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
