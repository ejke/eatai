import { View, Text, Pressable, ScrollView } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export default function InsightsScreen() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const { data } = await supabase
        .from('insights')
        .select('*')
        .is('dismissed_at', null)
        .order('generated_at', { ascending: false })
        .limit(10)
      return data ?? []
    },
  })

  async function dismiss(id: string) {
    await supabase
      .from('insights')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id)
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-text-muted">Loading insights…</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pt-6 pb-12">
      {insights?.length === 0 && (
        <View className="bg-surface2 rounded-2xl p-6 items-center">
          <Text className="text-text font-medium mb-2">No insights yet</Text>
          <Text className="text-text-muted text-sm text-center">
            Log food and fasting data for 7+ days to unlock AI-generated pattern insights.
          </Text>
        </View>
      )}
      {insights?.map((insight: any) => (
        <View key={insight.id} className="bg-surface rounded-2xl p-4 mb-4 shadow-sm">
          <Text className="text-text-muted text-xs font-medium mb-1 uppercase">
            {insight.type.replace('_', ' ')}
          </Text>
          <Text className="text-text font-semibold text-base mb-2">{insight.title}</Text>
          <Text className="text-text-muted text-sm leading-5">{insight.body}</Text>
          <Pressable onPress={() => dismiss(insight.id)} className="mt-3 self-end">
            <Text className="text-text-muted text-xs">Dismiss</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  )
}
