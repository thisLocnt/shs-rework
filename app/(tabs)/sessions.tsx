import { View, Text, ScrollView, TouchableOpacity, Alert, useWindowDimensions, Modal } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { storageService } from '@/services/storageService';
import { TrajectoryMap } from '@/components/TrajectoryMap';
import { Session, SessionSummary } from '@/types/session';

export default function SessionsScreen() {
  const { width } = useWindowDimensions();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);

  const refresh = useCallback(() => {
    const all = storageService.getSessionIndex();
    setSessions(all.sort((a, b) => b.startedAt - a.startedAt));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(refresh, [refresh]);

  function openSession(id: string) {
    const s = storageService.loadSession(id);
    if (s) setSelected(s);
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert('Delete session?', name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          storageService.deleteSession(id);
          refresh();
        },
      },
    ]);
  }

  async function exportCSV(session: Session) {
    const header = 'step,timestamp,x,y,heading_rad,heading_deg,step_length_m,variance\n';
    const rows = session.steps
      .map(
        (s) =>
          `${s.index},${s.timestamp},${s.x.toFixed(4)},${s.y.toFixed(4)},${s.heading.toFixed(4)},${((s.heading * 180) / Math.PI).toFixed(2)},${s.stepLength.toFixed(4)},${s.variance.toFixed(6)}`,
      )
      .join('\n');
    const csv = header + rows;

    const uri = `${FileSystem.cacheDirectory}${session.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
    await FileSystem.writeAsStringAsync(uri, csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'text/csv' });
    }
  }

  const mapSize = width - 32;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-white text-2xl font-bold mb-6">Sessions</Text>

        {sessions.length === 0 && (
          <View className="bg-surface rounded-xl p-8 items-center">
            <Text className="text-muted text-base">No sessions yet</Text>
            <Text className="text-muted text-xs mt-1">Start tracking to record one</Text>
          </View>
        )}

        {sessions.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => openSession(s.id)}
            onLongPress={() => confirmDelete(s.id, s.name)}
            className="bg-surface rounded-xl p-4 mb-3"
          >
            <Text className="text-white font-semibold mb-1" numberOfLines={1}>
              {s.name}
            </Text>
            <Text className="text-muted text-xs mb-2">
              {new Date(s.startedAt).toLocaleString()}
            </Text>
            <View className="flex-row gap-4">
              <Stat label="Steps" value={String(s.totalSteps)} />
              <Stat label="Distance" value={`${s.totalDistanceM.toFixed(1)}m`} />
              <Stat label="Duration" value={formatDuration(s.durationMs)} />
              <Stat label="Cadence" value={`${s.avgCadenceSpm.toFixed(0)} spm`} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Session detail modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && (
          <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1 px-4 pt-2">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-xl font-bold flex-1" numberOfLines={1}>
                  {selected.name}
                </Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Text className="text-primary text-base">Close</Text>
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <TrajectoryMap
                  points={selected.steps.map((s) => ({ step: s.index, x: s.x, y: s.y }))}
                  width={mapSize}
                  height={mapSize}
                />
              </View>

              <View className="flex-row flex-wrap gap-3 mb-4">
                <Stat label="Total steps" value={String(selected.totalSteps)} />
                <Stat label="Distance" value={`${selected.totalDistanceM.toFixed(1)}m`} />
                <Stat label="Duration" value={formatDuration(selected.durationMs)} />
                <Stat label="Avg cadence" value={`${selected.avgCadenceSpm.toFixed(0)} spm`} />
                <Stat label="Max cadence" value={`${selected.maxCadenceSpm.toFixed(0)} spm`} />
                <Stat label="Calibration k" value={selected.calibrationK.toFixed(3)} />
              </View>

              <Text className="text-muted text-xs mb-2">Activity segments</Text>
              <View className="bg-surface rounded-xl p-3 mb-4">
                {selected.segments.map((seg, i) => (
                  <View key={i} className="flex-row justify-between py-1">
                    <Text className="text-white text-sm capitalize">{seg.type}</Text>
                    <Text className="text-muted text-sm">
                      {formatDuration(seg.endTs - seg.startTs)} · {seg.stepEnd - seg.stepStart} steps
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => exportCSV(selected)}
                className="bg-primary rounded-2xl py-4 items-center mb-4"
              >
                <Text className="text-white font-bold">Export CSV</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-muted text-[10px]">{label}</Text>
      <Text className="text-white font-mono text-sm font-semibold">{value}</Text>
    </View>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
