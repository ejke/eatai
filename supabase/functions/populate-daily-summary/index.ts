import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Called by pg_cron at midnight or on-demand after logging
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { user_id, date } = await req.json()

    const targetDate = date ?? new Date().toISOString().split('T')[0]

    const usersToProcess = user_id
      ? [{ id: user_id }]
      : await getAllActiveUsers(supabase, targetDate)

    const results = await Promise.all(
      usersToProcess.map((u: { id: string }) => processUserDay(supabase, u.id, targetDate))
    )

    return new Response(JSON.stringify({ processed: results.length, date: targetDate }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})

async function getAllActiveUsers(supabase: any, date: string) {
  // Get users who have any activity on this date
  const { data } = await supabase
    .from('food_logs')
    .select('user_id')
    .gte('logged_at', `${date}T00:00:00Z`)
    .lt('logged_at', `${date}T23:59:59Z`)
  return [...new Map((data ?? []).map((r: any) => [r.user_id, { id: r.user_id }])).values()]
}

async function processUserDay(supabase: any, userId: string, date: string) {
  const startOfDay = `${date}T00:00:00Z`
  const endOfDay = `${date}T23:59:59Z`

  // Aggregate food logs
  const { data: foodLogs } = await supabase
    .from('food_logs')
    .select('quality_score, ai_analysis, cycle_phase')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay)
    .lte('logged_at', endOfDay)

  const mealCount = foodLogs?.length ?? 0
  const avgFoodQuality = mealCount > 0
    ? foodLogs!.reduce((sum: number, f: any) => sum + (f.quality_score ?? 0), 0) / mealCount
    : null

  // Aggregate fasting logs
  const { data: fastingLogs } = await supabase
    .from('fasting_logs')
    .select('actual_hours, completed, cycle_phase')
    .eq('user_id', userId)
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)

  const fastingHours = fastingLogs?.[0]?.actual_hours ?? null
  const fastCompleted = fastingLogs?.[0]?.completed ?? null

  // Aggregate symptoms
  const { data: symptoms } = await supabase
    .from('symptom_logs')
    .select('category, type, intensity')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay)
    .lte('logged_at', endOfDay)

  const energyLogs = symptoms?.filter((s: any) => s.category === 'energy') ?? []
  const moodLogs = symptoms?.filter((s: any) => s.category === 'mood') ?? []
  const painLogs = symptoms?.filter((s: any) => s.category === 'pain') ?? []

  const avgEnergy = energyLogs.length > 0
    ? energyLogs.reduce((sum: number, s: any) => sum + s.intensity, 0) / energyLogs.length
    : null
  const avgMood = moodLogs.length > 0
    ? moodLogs.reduce((sum: number, s: any) => sum + s.intensity, 0) / moodLogs.length
    : null
  const avgPain = painLogs.length > 0
    ? painLogs.reduce((sum: number, s: any) => sum + s.intensity, 0) / painLogs.length
    : null

  const bloating = symptoms?.some((s: any) => s.type === 'bloating') ?? false
  const headache = symptoms?.some((s: any) => s.type === 'headache') ?? false

  const cyclePhase = foodLogs?.[0]?.cycle_phase ?? fastingLogs?.[0]?.cycle_phase ?? null

  const summary = {
    user_id: userId,
    date,
    meal_count: mealCount || null,
    avg_food_quality: avgFoodQuality ? Math.round(avgFoodQuality * 10) / 10 : null,
    fasting_hours: fastingHours,
    fast_completed: fastCompleted,
    cycle_phase: cyclePhase,
    avg_energy: avgEnergy ? Math.round(avgEnergy * 10) / 10 : null,
    avg_mood: avgMood ? Math.round(avgMood * 10) / 10 : null,
    avg_pain: avgPain ? Math.round(avgPain * 10) / 10 : null,
    bloating: bloating || null,
    headache: headache || null,
  }

  const { error } = await supabase
    .from('daily_summaries')
    .upsert(summary, { onConflict: 'user_id,date' })

  if (error) throw error
  return { user_id: userId, date }
}
