import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, Alert, TextInput, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrackingStore } from '@/store/trackingStore';
import { sensorService } from '@/services/sensorService';
import { sessionRecorder } from '@/services/sessionService';
import { storageService } from '@/services/storageService';
import { TrajectoryMap } from '@/components/TrajectoryMap';
import { CadenceMeter } from '@/components/CadenceMeter';

export default function TrackScreen() {
  const { width } = useWindowDimensions();
  const {
    isTracking,
    calibration,
    steps,
    trajectory,
    latestSample,
    activity,
    phonePose,
    cadenceSpm,
    setTracking,
    setActivity,
    setPhonePose,
    setCalibration,
    addSample,
    addStep,
    reset,
  } = useTrackingStore();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');

  // Load saved calibration on mount
  useEffect(() => {
    const saved = storageService.loadCalibration();
    if (saved) {
      setCalibration({
        k: saved.k,
        isCalibrated: true,
        distanceMeters: saved.distanceMeters,
        stepCount: saved.stepCount,
      });
      sensorService.setCalibration(saved.k);
    }
  }, []);

  useEffect(() => {
    sensorService.setCalibration(calibration.k);
  }, [calibration.k]);

  async function handleStart() {
    const granted = await sensorService.requestPermissions();
    if (!granted) {
      Alert.alert('Permission denied', 'Motion sensors are required.');
      return;
    }

    reset();
    const sessionId = sessionRecorder.start();

    await sensorService.start(
      (sample) => addSample(sample),
      (step) => {
        addStep(step);
        sessionRecorder.addStep(step);
      },
      (act, pose, _cadence) => {
        setActivity(act);
        setPhonePose(pose);
        sessionRecorder.setActivity(act);
      },
    );
    setTracking(true, sessionId);
  }

  function handleStop() {
    sensorService.stop();
    setTracking(false);
    if (steps.length > 0) {
      setSessionName(`Session ${new Date().toLocaleString()}`);
      setSaveModalOpen(true);
    }
  }

  function handleSave() {
    if (!sessionName.trim()) {
      Alert.alert('Name required', 'Please enter a session name.');
      return;
    }
    sessionRecorder.stop(sessionName.trim(), calibration.k);
    setSaveModalOpen(false);
    setSessionName('');
    reset();
    Alert.alert('Saved', 'Session saved to library.');
  }

  function handleDiscard() {
    setSaveModalOpen(false);
    setSessionName('');
    reset();
  }

  const lastStep = steps[steps.length - 1];
  const totalDistance = steps.reduce((acc, s) => acc + s.stepLength, 0);
  const mapSize = width - 32;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-white text-2xl font-bold">Track</Text>
          {phonePose !== 'unknown' && (
            <View className="bg-surface px-3 py-1 rounded-full">
              <Text className="text-muted text-xs">
                📱 {phonePose.charAt(0).toUpperCase() + phonePose.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {!calibration.isCalibrated && (
          <View className="bg-yellow-900/40 border border-yellow-600 rounded-xl p-3 mb-4">
            <Text className="text-yellow-400 text-sm">
              Not calibrated yet — using default k=1.0. Go to Calibrate tab.
            </Text>
          </View>
        )}

        {/* Activity + Cadence */}
        <View className="mb-4">
          <CadenceMeter cadenceSpm={cadenceSpm} activity={activity} />
        </View>

        {/* Trajectory map */}
        <View className="mb-4">
          <TrajectoryMap points={trajectory} width={mapSize} height={mapSize} />
        </View>

        {/* Stats */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <StatCard label="Steps" value={String(steps.length)} />
          <StatCard label="Distance" value={`${totalDistance.toFixed(1)}m`} />
          <StatCard label="Heading" value={lastStep ? `${((lastStep.heading * 180) / Math.PI).toFixed(0)}°` : '—'} />
          <StatCard label="Accel" value={latestSample ? latestSample.filteredAccelMag.toFixed(3) : '—'} />
        </View>
      </ScrollView>

      {/* Controls */}
      <View className="px-4 pb-6">
        <TouchableOpacity
          onPress={isTracking ? handleStop : handleStart}
          className={`rounded-2xl py-4 items-center ${isTracking ? 'bg-red-600' : 'bg-primary'}`}
        >
          <Text className="text-white font-bold text-lg">
            {isTracking ? 'Stop & Save' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Save modal */}
      <Modal visible={saveModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="bg-surface rounded-2xl p-6 w-full">
            <Text className="text-white text-lg font-bold mb-3">Save Session</Text>
            <Text className="text-muted text-sm mb-4">
              {steps.length} steps · {totalDistance.toFixed(1)}m
            </Text>
            <TextInput
              className="bg-background text-white rounded-xl px-4 py-3 mb-4"
              value={sessionName}
              onChangeText={setSessionName}
              placeholder="Session name"
              placeholderTextColor="#6b7280"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleDiscard}
                className="flex-1 border border-white/20 rounded-xl py-3 items-center"
              >
                <Text className="text-muted">Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 bg-primary rounded-xl py-3 items-center"
              >
                <Text className="text-white font-bold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-surface rounded-xl p-3 flex-1 min-w-[140px]">
      <Text className="text-muted text-xs mb-1">{label}</Text>
      <Text className="text-white text-xl font-mono font-bold">{value}</Text>
    </View>
  );
}
