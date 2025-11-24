# Jira Naming Update Summary

## Overview

Updated the Jira-mapping logic for BPMN subprocesses (callActivity = feature goals) to use a cleaner, shorter, and more stable naming model based on top-level subprocesses rather than full path-based names.

## Changes Made

### 1. New Utility Function: `src/lib/jiraNaming.ts`

Created a new utility module with the following functions:

- **`buildJiraName(node, rootNode, parentPath?)`**: Main function that builds Jira names according to the new scheme
  - For feature goals (callActivity): Uses top-level subprocess logic
  - For epics (userTask, serviceTask, businessRuleTask): Uses existing path-based naming (excluding root)
  
- **`buildFeatureGoalJiraName(node, rootNode)`**: Implements the new naming rules for feature goals:
  - If N is a top-level subprocess (direct child of root): `<N.label>`
  - If N is deeper: `<T.label> – <N.label>` where T is the top-level subprocess ancestor
  - Root process name is NEVER included

- **Helper functions**: `findTopLevelSubprocess`, `isDirectChildOfRoot`, `findAncestors`, `findParent`, `buildParentPath`

### 2. Updated Files

#### `src/pages/BpmnFileManager.tsx`
- **Location**: `handleBuildHierarchy` function (lines ~1995-2037)
- **Change**: Replaced `buildJiraNameWithPath` with `buildJiraName` from the new utility
- **Impact**: Jira mappings generated during hierarchy building now use the new naming scheme

#### `src/hooks/useAllBpmnNodes.ts`
- **Location**: `fetchAllNodes` function (lines ~140-146)
- **Change**: Replaced path-based `defaultJiraName` calculation with `buildJiraName` from the new utility
- **Impact**: Fallback Jira names (when no mapping exists in database) now use the new naming scheme

### 3. Files Not Updated (Require Separate Handling)

#### `supabase/functions/generate-artifacts/index.ts`
- **Location**: Lines ~265-280
- **Reason**: This is a Deno Edge Function that cannot directly import TypeScript utilities from `src/`
- **Status**: Still uses old path-based naming
- **Action Required**: 
  - Option 1: Port the `buildJiraName` logic to Deno-compatible code within the Edge Function
  - Option 2: Create a shared Deno-compatible module
  - Option 3: Update the Edge Function to use the ProcessTree system (requires broader refactoring)

#### `src/lib/bpmnHierarchy.ts`
- **Location**: Lines ~170, 192, 210, 228
- **Reason**: This appears to be legacy code from an older hierarchy system
- **Status**: Still uses old path-based naming
- **Action Required**: 
  - Determine if this file is still actively used
  - If yes, update to use the new naming scheme
  - If no, consider deprecating/removing

#### `src/lib/llmDocumentation.ts`
- **Location**: `buildJiraNameFromTrail` function (line ~432)
- **Reason**: This function is used for LLM context generation, not actual Jira mappings
- **Status**: Left unchanged (lower priority)
- **Note**: Could be updated for consistency in a future iteration

## New Naming Rules

### For Feature Goals (callActivity)

1. **Root process name is NEVER included** - It's considered implicit context
2. **Top-level subprocess** (direct child of root):
   - Format: `<N.label>`
   - Example: `Application`
3. **Deeper subprocess** (nested under a top-level subprocess):
   - Format: `<T.label> – <N.label>`
   - Where T is the top-level subprocess ancestor
   - Example: `Application – Internal data gathering`

### For Epics (userTask, serviceTask, businessRuleTask)

- **Unchanged**: Continue using existing path-based naming
- **Root process name is excluded** from the path
- Format: `<parent1> - <parent2> - ... - <node.label>`

## Behavior

### Identical Subprocess Labels

Identical subprocess labels under the same root process will resolve to the same Jira feature goal name, regardless of:
- How many times they appear in the tree
- Which path leads to them
- Their position in the hierarchy

This ensures stable, consistent Jira names for feature goals.

### Consistency

The new naming scheme is applied consistently across:
- Database-generated mappings (via `BpmnFileManager.handleBuildHierarchy`)
- Fallback names (via `useAllBpmnNodes`)

## Testing Recommendations

1. **Verify feature goal names**:
   - Check that top-level subprocesses have simple names (no root prefix)
   - Check that nested subprocesses use "Top-level – Nested" format
   - Verify root process name is never included

2. **Verify epic names**:
   - Check that epics still use path-based naming
   - Verify root process name is excluded from paths

3. **Verify consistency**:
   - Same subprocess appearing in multiple places should have the same Jira name
   - Regenerating hierarchy should produce the same names

4. **Edge cases**:
   - Subprocesses with missing parent links
   - Malformed tree structures
   - Empty or null labels

## Migration Notes

- **Existing Jira mappings**: Will be updated when hierarchy is rebuilt via "Bygg/uppdatera hierarki från root"
- **Database consistency**: Old path-based names in `bpmn_element_mappings` will be replaced with new names on next hierarchy build
- **No breaking changes**: The change is backward-compatible at the API level; only the generated names change

## Future Work

1. **Update Edge Function**: Port the new naming logic to `supabase/functions/generate-artifacts/index.ts`
2. **Update legacy code**: Review and update `src/lib/bpmnHierarchy.ts` if still in use
3. **Add tests**: Create unit tests for `buildJiraName` and related functions
4. **Documentation**: Update user-facing documentation to reflect the new naming scheme

