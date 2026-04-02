import { View, Text, Pressable } from 'react-native'

interface RatingRowProps {
  label: string
  value: number
  onChange: (v: number) => void
}

export function RatingRow({ label, value, onChange }: RatingRowProps) {
  return (
    <View className="mb-6">
      <Text className="text-text-muted text-sm mb-2">{label}</Text>
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            className={`flex-1 py-3 rounded-xl items-center ${value === n ? 'bg-fast' : 'bg-fast-light'}`}
          >
            <Text className={value === n ? 'text-white font-bold' : 'text-fast'}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
