import { View, Text, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'

// TODO: Replace placeholders with real widgets (fasting ring, cycle arc, insight card)
export default function TodayScreen() {
  const router = useRouter()

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pt-6 pb-12">
      {/* Fasting ring + cycle phase arc */}
      <View className="flex-row gap-4 mb-6">
        <View className="flex-1 bg-fast-light rounded-2xl p-4 items-center">
          <Text className="text-fast text-xs font-medium mb-1">FASTING</Text>
          <Text className="text-fast text-2xl font-bold">—</Text>
          <Text className="text-text-muted text-xs">not active</Text>
        </View>
        <View className="flex-1 bg-cycle-light rounded-2xl p-4 items-center">
          <Text className="text-cycle text-xs font-medium mb-1">CYCLE</Text>
          <Text className="text-cycle text-2xl font-bold">—</Text>
          <Text className="text-text-muted text-xs">set up cycle</Text>
        </View>
      </View>

      {/* Food quality */}
      <View className="bg-surface rounded-2xl p-4 mb-6">
        <Text className="text-text-muted text-xs font-medium mb-1">TODAY'S FOOD</Text>
        <Text className="text-text text-base">No meals logged yet</Text>
      </View>

      {/* Actions */}
      <View className="gap-3 mb-6">
        <Pressable
          onPress={() => router.push('/(modal)/log-food')}
          className="bg-primary rounded-2xl px-6 py-4 items-center"
        >
          <Text className="text-white text-base font-semibold">Log Food</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(modal)/log-symptom')}
          className="bg-surface border border-surface2 rounded-2xl px-6 py-4 items-center"
        >
          <Text className="text-text text-base">Log Symptom</Text>
        </Pressable>
      </View>

      {/* Latest insight card placeholder */}
      <View className="bg-surface2 rounded-2xl p-4">
        <Text className="text-text-muted text-xs font-medium mb-1">LATEST INSIGHT</Text>
        <Text className="text-text-muted text-sm">Log a few days of data to unlock insights.</Text>
      </View>
    </ScrollView>
  )
}
