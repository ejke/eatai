import { View, Text, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useFastingStore } from '@/store/fastingStore'
import { supabase } from '@/lib/supabase'
import { TimerRing } from '@/components/fasting/TimerRing'

export default function FastScreen() {
  const router = useRouter()
  const { activeFast, startFast, elapsedHours, progressPercent } = useFastingStore()

  async function handleStartFast() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: protocol } = await supabase
      .from('fasting_protocols')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single()

    const targetHours = protocol?.target_hours ?? 16
    const startTime = new Date()

    const { data: log } = await supabase
      .from('fasting_logs')
      .insert({ user_id: user.id, start_time: startTime.toISOString(), target_hours: targetHours, protocol_id: protocol?.id })
      .select()
      .single()

    if (log) {
      startFast({ id: log.id, startTime, targetHours, protocolId: protocol?.id, protocolName: protocol?.name ?? '16:8' })
    }
  }

  async function handleStopFast() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (!activeFast) return
    router.push('/(modal)/fast-end')
  }

  const elapsed = elapsedHours()
  const progress = progressPercent()

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      {activeFast ? (
        <>
          <TimerRing elapsedHours={elapsed} targetHours={activeFast.targetHours} />
          <Text className="text-text-muted mb-8">{progress.toFixed(0)}% complete</Text>
          <Pressable
            onPress={handleStopFast}
            className="bg-quality-low px-8 py-4 rounded-2xl w-full items-center"
          >
            <Text className="text-white text-base font-semibold">Stop Fast</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="text-text text-xl font-bold mb-2">No active fast</Text>
          <Text className="text-text-muted text-base mb-12 text-center">
            Start your fast to begin tracking.
          </Text>
          <Pressable
            onPress={handleStartFast}
            className="bg-fast px-8 py-4 rounded-2xl w-full items-center"
          >
            <Text className="text-white text-base font-semibold">Start Fast</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}
