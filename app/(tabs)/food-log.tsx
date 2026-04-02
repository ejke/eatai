import { View, Text, Pressable, SectionList } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { FoodLogCard } from '@/components/food/FoodLogCard'

// TODO: Replace SectionList with FlashList once data is wired up
export default function FoodLogScreen() {
  const router = useRouter()

  const { data: logs } = useQuery({
    queryKey: ['food-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('food_logs')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(100)
      return data ?? []
    },
  })

  return (
    <View className="flex-1 bg-background">
      <SectionList
        sections={[]}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => <FoodLogCard item={item} />}
        renderSectionHeader={({ section }) => (
          <View className="px-4 py-2 bg-background">
            <Text className="text-text-muted text-xs font-medium">{(section as any).title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-24">
            <Text className="text-text-muted">No food logged yet.</Text>
          </View>
        }
      />
      <Pressable
        onPress={() => router.push('/(modal)/log-food')}
        className="absolute bottom-8 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center shadow-md"
      >
        <Text className="text-white text-2xl font-light">+</Text>
      </Pressable>
    </View>
  )
}
