-- ============================================================
-- EatAI — Initial Schema
-- ============================================================

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
  ai_analysis     JSONB,
  quality_score   NUMERIC(3,1),
  notes           TEXT,
  cycle_phase     TEXT,
  fasting_state   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- FASTING PROTOCOLS
CREATE TABLE fasting_protocols (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  target_hours  INTEGER NOT NULL,
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- FASTING LOGS
CREATE TABLE fasting_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  protocol_id     UUID REFERENCES fasting_protocols(id),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
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
  cycle_phase     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- CYCLE EVENTS
CREATE TABLE cycle_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL DEFAULT 'period',
  start_date  DATE NOT NULL,
  end_date    DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- CYCLE PREDICTIONS
CREATE TABLE cycle_predictions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  predicted_start   DATE NOT NULL,
  predicted_phases  JSONB,
  based_on_cycles   INTEGER,
  generated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SYMPTOM LOGS
CREATE TABLE symptom_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category      TEXT NOT NULL,
  type          TEXT NOT NULL,
  intensity     SMALLINT CHECK (intensity BETWEEN 1 AND 5),
  notes         TEXT,
  cycle_phase   TEXT,
  fasting_state TEXT
);

-- DAILY SUMMARIES
CREATE TABLE daily_summaries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  UNIQUE (user_id, date),
  meal_count        SMALLINT,
  avg_food_quality  NUMERIC(3,1),
  dominant_macros   JSONB,
  fasting_hours     NUMERIC(4,1),
  fast_completed    BOOLEAN,
  cycle_phase       TEXT,
  cycle_day         SMALLINT,
  avg_energy        NUMERIC(3,1),
  avg_mood          NUMERIC(3,1),
  avg_pain          NUMERIC(3,1),
  bloating          BOOLEAN,
  headache          BOOLEAN,
  sleep_hours       NUMERIC(3,1),
  sleep_quality     SMALLINT,
  steps             INTEGER,
  stress_level      SMALLINT
);

-- AI INSIGHTS
CREATE TABLE insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  supporting_data JSONB,
  window_start    DATE,
  window_end      DATE,
  dismissed_at    TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_food_logs_user_time     ON food_logs       (user_id, logged_at DESC);
CREATE INDEX idx_food_logs_phase         ON food_logs       (user_id, cycle_phase);
CREATE INDEX idx_fasting_logs_user_time  ON fasting_logs    (user_id, start_time DESC);
CREATE INDEX idx_fasting_active          ON fasting_logs    (user_id) WHERE end_time IS NULL;
CREATE INDEX idx_cycle_events_user_start ON cycle_events    (user_id, start_date DESC);
CREATE INDEX idx_symptom_logs_user_time  ON symptom_logs    (user_id, logged_at DESC);
CREATE INDEX idx_daily_summaries_user    ON daily_summaries (user_id, date DESC);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasting_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE fasting_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own data" ON profiles         FOR ALL USING (auth.uid() = id);
CREATE POLICY "users own data" ON food_logs        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own data" ON fasting_protocols FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own data" ON fasting_logs     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own data" ON cycle_events     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own data" ON cycle_predictions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own data" ON symptom_logs     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own data" ON daily_summaries  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users own data" ON insights         FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE profiles.updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN UP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
