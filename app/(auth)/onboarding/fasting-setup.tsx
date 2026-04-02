import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

const PROTOCOLS = [
  { name: '16:8', hours: 16 },
  { name: '18:6', hours: 18 },
  { name: '20:4', hours: 20 },
]

export default function FastingSetupScreen() {
  const router = useRouter()

  async function handleSelect(hours: number, name: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('fasting_protocols').insert({
      user_id: user.id,
      name,
      target_hours: hours,
      is_default: true,
    })

    await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', user.id)

    router.replace('/(tabs)/')
  }

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <Text className="text-2xl font-bold text-text mb-2">Fasting goal</Text>
      <Text className="text-text-muted mb-8">
        Pick a starting protocol. You can change it anytime.
      </Text>

      <View className="gap-3">
        {PROTOCOLS.map((p) => (
          <Pressable
            key={p.name}
            onPress={() => handleSelect(p.hours, p.name)}
            className="bg-surface border border-fast-light rounded-2xl px-6 py-5"
          >
            <Text className="text-xl font-bold text-fast">{p.name}</Text>
            <Text className="text-text-muted text-sm">{p.hours}h fast / {24 - p.hours}h eating window</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => handleSelect(16, '16:8')} className="mt-auto mb-12 items-center">
        <Text className="text-text-muted text-sm">Skip for now</Text>
      </Pressable>
    </View>
  )
}
