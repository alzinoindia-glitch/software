-- ==============================================================================
-- ALZINO ERP — Multi-Device & Cross-Login Realtime Cloud Sync Schema
-- Run this script in your Supabase Dashboard: SQL Editor -> New query -> Run
-- ==============================================================================

-- 1. Create the sync store table
CREATE TABLE IF NOT EXISTS public.alzino_erp_sync (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT 'admin'
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.alzino_erp_sync ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow read & write access for authenticated & anonymous shop users using Anon Key
DROP POLICY IF EXISTS "Allow public read-write for ALZINO ERP" ON public.alzino_erp_sync;
CREATE POLICY "Allow public read-write for ALZINO ERP" 
ON public.alzino_erp_sync 
FOR ALL 
TO anon, authenticated
USING (true) 
WITH CHECK (true);

-- 4. Enable Realtime Broadcast so all desktops, phones & staff tablets sync live without refreshing
ALTER PUBLICATION supabase_realtime ADD TABLE public.alzino_erp_sync;

-- 5. Add index on key for sub-millisecond retrieval
CREATE INDEX IF NOT EXISTS idx_alzino_erp_sync_key ON public.alzino_erp_sync(key);
