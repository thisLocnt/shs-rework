import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';
import { useTrackingStore } from '@/store/trackingStore';

export default function DebugScreen() {
  const { steps, trajectory, latestSample, chartBuffer } = useTrackingStore();

  async function exportXLSX() {
    if (steps.length === 0) return;

    const ws = utils.json_to_sheet(
      steps.map((s) => ({
        step: s.index,
        timestamp: s.timestamp,
        x: s.x.toFixed(4),
        y: s.y.toFixed(4),
        heading_rad: s.heading.toFixed(4),
        step_length_m: s.stepLength.toFixed(4),
        variance: s.variance.toFixed(6),
      })),
    );

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Steps');

    const uri = `${FileSystem.cacheDirectory}shs_export_${Date.now()}.xlsx`;
    const buf: Uint8Array = write(wb, { type: 'buffer' });
    const b64 = Buffer.from(buf).toString('base64');
    await FileSystem.writeAsStringAsync(uri, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
  }

  const rawAccel = latestSample?.rawAccel;
  const groundAccel = latestSample?.groundAccel;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4 pt-6">
        <Text className="text-white text-2xl font-bold mb-6">Debug</Text>

        {/* Raw sensor */}
        <View className="bg-surface rounded-xl p-4 mb-4">
          <Text className="text-muted text-xs mb-2">Raw Acceleration (device frame)</Text>
          <SensorRow label="x" value={rawAccel?.x} />
          <SensorRow label="y" value={rawAccel?.y} />
          <SensorRow label="z" value={rawAccel?.z} />
        </View>

        {/* Ground frame */}
        <View className="bg-surface rounded-xl p-4 mb-4">
          <Text className="text-muted text-xs mb-2">Acceleration (ground frame)</Text>
          <SensorRow label="x" value={groundAccel?.x} />
          <SensorRow label="y" value={groundAccel?.y} />
          <SensorRow label="z" value={groundAccel?.z} />
        </View>

        {/* Buffer stats */}
        <View className="bg-surface rounded-xl p-4 mb-4">
          <Text className="text-muted text-xs mb-2">Buffer Stats</Text>
          <StatRow label="Buffer samples" value={String(chartBuffer.length)} />
          <StatRow label="Total steps" value={String(steps.length)} />
          <StatRow
            label="Total distance"
            value={
              steps.length > 0
                ? `${steps.reduce((acc, s) => acc + s.stepLength, 0).toFixed(2)} m`
                : '—'
            }
          />
          <StatRow
            label="Latest step length"
            value={
              steps.length > 0 ? `${steps[steps.length - 1].stepLength.toFixed(3)} m` : '—'
            }
          />
        </View>

        {/* Step log */}
        {steps.length > 0 && (
          <View className="bg-surface rounded-xl p-4 mb-6">
            <Text className="text-muted text-xs mb-2">Step Log (last 20)</Text>
            {steps.slice(-20).reverse().map((s) => (
              <View key={s.index} className="flex-row justify-between py-1 border-b border-white/5">
                <Text className="text-white font-mono text-xs">#{s.index}</Text>
                <Text className="text-secondary text-xs">{s.stepLength.toFixed(3)}m</Text>
                <Text className="text-muted text-xs">
                  ({s.x.toFixed(2)}, {s.y.toFixed(2)})
                </Text>
                <Text className="text-muted text-xs">
                  {((s.heading * 180) / Math.PI).toFixed(0)}°
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View className="px-4 pb-6">
        <TouchableOpacity
          onPress={exportXLSX}
          disabled={steps.length === 0}
          className={`rounded-2xl py-4 items-center ${steps.length === 0 ? 'bg-surface' : 'bg-primary'}`}
        >
          <Text className={`font-bold text-lg ${steps.length === 0 ? 'text-muted' : 'text-white'}`}>
            Export XLSX ({steps.length} steps)
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SensorRow({ label, value }: { label: string; value?: number }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-muted text-sm">{label}</Text>
      <Text className="text-white font-mono text-sm">
        {value !== undefined ? value.toFixed(4) : '—'}
      </Text>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="text-muted text-sm">{label}</Text>
      <Text className="text-white font-mono text-sm">{value}</Text>
    </View>
  );
}
