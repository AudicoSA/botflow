-- Migration 010: Fix RLS Infinite Recursion
-- The organization_members RLS policy creates circular references when used in bot_integrations policies
-- Solution: Use SECURITY DEFINER functions to break the cycle
-- Created: 2026-01-18

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own bot integrations" ON bot_integrations;
DROP POLICY IF EXISTS "Users can insert bot integrations for their bots" ON bot_integrations;
DROP POLICY IF EXISTS "Users can update their own bot integrations" ON bot_integrations;
DROP POLICY IF EXISTS "Users can delete their own bot integrations" ON bot_integrations;
DROP POLICY IF EXISTS "Users can view their own integration logs" ON integration_logs;

-- Create a SECURITY DEFINER function to check organization membership
-- This runs with elevated privileges and avoids RLS recursion
CREATE OR REPLACE FUNCTION public.user_has_bot_access(p_bot_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_has_access BOOLEAN;
BEGIN
  -- Get the organization_id for this bot
  SELECT organization_id INTO v_org_id
  FROM bots
  WHERE id = p_bot_id;

  IF v_org_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is a member of this organization
  SELECT EXISTS(
    SELECT 1 FROM organization_members
    WHERE organization_id = v_org_id
    AND user_id = auth.uid()
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$;

-- Create new policies using the SECURITY DEFINER function
CREATE POLICY "Users can view their own bot integrations"
  ON bot_integrations FOR SELECT
  USING (public.user_has_bot_access(bot_id));

CREATE POLICY "Users can insert bot integrations for their bots"
  ON bot_integrations FOR INSERT
  WITH CHECK (public.user_has_bot_access(bot_id));

CREATE POLICY "Users can update their own bot integrations"
  ON bot_integrations FOR UPDATE
  USING (public.user_has_bot_access(bot_id));

CREATE POLICY "Users can delete their own bot integrations"
  ON bot_integrations FOR DELETE
  USING (public.user_has_bot_access(bot_id));

-- Fix integration_logs policy similarly
CREATE OR REPLACE FUNCTION public.user_has_bot_integration_access(p_bot_integration_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_id TEXT;
BEGIN
  SELECT bot_id INTO v_bot_id
  FROM bot_integrations
  WHERE id = p_bot_integration_id;

  IF v_bot_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.user_has_bot_access(v_bot_id);
END;
$$;

CREATE POLICY "Users can view their own integration logs"
  ON integration_logs FOR SELECT
  USING (public.user_has_bot_integration_access(bot_integration_id));

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_bot_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_bot_integration_access(UUID) TO authenticated;

-- Also create an increment_sync_count function if it doesn't exist
CREATE OR REPLACE FUNCTION public.increment_sync_count(row_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE bot_integrations
  SET sync_count = COALESCE(sync_count, 0) + 1
  WHERE id = row_id
  RETURNING sync_count INTO new_count;

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_sync_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_sync_count(UUID) TO service_role;

COMMENT ON FUNCTION public.user_has_bot_access(TEXT) IS 'SECURITY DEFINER function to check if the current user has access to a bot via organization membership. Avoids RLS recursion.';
COMMENT ON FUNCTION public.user_has_bot_integration_access(UUID) IS 'SECURITY DEFINER function to check if the current user has access to a bot integration. Avoids RLS recursion.';
COMMENT ON FUNCTION public.increment_sync_count(UUID) IS 'Atomically increments the sync_count for a bot integration.';
