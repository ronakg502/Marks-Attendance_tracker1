-- ============================================================
-- FIXED Migration — Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- 
-- NOTE: RLS is NOT enabled because the server uses the
-- publishable/anon key (same as other tables in this project).
-- ============================================================

-- 1. MARK COMPONENTS TABLE
CREATE TABLE IF NOT EXISTS mark_components (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID REFERENCES subjects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  name        TEXT NOT NULL,
  max_marks   INTEGER NOT NULL CHECK (max_marks > 0),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. MARK ENTRIES TABLE
CREATE TABLE IF NOT EXISTS mark_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id  UUID REFERENCES mark_components(id) ON DELETE CASCADE,
  subject_id    UUID REFERENCES subjects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  obtained      INTEGER CHECK (obtained >= 0),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (component_id, user_id)
);
