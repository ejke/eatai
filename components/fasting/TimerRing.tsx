import { View, Text } from 'react-native'

interface TimerRingProps {
  elapsedHours: number
  targetHours: number
}

// TODO: Replace with React Native Skia ring
export function TimerRing({ elapsedHours, targetHours }: TimerRingProps) {
  return (
    <View className="w-48 h-48 rounded-full border-8 border-fast-light items-center justify-center mb-8">
      <Text className="text-fast text-3xl font-bold">{elapsedHours.toFixed(1)}h</Text>
      <Text className="text-text-muted text-sm">of {targetHours}h</Text>
    </View>
  )
}
