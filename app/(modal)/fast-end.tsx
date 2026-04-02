import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFastingStore } from '@/store/fastingStore'
import { useQueryClient } from '@tanstack/react-query'
import { RatingRow } from '@/components/fasting/RatingRow'

export default function FastEndModal() {
  const router = useRouter()
  const { activeFast, endFast, elapsedHours } = useFastingStore()
  const queryClient = useQueryClient()
  const [energyDuring, setEnergyDuring] = useState(3)
  const [energyAfter, setEnergyAfter] = useState(3)
  const [hungerPeak, setHungerPeak] = useState(3)

  async function handleSave() {
    if (!activeFast) return

    await supabase
      .from('fasting_logs')
      .update({
        end_time: new Date().toISOString(),
        energy_during: energyDuring,
        energy_after: energyAfter,
        hunger_peak: hungerPeak,
      })
      .eq('id', activeFast.id)

    endFast()
    queryClient.invalidateQueries({ queryKey: ['fasting-logs'] })
    router.back()
  }

  const hours = elapsedHours()

  return (
    <View className="flex-1 bg-background px-6 pt-12">
      <Text className="text-2xl font-bold text-text mb-2">Fast complete</Text>
      <Text className="text-text-muted mb-8">{hours.toFixed(1)} hours fasted</Text>

      <RatingRow label="Energy during fast (1 = low, 5 = high)" value={energyDuring} onChange={setEnergyDuring} />
      <RatingRow label="Energy after breaking fast" value={energyAfter} onChange={setEnergyAfter} />
      <RatingRow label="Hunger peak (1 = none, 5 = very hungry)" value={hungerPeak} onChange={setHungerPeak} />

      <Pressable onPress={handleSave} className="bg-fast px-8 py-4 rounded-2xl items-center mt-4">
        <Text className="text-white text-base font-semibold">Save & End Fast</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} className="items-center mt-4">
        <Text className="text-text-muted text-sm">Cancel — keep fasting</Text>
      </Pressable>
    </View>
  )
}
