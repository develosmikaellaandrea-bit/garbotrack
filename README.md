https://sg.docworkspace.com/d/sAHx02PWemZ3OArH8spm_pxQ
[File]Final-Paper-AMEN-LORD (AutoRecovered)_022248.docx
https://sg.docworkspace.com/d/sAHfpJ3KemZ3OAo-RtZm_pxQ
-- Full Supabase SQL schema for GarboTrack (with reports table)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE,
  role text NOT NULL CHECK (role IN ('resident','collector')),
  barangay text NOT NULL,
  phone text,
  sharing boolean DEFAULT false,
  lat double precision,
  lng double precision,
  created_at timestamptz DEFAULT now()
);
-- requests table
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES users(id) ON DELETE CASCADE,
  barangay text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','collected','cancelled')),
  created_at timestamptz DEFAULT now()
);
-- schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id uuid REFERENCES users(id) ON DELETE SET NULL,
  barangay text NOT NULL,
  schedule_time timestamptz NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  accepted_residents uuid[] DEFAULT '{}',
  remarks text,
  created_at timestamptz DEFAULT now()
);
-- reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES users(id) ON DELETE SET NULL,
  barangay text NOT NULL,
  message text NOT NULL,
  related_schedule_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  created_at timestamptz DEFAULT now()
);
