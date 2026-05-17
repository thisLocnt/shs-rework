import { View, Text } from 'react-native';
import { ActivityType } from '@/types/session';

interface Props {
  cadenceSpm: number;
  activity: ActivityType;
}

const ACTIVITY_LABELS: Record<ActivityType, { label: string; emoji: string; color: string }> = {
  standing: { label: 'Standing', emoji: '🧍', color: 'text-muted' },
  walking: { label: 'Walking', emoji: '🚶', color: 'text-secondary' },
  running: { label: 'Running', emoji: '🏃', color: 'text-orange-400' },
  turning: { label: 'Turning', emoji: '🔄', color: 'text-yellow-400' },
};

export function CadenceMeter({ cadenceSpm, activity }: Props) {
  const a = ACTIVITY_LABELS[activity];
  return (
    <View className="bg-surface rounded-xl p-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-muted text-xs">Activity</Text>
        <Text className={`text-sm font-semibold ${a.color}`}>
          {a.emoji} {a.label}
        </Text>
      </View>
      <View className="flex-row items-baseline">
        <Text className="text-white text-4xl font-mono font-bold">{cadenceSpm.toFixed(0)}</Text>
        <Text className="text-muted text-sm ml-2">steps/min</Text>
      </View>
    </View>
  );
}
