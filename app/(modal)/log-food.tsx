import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import * as ImageManipulator from 'expo-image-manipulator'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

export default function LogFoodModal() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [permission, requestPermission] = useCameraPermissions()
  const [analyzing, setAnalyzing] = useState(false)
  const [camera, setCamera] = useState<CameraView | null>(null)

  async function takePicture() {
    if (!camera) return
    setAnalyzing(true)
    try {
      const photo = await camera.takePictureAsync({ base64: false, quality: 0.9 })
      if (!photo?.uri) return

      // Compress to ~500KB
      const compressed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Upload image to storage
      const fileName = `${user.id}/${Date.now()}.jpg`
      const { data: uploadData } = await supabase.storage
        .from('food-photos')
        .upload(fileName, Buffer.from(compressed.base64!, 'base64'), { contentType: 'image/jpeg' })

      const { data: { publicUrl } } = supabase.storage
        .from('food-photos')
        .getPublicUrl(fileName)

      // Call edge function for AI analysis
      const { data: analysis, error } = await supabase.functions.invoke('analyze-food', {
        body: { image_base64: compressed.base64 },
      })

      if (error) throw error

      // Save to food_logs
      await supabase.from('food_logs').insert({
        user_id: user.id,
        image_url: publicUrl,
        food_name: analysis.food_name,
        ai_analysis: analysis,
        quality_score: analysis.quality_score,
      })

      queryClient.invalidateQueries({ queryKey: ['food-logs'] })
      router.back()
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }

  if (!permission) return <View className="flex-1 bg-background" />

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-text text-base mb-6 text-center">Camera access is needed to log food.</Text>
        <Pressable onPress={requestPermission} className="bg-primary px-8 py-4 rounded-2xl">
          <Text className="text-white font-semibold">Allow Camera</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={setCamera} className="flex-1" facing="back" />
      <View className="absolute bottom-0 left-0 right-0 pb-16 items-center bg-black/20">
        {analyzing ? (
          <ActivityIndicator size="large" color="white" />
        ) : (
          <Pressable
            onPress={takePicture}
            className="w-20 h-20 rounded-full bg-white items-center justify-center"
          />
        )}
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-white text-sm">Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}
