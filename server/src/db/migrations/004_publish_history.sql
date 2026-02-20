-- Migration 004: Publish History Table
-- NOTE: This migration is DEPRECATED and kept for historical compatibility only.
-- The publish_history table is already created in 001_initial.sql with a different schema.
-- The enhanced version with additional columns is in 005_scheduler.sql.
-- This file intentionally does nothing to avoid conflicts.

-- Add a comment to document this
COMMENT ON TABLE publish_history IS 'Publish history table - created in 001_initial.sql, enhanced in 005_scheduler.sql';
