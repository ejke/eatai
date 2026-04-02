import { create } from 'zustand'

interface ActiveFast {
  id: string
  startTime: Date
  targetHours: number
  protocolId?: string
  protocolName: string
}

interface FastingStore {
  activeFast: ActiveFast | null
  startFast: (fast: ActiveFast) => void
  endFast: () => void
  elapsedHours: () => number
  progressPercent: () => number
  isComplete: () => boolean
}

export const useFastingStore = create<FastingStore>((set, get) => ({
  activeFast: null,

  startFast: (fast) => set({ activeFast: fast }),

  endFast: () => set({ activeFast: null }),

  elapsedHours: () => {
    const { activeFast } = get()
    if (!activeFast) return 0
    const ms = Date.now() - activeFast.startTime.getTime()
    return ms / (1000 * 60 * 60)
  },

  progressPercent: () => {
    const { activeFast, elapsedHours } = get()
    if (!activeFast) return 0
    return Math.min((elapsedHours() / activeFast.targetHours) * 100, 100)
  },

  isComplete: () => {
    const { activeFast, elapsedHours } = get()
    if (!activeFast) return false
    return elapsedHours() >= activeFast.targetHours
  },
}))
