import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CycleSetupScreen() {
  const router = useRouter()
  const [cycleLength, setCycleLength] = useState(28)
  const [periodLength, setPeriodLength] = useState(5)
  const [cycleType, setCycleType] = useState<'regular' | 'irregular' | 'none'>('regular')

  async function handleNext() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ average_cycle_length: cycleLength, average_period_length: periodLength, cycle_type: cycleType })
      .eq('id', user.id)

    router.push('/(auth)/onboarding/fasting-setup')
  }

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="text-2xl font-bold text-text mb-2">Your cycle</Text>
      <Text className="text-text-muted mb-8">
        This helps us predict your phases and find patterns.
      </Text>

      {/* TODO: date picker for last period + cycle length stepper */}
      <Text className="text-text-muted text-sm mb-2">Average cycle length: {cycleLength} days</Text>
      <Text className="text-text-muted text-sm mb-8">Average period length: {periodLength} days</Text>

      <Pressable
        onPress={handleNext}
        className="bg-primary px-8 py-4 rounded-2xl items-center mt-auto mb-12"
      >
        <Text className="text-white text-base font-semibold">Next</Text>
      </Pressable>
    </View>
  )
}
