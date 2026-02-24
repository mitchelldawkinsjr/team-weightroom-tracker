-- Teams (team code is the main key used by the app)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athletes (roster members; coaches are not athletes)
CREATE TABLE IF NOT EXISTS athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  grade TEXT,
  jersey_number TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_athletes_team ON athletes(team_id);

-- Users (identity: athlete or coach; one per login profile)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'coach')),
  athlete_id UUID REFERENCES athletes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions (one per workout session)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  date DATE NOT NULL,
  phase INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lift', 'speed')),
  rpe TEXT,
  duration TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  complete BOOLEAN DEFAULT FALSE,
  checkin_json JSONB,
  checkin_recommendations JSONB,
  UNIQUE(team_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_team_athlete_date ON sessions(team_id, athlete_id, date DESC);

-- Session exercises (template + runtime data)
CREATE TABLE IF NOT EXISTS session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  tempo TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Individual sets within an exercise
CREATE TABLE IF NOT EXISTS session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  weight TEXT,
  reps TEXT,
  done BOOLEAN DEFAULT FALSE,
  UNIQUE(exercise_id, set_index)
);

-- Daily attendance (computed from session workout evidence)
CREATE TABLE IF NOT EXISTS daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'checkin_only')),
  evidence_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, athlete_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_attendance_team_date ON daily_attendance(team_id, date);
