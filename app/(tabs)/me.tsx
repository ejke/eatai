import { View, Text, Pressable, ScrollView } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function MeScreen() {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      return data
    },
  })

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pt-6 pb-12">
      <View className="bg-surface rounded-2xl p-4 mb-6">
        <Text className="text-text font-semibold text-lg">{profile?.display_name ?? 'You'}</Text>
      </View>

      <View className="bg-surface rounded-2xl p-4 mb-6">
        <Text className="text-text-muted text-xs font-medium mb-3">CYCLE SETTINGS</Text>
        <Text className="text-text text-sm">Cycle length: {profile?.average_cycle_length ?? 28} days</Text>
        <Text className="text-text text-sm">Period length: {profile?.average_period_length ?? 5} days</Text>
      </View>

      <Pressable onPress={signOut} className="bg-surface border border-surface2 rounded-2xl px-6 py-4 items-center">
        <Text className="text-quality-low text-base font-medium">Sign Out</Text>
      </Pressable>
    </ScrollView>
  )
}
