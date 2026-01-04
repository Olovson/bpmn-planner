# Analysis: `npm run start:dev` Issues After Clone & Docker Cleanup

## Overview
The `start:dev` script (`scripts/start-dev.mjs`) orchestrates three services:
1. **Supabase** (local database via Docker)
2. **Edge Functions** (Supabase functions)
3. **Vite Dev Server** (frontend)

## Identified Problems

### 1. ❌ Missing `.env.local` File
**Problem**: The application requires environment variables that are typically in `.env.local` (gitignored).

**Required Variables** (based on code analysis):
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase>
```

**Impact**: 
- `check-db-schema.mjs` fails (lines 24-32)
- Edge functions can't connect
- Frontend can't connect to Supabase

**Solution**: Create `.env.local` after Supabase starts (see below).

---

### 2. ❌ Docker Containers Deleted
**Problem**: You deleted everything in Docker, so Supabase containers are gone.

**Impact**: 
- `supabase start` command will need to pull images and recreate containers
- Database is empty (no migrations applied)
- All data is lost

**Solution**: Run `supabase start` to recreate containers.

---

### 3. ❌ Database Migrations Not Applied
**Problem**: After Docker cleanup, the database is empty. Migrations in `supabase/migrations/` need to be run.

**Impact**:
- Schema check fails (expects `generation_jobs.mode` and `node_test_links.mode` columns)
- Application can't function without proper schema

**Solution**: Run `supabase db reset` to apply all migrations.

---

### 4. ❌ Missing `supabase/.env` for Edge Functions
**Problem**: The `start-dev.mjs` script tries to load `supabase/.env` for edge functions (line 150).

**Impact**: Edge functions may fail to start or have missing environment variables.

**Solution**: Create `supabase/.env` if edge functions need specific env vars.

---

### 5. ⚠️ Supabase CLI Not Installed or Not in PATH
**Problem**: Scripts use `supabase` CLI commands. If not installed, everything fails.

**Check**: Run `which supabase` or `supabase --version`

**Solution**: Install Supabase CLI if missing:
```bash
# macOS
brew install supabase/tap/supabase
```

---

### 6. ⚠️ Node Modules May Be Outdated
**Problem**: After cloning, dependencies might not match the original project.

**Solution**: Run `npm install` to ensure all dependencies are installed.

---

## Step-by-Step Recovery Process

### Step 1: Install Dependencies
```bash
cd /Users/magnusolovson/conductor/workspaces/bpmn-planner/cairo
npm install
```

### Step 2: Verify Supabase CLI
```bash
supabase --version
# If not installed: brew install supabase/tap/supabase
```

### Step 3: Start Supabase (Recreates Docker Containers)
```bash
supabase start
```
**Note**: This will:
- Pull Docker images (first time takes a few minutes)
- Create containers
- Start all Supabase services
- Generate local credentials

### Step 4: Get Supabase Credentials
After `supabase start` completes, run:
```bash
supabase status
```

This outputs something like:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbGc...
service_role key: eyJhbGc...
```

### Step 5: Create `.env.local`
Create `.env.local` in the project root with:
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key-from-step-4>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-step-4>
```

### Step 6: Reset Database (Apply Migrations)
```bash
supabase db reset
```
This applies all migrations in `supabase/migrations/`.

### Step 7: Verify Schema
```bash
npm run check:db-schema
```
Should pass if migrations were applied correctly.

### Step 8: Create Edge Functions Env (if needed)
If edge functions need environment variables, create `supabase/.env`:
```bash
# Example - check edge function code for required vars
ANTHROPIC_API_KEY=your-key-if-needed
```

### Step 9: Start Dev Environment
```bash
npm run start:dev
```

---

## Quick Recovery Script

You can run these commands in sequence:

```bash
cd /Users/magnusolovson/conductor/workspaces/bpmn-planner/cairo

# 1. Install deps
npm install

# 2. Start Supabase (will recreate containers)
supabase start

# 3. Get credentials and create .env.local manually
# (supabase status shows the keys)

# 4. Reset database
supabase db reset

# 5. Verify
npm run check:db-schema

# 6. Start dev
npm run start:dev
```

---

## Expected Behavior After Fix

When `npm run start:dev` works correctly, you should see:
1. ✅ Supabase containers started
2. ✅ Schema verified
3. ✅ Edge functions responding
4. ✅ Dev server ready at http://localhost:8080

---

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `VITE_SUPABASE_URL eller VITE_SUPABASE_PUBLISHABLE_KEY saknas` | Missing `.env.local` | Create `.env.local` with credentials |
| `Kan inte ansluta till Supabase` | Supabase not running | Run `supabase start` |
| `Schema-validering misslyckades` | Migrations not applied | Run `supabase db reset` |
| `command not found: supabase` | CLI not installed | `brew install supabase/tap/supabase` |
| `fetch failed` | Connection error | Check Docker is running, restart Supabase |

---

## Files That Should Exist

After proper setup:
- ✅ `.env.local` (root) - Contains Supabase credentials
- ✅ `supabase/.env` (optional) - Edge function env vars
- ✅ Docker containers running (check with `docker ps`)
- ✅ `node_modules/` - Dependencies installed

---

## Notes

- The original project location was `/Users/magnusolovson/Documents/Projects/bpmn-planner`
- Current location is `/Users/magnusolovson/conductor/workspaces/bpmn-planner/cairo`
- If you have the original `.env.local`, you can copy it, but the Supabase local instance will generate new keys on first start
- The `start:dev` script automatically starts Supabase if not running, but after Docker cleanup, you may need to run `supabase start` manually first

