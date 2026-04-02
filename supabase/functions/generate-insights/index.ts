import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Check if we already generated insights recently (within last 7 days of new data)
    const { data: latestInsight } = await supabase
      .from('insights')
      .select('generated_at, window_end')
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    if (latestInsight) {
      const { count } = await supabase
        .from('daily_summaries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('date', latestInsight.window_end)

      if ((count ?? 0) < 7) {
        return new Response(
          JSON.stringify({ message: 'Not enough new data', cached: true }),
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        )
      }
    }

    // Fetch last 12 weeks of daily summaries
    const twelveWeeksAgo = new Date()
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

    const { data: summaries, error: summariesError } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', twelveWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (summariesError || !summaries?.length) {
      return new Response(
        JSON.stringify({ error: 'Not enough data to generate insights' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const windowStart = summaries[0].date
    const windowEnd = summaries[summaries.length - 1].date

    const prompt = `You are a health pattern analyst. Analyze this user's health data from the past weeks and generate 3-5 specific, actionable insight cards.

DATA (daily summaries, chronological):
${JSON.stringify(summaries, null, 2)}

Generate insights focusing on:
1. Correlations between food quality and fasting completion
2. Cycle phase effects on energy, mood, or food choices
3. Fasting patterns and outcomes
4. Any surprising or non-obvious patterns

Return a JSON array of insight objects:
[
  {
    "type": "weekly_pattern" | "cycle_correlation" | "fasting_tip",
    "title": "<short, specific title>",
    "body": "<2-3 sentences explaining the pattern and what to do about it>",
    "supporting_data": { <key data points that support this insight> }
  }
]

Return ONLY valid JSON array, no markdown.`

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    const rawText = claudeData.content?.[0]?.text

    if (!rawText) throw new Error('No response from Claude')

    const insightCards = JSON.parse(rawText)

    // Store insights in DB
    const insightsToInsert = insightCards.map((card: any) => ({
      user_id: user.id,
      type: card.type,
      title: card.title,
      body: card.body,
      supporting_data: card.supporting_data,
      window_start: windowStart,
      window_end: windowEnd,
    }))

    const { error: insertError } = await supabase.from('insights').insert(insightsToInsert)
    if (insertError) throw insertError

    return new Response(JSON.stringify(insightCards), {
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
