import { Pressable, Text } from 'react-native'

type Variant = 'primary' | 'secondary' | 'fast' | 'cycle' | 'destructive'

const styles: Record<Variant, { container: string; text: string }> = {
  primary:     { container: 'bg-primary',                      text: 'text-white font-semibold' },
  secondary:   { container: 'bg-surface border border-surface2', text: 'text-text' },
  fast:        { container: 'bg-fast',                         text: 'text-white font-semibold' },
  cycle:       { container: 'bg-cycle',                        text: 'text-white font-semibold' },
  destructive: { container: 'bg-quality-low',                  text: 'text-white font-semibold' },
}

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
}

export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const s = styles[variant]
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`px-8 py-4 rounded-2xl w-full items-center ${disabled ? 'bg-surface2' : s.container}`}
    >
      <Text className={`text-base ${disabled ? 'text-text-muted' : s.text}`}>{label}</Text>
    </Pressable>
  )
}
