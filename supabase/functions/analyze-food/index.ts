import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!

interface FoodAnalysis {
  food_name: string
  macros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  quality_score: number
  metabolic_impact: string
  anti_inflammatory: boolean
}

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
    const { image_base64, image_hash } = await req.json()

    if (!image_base64) {
      return new Response(JSON.stringify({ error: 'image_base64 is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // TODO: Check cache by image_hash before calling Gemini

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze this food image and return a JSON object with exactly these fields:
{
  "food_name": "descriptive name of the food",
  "macros": {
    "protein": <grams as number>,
    "carbs": <grams as number>,
    "fat": <grams as number>,
    "fiber": <grams as number>
  },
  "quality_score": <number 1-10, where 10 is most nutritious/whole food>,
  "metabolic_impact": "<one sentence about how this affects blood sugar/energy>",
  "anti_inflammatory": <true if predominantly anti-inflammatory, false otherwise>
}
Return ONLY valid JSON, no markdown, no explanation.`,
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: image_base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      throw new Error('No response from Gemini')
    }

    const analysis: FoodAnalysis = JSON.parse(rawText)

    // TODO: Store result in cache keyed by image_hash

    return new Response(JSON.stringify(analysis), {
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
