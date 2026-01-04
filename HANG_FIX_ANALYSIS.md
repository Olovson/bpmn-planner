# Fix: Generation Hanging on Missing BPMN Files

## Problem

When generating documentation with only 3 files uploaded (mortgage, application, internal-data-gathering), the generation process was hanging instead of skipping missing files referenced in `bpmn-map.json`.

## Root Cause

1. **Missing Error Handling**: `parseAllBpmnFiles()` in `bpmnProcessGraph.ts` didn't catch "File not found" errors from `parseBpmnFile()`, which throws when files don't exist.

2. **No Fetch Timeout**: The `fetch()` call in `bpmnParser.ts` had no timeout, so if a file didn't exist, it could hang indefinitely waiting for a response.

3. **Incomplete Error Detection**: The error check only looked for "Failed to load", "400", and "Bad Request", but `parseBpmnFile()` throws "File not found: ..." which wasn't being caught.

## Solution

### Fix 1: Enhanced Error Handling in `parseAllBpmnFiles`

**File**: `src/lib/bpmnProcessGraph.ts`

- Added "File not found" to the error detection pattern
- Added explicit handling for all missing files (not just test files)
- Ensures the loop continues even when files are missing

**Changes**:
```typescript
const isMissingFile = error instanceof Error && 
  (error.message.includes('Failed to load') || 
   error.message.includes('400') ||
   error.message.includes('Bad Request') ||
   error.message.includes('File not found')); // ✅ Added

// ✅ Added explicit handling for all missing files
else if (isMissingFile) {
  if (import.meta.env.DEV) {
    console.warn(`[bpmnProcessGraph] File ${file} not found in Storage, skipping`);
  }
}
```

### Fix 2: Fetch Timeout

**File**: `src/lib/bpmnParser.ts`

- Added 10-second timeout to `fetch()` calls
- Uses `AbortController` to cancel hanging requests
- Falls back to Storage if fetch times out or fails

**Changes**:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(fileUrl, { 
    cache: 'no-store',
    signal: controller.signal 
  });
  // ... handle response
} catch (fetchError) {
  // Handle timeout/abort gracefully
}
```

## Expected Behavior After Fix

1. ✅ Missing files are detected and skipped gracefully
2. ✅ Generation continues for files that exist
3. ✅ No hanging on missing files (10s timeout prevents infinite waits)
4. ✅ Warnings logged in dev mode for missing files
5. ✅ Feature Goals generated only for existing files

## Testing

After restarting the dev server, try generating documentation again. You should see:

- Warnings for missing files (in dev mode): `[bpmnProcessGraph] File X not found in Storage, skipping`
- Generation completes successfully for the 3 uploaded files
- No hanging or infinite waits

## Related Issues

- Missing files referenced in `bpmn-map.json` are now handled gracefully
- The system was already designed to skip callActivities with `missingDefinition=true` (lines 361-370 in `bpmnGenerators.ts`)
- This fix ensures the graph building phase also handles missing files correctly

