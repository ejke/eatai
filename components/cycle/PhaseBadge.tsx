import { View, Text } from 'react-native'
import type { CyclePhase } from '@/lib/cycle'

const phaseLabels: Record<CyclePhase, string> = {
  menstrual:  'Menstrual',
  follicular: 'Follicular',
  ovulatory:  'Ovulatory',
  luteal:     'Luteal',
}

interface PhaseBadgeProps {
  phase: CyclePhase
  dayOfCycle: number
}

export function PhaseBadge({ phase, dayOfCycle }: PhaseBadgeProps) {
  return (
    <View className="flex-1 bg-cycle-light rounded-2xl p-4 items-center">
      <Text className="text-cycle text-xs font-medium mb-1">CYCLE</Text>
      <Text className="text-cycle text-2xl font-bold">Day {dayOfCycle}</Text>
      <Text className="text-text-muted text-xs">{phaseLabels[phase]}</Text>
    </View>
  )
}
