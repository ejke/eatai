import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'

export default function OnboardingIndex() {
  const router = useRouter()
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Text className="text-2xl font-bold text-text mb-4">Welcome to Eat AI</Text>
      <Text className="text-text-muted text-base text-center mb-12">
        Let's set up your cycle and fasting preferences to unlock personalized insights.
      </Text>
      <Pressable
        onPress={() => router.push('/(auth)/onboarding/cycle-setup')}
        className="bg-primary px-8 py-4 rounded-2xl w-full items-center"
      >
        <Text className="text-white text-base font-semibold">Get Started</Text>
      </Pressable>
    </View>
  )
}
