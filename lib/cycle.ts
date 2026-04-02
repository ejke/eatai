export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'

export interface PhaseResult {
  phase: CyclePhase
  dayOfCycle: number
}

/**
 * Calculate current cycle phase based on last period start date.
 * Pure function — works offline.
 *
 * Phase windows:
 *   Menstrual:   Day 1 → periodLength
 *   Follicular:  Day (periodLength+1) → ovulationDay
 *   Ovulatory:   ovulationDay → ovulationDay+2
 *   Luteal:      ovulationDay+3 → cycleLength
 *   Ovulation:   cycleLength - 14 (counted back from next period)
 */
export function getCurrentPhase(
  lastPeriodStart: Date,
  cycleLength: number,
  periodLength: number
): PhaseResult {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(lastPeriodStart)
  start.setHours(0, 0, 0, 0)

  const diffMs = today.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Normalize to current cycle (handles multiple cycles having passed)
  const dayOfCycle = (diffDays % cycleLength) + 1

  const ovulationDay = cycleLength - 14

  let phase: CyclePhase

  if (dayOfCycle <= periodLength) {
    phase = 'menstrual'
  } else if (dayOfCycle <= ovulationDay) {
    phase = 'follicular'
  } else if (dayOfCycle <= ovulationDay + 2) {
    phase = 'ovulatory'
  } else {
    phase = 'luteal'
  }

  return { phase, dayOfCycle }
}

/**
 * Calculate rolling average cycle length from logged cycle events.
 * Uses last 3–6 cycles for accuracy.
 */
export function averageCycleLength(periodStarts: Date[]): number {
  if (periodStarts.length < 2) return 28

  const sorted = [...periodStarts].sort((a, b) => a.getTime() - b.getTime())
  const recent = sorted.slice(-7) // last 6 cycles need 7 start dates
  const lengths: number[] = []

  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i].getTime() - recent[i - 1].getTime()
    lengths.push(Math.round(diff / (1000 * 60 * 60 * 24)))
  }

  const usable = lengths.slice(-6)
  return Math.round(usable.reduce((sum, l) => sum + l, 0) / usable.length)
}

/**
 * Predict next period start date based on last period and average cycle length.
 */
export function predictNextPeriod(lastPeriodStart: Date, cycleLength: number): Date {
  const next = new Date(lastPeriodStart)
  next.setDate(next.getDate() + cycleLength)
  return next
}

/**
 * Returns true if today is within ±3 days of the predicted period start.
 */
export function isPeriodDue(predictedStart: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.abs(predictedStart.getTime() - today.getTime())
  return diff <= 3 * 24 * 60 * 60 * 1000
}
