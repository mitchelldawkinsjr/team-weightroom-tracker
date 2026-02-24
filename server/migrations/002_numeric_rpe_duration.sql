-- Store rpe and duration as NUMERIC for aggregation; empty string becomes NULL
ALTER TABLE sessions
  ALTER COLUMN rpe TYPE NUMERIC USING (CASE WHEN rpe IS NULL OR TRIM(rpe) = '' THEN NULL ELSE rpe::NUMERIC END),
  ALTER COLUMN duration TYPE NUMERIC USING (CASE WHEN duration IS NULL OR TRIM(duration) = '' THEN NULL ELSE duration::NUMERIC END);
