import { View, Text, Pressable } from 'react-native'
import { makeRedirectUri } from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  async function signInWithGoogle() {
    const redirectTo = makeRedirectUri({ scheme: 'eatai', path: 'auth/callback' })
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
    if (error || !data.url) return

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type === 'success') {
      const url = new URL(result.url)
      const code = url.searchParams.get('code')
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }
    }
  }

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Text className="text-4xl font-bold text-text mb-2">Eat AI</Text>
      <Text className="text-text-muted text-base mb-12 text-center">
        Food diary, fasting, and cycle tracking{'\n'}powered by AI insights.
      </Text>
      <Pressable
        onPress={signInWithGoogle}
        className="bg-primary px-8 py-4 rounded-2xl w-full items-center"
      >
        <Text className="text-white text-base font-semibold">Continue with Google</Text>
      </Pressable>
    </View>
  )
}
