import { View, Text } from 'react-native'

interface QualityBadgeProps {
  score: number | null
}

function badgeStyle(score: number | null): { container: string; text: string } {
  if (score === null) return { container: 'bg-surface2',                  text: 'text-text-muted' }
  if (score >= 7)     return { container: 'bg-fast-light border-fast',    text: 'text-quality-high font-bold' }
  if (score >= 4)     return { container: 'bg-surface2 border-surface2',  text: 'text-quality-mid font-bold' }
  return               { container: 'bg-surface2 border-surface2',        text: 'text-quality-low font-bold' }
}

export function QualityBadge({ score }: QualityBadgeProps) {
  const s = badgeStyle(score)
  return (
    <View className={`px-2 py-0.5 rounded-lg ${s.container}`}>
      <Text className={`text-xs ${s.text}`}>
        {score !== null ? score.toFixed(1) : '—'}
      </Text>
    </View>
  )
}
