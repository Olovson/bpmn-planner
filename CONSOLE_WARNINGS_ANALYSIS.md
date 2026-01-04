# Analysis: Console Warnings & Errors

## Summary

You're seeing two categories of issues:

1. **Missing BPMN Files** (6 warnings) - Files referenced in `bpmn-map.json` don't exist in the database
2. **LLM Not Enabled** (1 error) - Documentation generation requires LLM but it's disabled

---

## Issue 1: Missing BPMN Files

### Problem

The `bpmn-map.json` file references 6 BPMN files that don't exist in the `bpmn_files` database table:

1. `mortgage-se-document-generation.bpmn`
2. `mortgage-se-stakeholder.bpmn`
3. `mortgage-se-object.bpmn`
4. `mortgage-se-household.bpmn`
5. `mortgage-se-appeal.bpmn`
6. `mortgage-se-manual-credit-evaluation.bpmn`

### Root Cause

When the database was reset (`supabase db reset`), the BPMN files weren't automatically seeded. The `bpmn-map.json` file (which is a static configuration file) still references these files, but they don't exist in the database.

### Impact

- **Call Activities** that reference these subprocesses show `missingDefinition=true`
- The process graph can't properly resolve subprocess links
- Documentation generation may be incomplete for processes that depend on these subprocesses

### How It Works

1. `buildBpmnProcessGraph()` loads `bpmn-map.json` to find subprocess mappings
2. It checks if referenced files exist in `existingBpmnFiles` (from database query)
3. If a file is missing, it sets `subprocessFile = undefined` and logs a warning
4. The call activity gets `missingDefinition=true` flag

**Code Location**: `src/lib/bpmnProcessGraph.ts:390-505`

### Solutions

#### Option A: Upload Missing Files (Recommended)
If you have the BPMN files, upload them to the database:

```bash
# Check what files are in the database
npm run check:db-schema  # or check in the UI

# Upload files via the UI at http://localhost:8080
# Or use a script if available
```

#### Option B: Update bpmn-map.json
If these files don't exist or aren't needed, remove them from `bpmn-map.json`:

```json
// Remove entries for non-existent files from the "processes" array
```

#### Option C: Seed BPMN Files
If there's a seed script, run it:

```bash
# Check if there's a seed script
npm run | grep -i seed
```

---

## Issue 2: LLM Not Enabled

### Problem

Documentation generation requires LLM but it's disabled. The error occurs when trying to generate documentation.

### Root Cause

The `.env.local` file is missing LLM configuration:
- `VITE_USE_LLM=true` is not set
- `VITE_ANTHROPIC_API_KEY` is not set

### Impact

- **Documentation generation fails** with the error you see
- LLM-powered features are disabled
- The app falls back to local-only generation (if available)

### How It Works

1. `generateAllFromBpmnWithGraph()` checks if `useLlm` is true
2. If true, it calls `isLlmEnabled()` from `src/lib/llmClient.ts`
3. `isLlmEnabled()` checks:
   - `VITE_USE_LLM === 'true'` (string comparison)
   - `VITE_ANTHROPIC_API_KEY` exists
   - Not in test mode (unless `VITE_ALLOW_LLM_IN_TESTS=true`)
4. If any check fails, it throws the error

**Code Location**: 
- `src/lib/bpmnGenerators.ts:181-186`
- `src/lib/llmClient.ts:16-31`

### Solutions

#### Option A: Enable LLM (If You Have API Key)
Add to `.env.local`:

```bash
VITE_USE_LLM=true
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

Then restart the dev server.

#### Option B: Disable LLM Features
If you don't want to use LLM, ensure `useLlm=false` when calling generation functions, or the code should handle this gracefully.

**Note**: The error suggests LLM is required for documentation generation, so you may need to either:
1. Enable LLM with an API key
2. Use a different generation mode that doesn't require LLM
3. Skip documentation generation for now

---

## Recommended Actions

### Immediate Fixes

1. **Check what BPMN files exist in database:**
   ```bash
   # Via Supabase Studio: http://127.0.0.1:54323
   # Or check the UI at http://localhost:8080
   ```

2. **For LLM issue, choose one:**
   - **If you have Anthropic API key**: Add to `.env.local` and restart
   - **If you don't**: The warnings are informational - the app should work without LLM for non-documentation features

### Long-term Fixes

1. **Create a seed script** to populate BPMN files after database reset
2. **Update bpmn-map.json** to only reference files that exist
3. **Add validation** to warn when bpmn-map.json references missing files

---

## Code References

- Missing file warnings: `src/lib/bpmnProcessGraph.ts:395-400, 500-505`
- LLM check: `src/lib/bpmnGenerators.ts:181-186`
- LLM enabled check: `src/lib/llmClient.ts:16-31`
- BPMN files query: `src/hooks/useBpmnFiles.ts:24-36`
- BPMN map loading: `src/lib/bpmn/bpmnMapStorage.ts` (referenced in bpmnProcessGraph.ts:74)

---

## Severity Assessment

| Issue | Severity | Impact | Action Required |
|-------|----------|--------|-----------------|
| Missing BPMN files | **Medium** | Process graph incomplete, subprocess links broken | Upload files or update bpmn-map.json |
| LLM not enabled | **High** (if generating docs) | Documentation generation fails | Add API key or disable LLM features |

---

## Next Steps

1. ✅ Check which BPMN files are actually in the database
2. ✅ Decide if you need LLM features (if yes, add API key)
3. ✅ Upload missing BPMN files or update bpmn-map.json
4. ✅ Restart dev server after .env.local changes

