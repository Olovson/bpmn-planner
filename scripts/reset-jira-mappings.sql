-- Script to reset Jira mappings and related generated data
-- This script can be run via Supabase CLI: supabase db execute --file scripts/reset-jira-mappings.sql

-- Delete all Jira mappings (this is what we need for Jira naming reset)
DELETE FROM bpmn_element_mappings WHERE id != '00000000-0000-0000-0000-000000000000';

-- Optionally delete other generated data (uncomment if needed):
-- DELETE FROM bpmn_dependencies WHERE id != '00000000-0000-0000-0000-000000000000';
-- DELETE FROM node_references WHERE id != '00000000-0000-0000-0000-000000000000';
-- DELETE FROM dor_dod_status WHERE id != '00000000-0000-0000-0000-000000000000';
-- DELETE FROM node_test_links WHERE id != '00000000-0000-0000-0000-000000000000';
-- DELETE FROM generation_jobs WHERE id != '00000000-0000-0000-0000-000000000000';
-- DELETE FROM llm_generation_logs WHERE id != '00000000-0000-0000-0000-000000000000';
-- DELETE FROM test_results WHERE id != '00000000-0000-0000-0000-000000000000';

-- Show count of remaining mappings (should be 0 or 1)
SELECT COUNT(*) as remaining_mappings FROM bpmn_element_mappings;












