import { View, Text } from 'react-native'
import { QualityBadge } from './QualityBadge'

interface FoodLog {
  id: string
  food_name: string | null
  quality_score: number | null
  ai_analysis: { macros?: { protein?: number; carbs?: number; fat?: number; fiber?: number } } | null
  fasting_state: string | null
}

interface FoodLogCardProps {
  item: FoodLog
}

export function FoodLogCard({ item }: FoodLogCardProps) {
  const macros = item.ai_analysis?.macros
  return (
    <View className="bg-surface mx-4 mb-2 rounded-2xl p-4 flex-row gap-3">
      <View className="w-14 h-14 bg-surface2 rounded-xl" />
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-text font-medium flex-1 mr-2" numberOfLines={1}>
            {item.food_name ?? 'Unknown food'}
          </Text>
          <QualityBadge score={item.quality_score} />
        </View>
        {macros && (
          <Text className="text-text-muted text-xs">
            P {macros.protein ?? 0}g · C {macros.carbs ?? 0}g · F {macros.fat ?? 0}g · Fi {macros.fiber ?? 0}g
          </Text>
        )}
        {item.fasting_state === 'breaking_fast' && (
          <Text className="text-fast text-xs mt-1">Breaking fast</Text>
        )}
      </View>
    </View>
  )
}
