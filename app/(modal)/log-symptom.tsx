import { View, Text, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

const SYMPTOMS: { category: string; types: string[] }[] = [
  { category: 'mood', types: ['anxious', 'irritable', 'sad', 'calm', 'happy'] },
  { category: 'energy', types: ['fatigue', 'brain fog', 'energized'] },
  { category: 'pain', types: ['cramps', 'headache', 'back pain', 'breast tenderness'] },
  { category: 'digestion', types: ['bloating', 'nausea', 'constipation', 'diarrhea'] },
]

export default function LogSymptomModal() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<{ category: string; type: string } | null>(null)
  const [intensity, setIntensity] = useState(3)

  async function handleSave() {
    if (!selected) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('symptom_logs').insert({
      user_id: user.id,
      category: selected.category,
      type: selected.type,
      intensity,
    })

    queryClient.invalidateQueries({ queryKey: ['symptoms'] })
    router.back()
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 pt-6 pb-12">
        <Text className="text-2xl font-bold text-text mb-6">Log Symptom</Text>

        {SYMPTOMS.map((group) => (
          <View key={group.category} className="mb-6">
            <Text className="text-text-muted text-xs font-medium uppercase mb-2">{group.category}</Text>
            <View className="flex-row flex-wrap gap-2">
              {group.types.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setSelected({ category: group.category, type })}
                  className={`px-4 py-2 rounded-full border ${
                    selected?.type === type
                      ? 'bg-cycle border-cycle'
                      : 'bg-surface border-surface2'
                  }`}
                >
                  <Text className={selected?.type === type ? 'text-white' : 'text-text text-sm'}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {selected && (
          <View className="mb-6">
            <Text className="text-text-muted text-sm mb-2">Intensity</Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setIntensity(n)}
                  className={`flex-1 py-3 rounded-xl items-center ${intensity === n ? 'bg-cycle' : 'bg-cycle-light'}`}
                >
                  <Text className={intensity === n ? 'text-white font-bold' : 'text-cycle'}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View className="px-4 pb-12 gap-3">
        <Pressable
          onPress={handleSave}
          disabled={!selected}
          className={`px-8 py-4 rounded-2xl items-center ${selected ? 'bg-cycle' : 'bg-surface2'}`}
        >
          <Text className={selected ? 'text-white text-base font-semibold' : 'text-text-muted text-base'}>
            Save
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="items-center">
          <Text className="text-text-muted text-sm">Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}
