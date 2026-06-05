CREATE TABLE IF NOT EXISTS team_program (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  phases JSONB NOT NULL DEFAULT '[]',
  lift_templates JSONB NOT NULL DEFAULT '{}',
  speed_templates JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
