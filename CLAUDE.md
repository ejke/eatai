# Eat AI — Project Intelligence

## What This App Is

Eat AI is a mobile health app that combines a visual food diary, intermittent fasting tracker, and menstrual cycle tracker. The core product is the **AI pattern recognition layer** that finds correlations across all three domains — e.g. "You tend to bloat more after low-quality meals during your luteal phase" or "Your fasting completion rate drops in the 3 days before your period."

The logging features (food, fasting, cycle, symptoms) are data collection mechanisms. The insights are the actual product.

**Target platform**: Android first. iOS later.

---

## Feature Hierarchy

Build in this order. Do not build Tier 3/4 until Tier 2 works.

```
TIER 1 — MVP Core
├── Food diary: photo → AI analysis → quality score + macros
└── Fasting tracker: timer, protocols, post-fast rating

TIER 2 — Differentiator (what makes this not just Zero + Flo)
└── AI pattern insights: cross-domain correlations, weekly summaries

TIER 3 — Retention & depth
└── Cycle tracking: phases, predictions, symptom logging

TIER 4 — Future
└── Sleep, movement, stress (manual entry first, fitness tracker sync later)
```

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Expo (SDK 51+) with Expo Router | File-based routing, not React Navigation |
| Language | TypeScript (strict) | |
| Styling | NativeWind v4 + Gluestack UI | Gluestack for components, NativeWind for utility classes |
| Backend | Supabase | Auth, PostgreSQL, Storage, Edge Functions |
| State | TanStack Query (server) + Zustand (local/UI) | TanStack for all server data, Zustand for fasting timer state |
| AI - Food | Gemini Flash via Supabase Edge Function | Never call AI APIs from the client |
| AI - Insights | Claude or GPT-4o via Supabase Edge Function | Needs reasoning, not just vision |
| Graphics | React Native Skia | Fasting ring, cycle phase arc |
| Lists | FlashList (@shopify/flash-list) | All scrollable food/history lists |
| Animation | React Native Reanimated 3 | Included in Expo, must be enabled |

---

## Navigation Structure

```
app/
├── (auth)/
│   ├── login.tsx
│   └── onboarding/          # Collect first period date + avg cycle length
│       ├── index.tsx
│       ├── cycle-setup.tsx
│       └── fasting-setup.tsx
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx            # Today (home)
│   ├── food-log.tsx         # Food diary — grouped by day
│   ├── fast.tsx             # Fasting screen (Zero-style)
│   ├── insights.tsx         # AI pattern cards
│   └── me.tsx               # Profile, settings, cycle settings
├── (modal)/
│   ├── log-food.tsx         # Camera + AI analysis
│   ├── fast-end.tsx         # "How was your fast?" rating
│   └── log-symptom.tsx      # Quick symptom entry
└── _layout.tsx
```

Camera is a modal triggered by a button on Today and Food Log — NOT a tab.

---

## Database Schema

### All tables require RLS enabled from the start.

```sql
-- PROFILES
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT,
  avatar_url            TEXT,
  average_cycle_length  INTEGER DEFAULT 28,
  average_period_length INTEGER DEFAULT 5,
  cycle_type            TEXT DEFAULT 'regular',   -- 'regular' | 'irregular' | 'none'
  onboarding_complete   BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- FOOD LOGS
CREATE TABLE food_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  image_url       TEXT,
  food_name       TEXT,
  ai_analysis     JSONB,    -- { macros: {protein, carbs, fat, fiber}, quality_score: 8.2,
                            --   metabolic_impact: "...", anti_inflammatory: true }
  quality_score   NUMERIC(3,1),   -- denormalized from ai_analysis for fast queries
  notes           TEXT,
  cycle_phase     TEXT,           -- denormalized: 'menstrual'|'follicular'|'ovulatory'|'luteal'|NULL
  fasting_state   TEXT,           -- 'fasting_window'|'eating_window'|'breaking_fast'|'no_active_fast'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- FASTING PROTOCOLS (user's saved presets)
CREATE TABLE fasting_protocols (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,        -- "My 16:8"
  target_hours  INTEGER NOT NULL,     -- 16
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- FASTING LOGS
CREATE TABLE fasting_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  protocol_id     UUID REFERENCES fasting_protocols(id),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,        -- NULL = fast currently in progress
  target_hours    INTEGER NOT NULL,
  actual_hours    NUMERIC(4,1) GENERATED ALWAYS AS (
                    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
                  ) STORED,
  completed       BOOLEAN GENERATED ALWAYS AS (
                    end_time IS NOT NULL AND
                    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 >= target_hours
                  ) STORED,
  energy_during   SMALLINT CHECK (energy_during BETWEEN 1 AND 5),
  energy_after    SMALLINT CHECK (energy_after BETWEEN 1 AND 5),
  hunger_peak     SMALLINT CHECK (hunger_peak BETWEEN 1 AND 5),
  notes           TEXT,
  cycle_phase     TEXT,               -- denormalized
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- CYCLE EVENTS (actual logged periods)
CREATE TABLE cycle_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL DEFAULT 'period',
  start_date  DATE NOT NULL,
  end_date    DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- CYCLE PREDICTIONS (computed, separate from actual events)
CREATE TABLE cycle_predictions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  predicted_start   DATE NOT NULL,
  predicted_phases  JSONB,   -- { menstrual: [start, end], follicular: [...], ovulatory: [...], luteal: [...] }
  based_on_cycles   INTEGER, -- how many past cycles were averaged
  generated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SYMPTOM LOGS
CREATE TABLE symptom_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category      TEXT NOT NULL,     -- 'mood'|'energy'|'pain'|'digestion'|'stress'|'sleep'
  type          TEXT NOT NULL,     -- 'headache'|'bloating'|'cramps'|'fatigue'|'anxious'
  intensity     SMALLINT CHECK (intensity BETWEEN 1 AND 5),
  notes         TEXT,
  cycle_phase   TEXT,              -- denormalized
  fasting_state TEXT               -- were they fasting when this occurred?
);

-- DAILY SUMMARIES (key table for correlation queries — populated by pg_cron)
CREATE TABLE daily_summaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  UNIQUE (user_id, date),
  -- food
  meal_count        SMALLINT,
  avg_food_quality  NUMERIC(3,1),
  dominant_macros   JSONB,          -- { protein_pct: 35, carb_pct: 40, fat_pct: 25 }
  -- fasting
  fasting_hours     NUMERIC(4,1),
  fast_completed    BOOLEAN,
  -- cycle
  cycle_phase       TEXT,
  cycle_day         SMALLINT,
  -- symptoms (aggregated)
  avg_energy        NUMERIC(3,1),
  avg_mood          NUMERIC(3,1),
  avg_pain          NUMERIC(3,1),
  bloating          BOOLEAN,
  headache          BOOLEAN,
  -- external (manual or future fitness tracker)
  sleep_hours       NUMERIC(3,1),
  sleep_quality     SMALLINT,
  steps             INTEGER,
  stress_level      SMALLINT
);

-- AI INSIGHTS (cached pattern analysis)
CREATE TABLE insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  type            TEXT NOT NULL,  -- 'weekly_pattern'|'cycle_correlation'|'fasting_tip'
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  supporting_data JSONB,          -- data points that generated this insight
  window_start    DATE,
  window_end      DATE,
  dismissed_at    TIMESTAMPTZ     -- user dismissed this card
);
```

### Required Indexes

```sql
CREATE INDEX idx_food_logs_user_time     ON food_logs      (user_id, logged_at DESC);
CREATE INDEX idx_food_logs_phase         ON food_logs      (user_id, cycle_phase);
CREATE INDEX idx_fasting_logs_user_time  ON fasting_logs   (user_id, start_time DESC);
CREATE INDEX idx_fasting_active          ON fasting_logs   (user_id) WHERE end_time IS NULL;
CREATE INDEX idx_cycle_events_user_start ON cycle_events   (user_id, start_date DESC);
CREATE INDEX idx_symptom_logs_user_time  ON symptom_logs   (user_id, logged_at DESC);
CREATE INDEX idx_daily_summaries_user    ON daily_summaries (user_id, date DESC);
```

### RLS Pattern (apply to all tables)

```sql
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own data" ON food_logs FOR ALL USING (auth.uid() = user_id);
-- repeat for every table
```

---

## AI Operations — Three Distinct Calls

### 1. Food Recognition (per photo, real-time)
- **Model**: Gemini Flash
- **Trigger**: user taps "analyze" after taking photo
- **Input**: base64 image
- **Output**: `{ food_name, macros: {protein, carbs, fat, fiber}, quality_score, metabolic_impact, anti_inflammatory }`
- **Cost**: ~$0.01–0.03/call
- **Cache**: hash the image, return cached result if same image uploaded twice

### 2. Daily Rollup (no AI needed)
- **Trigger**: Supabase pg_cron at midnight user's local time (or on-demand)
- **Operation**: SQL aggregation → writes to `daily_summaries`
- **No AI involved** — pure data aggregation

### 3. Pattern Insights (weekly, on-demand)
- **Model**: Claude or GPT-4o (needs reasoning)
- **Trigger**: user opens Insights tab OR weekly push notification
- **Input**: last 4–12 weeks of `daily_summaries` rows (pre-aggregated, compact)
- **Output**: 3–5 insight cards → stored in `insights` table
- **Cost**: ~$0.05–0.15/generation
- **Cache**: only regenerate if 7+ new days of data since last generation
- **Freemium gate**: pattern insights are paid-only feature

---

## Fasting Tracker — Key Technical Decisions

- **Timer is local**: store `start_time` in Supabase on tap, calculate elapsed with `Date.now() - start_time`. No server polling.
- **Persists across app restarts**: on launch, query for `fasting_logs WHERE end_time IS NULL` — resume timer automatically.
- **Completion notification**: schedule local notification via `expo-notifications` at `start_time + target_hours` when fast starts.
- **Offline support**: fast start/stop must work offline. Queue to Supabase when reconnected.
- **Zustand** manages the active fast state locally (start_time, target_hours, is_active).

---

## Cycle Phase Calculation

Write as a pure TypeScript utility — NOT an edge function call. Must work offline.

```typescript
type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal'

// Standard hormonal windows
// Menstrual:   Day 1 → period_length (typically 1–5)
// Follicular:  Day (period_length+1) → ovulation_day (typically 6–13)
// Ovulatory:   ovulation_day → ovulation_day+2 (typically 13–15)
// Luteal:      ovulation_day+3 → cycle_length (typically 16–28)
// Ovulation:   cycle_length - 14 (backwards from next period)

function getCurrentPhase(
  lastPeriodStart: Date,
  cycleLength: number,     // from profiles.average_cycle_length
  periodLength: number     // from profiles.average_period_length
): { phase: CyclePhase; dayOfCycle: number }
```

Prediction uses rolling average of last 3–6 logged cycle_events.

---

## Today Screen Layout

Top section: fasting ring + cycle phase arc (side by side)
Middle: food quality bar (avg quality score + meal count)
Actions: Log Food (opens modal) | Stop/Start Fast | Log Symptom
Bottom: one AI insight card (latest undismissed insight)

### State-aware buttons
- Fast button: "Start Fast" (secondary) when not fasting, "Stop Fast" (primary destructive) when active
- Period button: only appears when cycle is predicted to be due (±3 days)

---

## Food Log Screen

SectionList grouped by day. Each section header shows: date + day's avg quality score + fasting hours.

Each food log card shows:
- Photo thumbnail (left)
- Food name + quality score badge (color-coded: green ≥7, amber 4–6.9, red <4)
- Macro summary: P / C / F / Fi in grams
- Time + "Breaking fast" badge if fasting_state = 'breaking_fast'

Use FlashList, not FlatList.

---

## Design System

### Color Tokens

```typescript
export const colors = {
  background:   '#FAFAF8',  // warm off-white
  surface:      '#FFFFFF',
  surface2:     '#F5F0EB',  // subtle warm sections

  primary:      '#C2602A',  // terracotta — food, energy
  primaryDark:  '#9A4A1F',

  cycle:        '#7C5C8A',  // muted plum — hormonal health
  cycleLight:   '#E8DFF0',

  fast:         '#2A6B6E',  // deep teal — fasting, clarity
  fastLight:    '#D0EAEB',

  qualityHigh:  '#5A8C5A',  // forest green — quality ≥7
  qualityMid:   '#C4A444',  // amber — quality 4–6.9
  qualityLow:   '#B85050',  // muted red — quality <4

  text:         '#1A1A1A',
  textMuted:    '#6B6B6B',
}
```

### Key Libraries

```
@gluestack-ui/themed              — component system
@shopify/react-native-skia        — rings, custom graphics
@shopify/flash-list               — all scrollable lists
react-native-reanimated           — animations
expo-haptics                      — haptic feedback on fast start/stop
expo-notifications                — fast completion + period reminders
expo-image                        — optimized image display
expo-image-manipulator            — compress photos before upload (~500KB target)
```

---

## Edge Functions (Supabase Deno)

```
supabase/functions/
├── analyze-food/         — Gemini Flash food recognition
├── generate-insights/    — Claude/GPT-4o pattern analysis
└── populate-daily-summary/ — triggered by pg_cron or manually
```

Never call AI APIs from the client. All AI goes through edge functions.

---

## Implementation Order

1. SQL schema + RLS in Supabase dashboard
2. Expo project scaffold (Expo Router + NativeWind + Gluestack + Supabase client)
3. Auth: Google OAuth + onboarding flow (collect last period date + cycle length)
4. Fasting tracker: start/stop timer → Zustand + Supabase + local notification
5. Food diary: camera → compress → upload → edge function → display result
6. Today screen: compose fasting + food + cycle widgets
7. Cycle tracking: phase calculation utility + cycle_events logging + prediction
8. Daily summary rollup: pg_cron job + SQL aggregation
9. Insights: edge function + pattern analysis prompt + Insights tab UI
10. Symptom logging: quick entry modal

---

## What NOT to Build in V1

- Apple Health / Google Fit sync (manual entry only)
- iOS (Android first)
- Social features or sharing
- Web app
- Stress / sleep hardware integration
- Any Tier 4 features before Tier 2 is working

---

## Supabase Setup Checklist

- [ ] Enable Google OAuth in Authentication > Providers
- [ ] Create storage bucket: `food-photos` (private, authenticated access only)
- [ ] Run full schema SQL including indexes and RLS policies
- [ ] Enable pg_cron extension (Database > Extensions)
- [ ] Create edge functions (CLI: `supabase functions new analyze-food`)
- [ ] Set environment secrets: `GEMINI_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- [ ] Set up `anon` and `service_role` keys in app environment

---

## Key Architectural Rules

1. **RLS on every table from day one** — health data, no exceptions
2. **Denormalize `cycle_phase` and `fasting_state` onto all log tables** — don't compute at query time
3. **All AI calls go through edge functions** — never expose API keys to client
4. **Fasting timer is local state** — Zustand + timestamp math, not server polling
5. **Cache AI insights** — only regenerate if 7+ new days of data since last generation
6. **FlashList everywhere** — never use FlatList for data lists
7. **Compress images before upload** — target 500KB, use expo-image-manipulator
8. **Offline-first for logging** — food and fast logs must save locally if offline
9. **`daily_summaries` is the correlation layer** — all pattern queries run against this table, not raw logs
10. **Build Tier 1 before Tier 2, Tier 2 before Tier 3** — insights before cycle tracker
