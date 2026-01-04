# BPMN Engine Refactor – Incremental Plan

This document captures the current plan for refactoring the BPMN “engine” so we can safely resume if work is interrupted.

## Scope

- Focus: BPMN parsing → process graph → generation orchestration (documentation + test artifacts).
- Explicitly out of scope (for now):
  - DMN-specific logic.
  - Supabase schema evolution/migrations.
  - UI concerns (routes, components, visualizations).
  - Test-runner orchestration and CI wiring.

The goal is better separation of concerns and testability around the core generation pipeline, not a full architectural rewrite.

---

## Phase 1 – Map & Decide (Must-Do)

**Time-box:** ~1 day.

**Goal:** Understand real coupling inside `src/lib/bpmnGenerators.ts` before committing to deeper refactors.

**Steps:**
- Walk through `src/lib/bpmnGenerators.ts` and tag each major function/section as one of:
  - `pure` (only uses parsing/graph/helpers, no IO).
  - `LLM` (calls `generateDocumentationWithLlm`, `generateTestSpecWithLlm`, LLM monitoring/logging).
  - `storage/DB` (Supabase Storage or DB reads/writes).
  - `UI/progress` (progress updates, human-oriented logging).
- Produce a short summary (can be inline comments or a separate note) of:
  - 3–5 “hot spots” where concerns are clearly mixed.
  - Which operations would need a storage adapter and which would need an LLM adapter.

**Exit criteria:**
- Every major function/section in `bpmnGenerators.ts` is tagged.
- We can point to specific parts of the file where separation of concerns would give the most benefit.
- A decision can be made whether deeper refactoring is justified right now.

---

## Phase 2 – Internal Simplification (Time-Boxed)

**Time-box:** Max 2 days.

**Goal:** Create genuine separation of concerns *inside* `bpmnGenerators.ts` without introducing an external engine façade yet.

**Principles:**
- No public API changes.
- No new engine folder yet.
- Focus only on the highest-value seams identified in Phase 1.

**Targets for extraction:**
- Node/file ordering and selection logic (pure).
- Progress/counting logic for generation (how we compute totals, per-type counts, file-level docs).
- Per-node generation steps: “given a node + context → generation intent” (what to generate, not how to store or call LLM).

**What “done enough” looks like:**
- `bpmnGenerators.ts` is clearly structured into ~3 coherent areas or helper modules with single responsibilities, even if the file is still large.
- The most tangled sections have been split so that:
  - Pure logic is isolated from LLM calls.
  - Storage/DB interactions are grouped rather than scattered.

**Exit criteria:**
- Internal helpers extracted for the main seams (ordering, progress, per-node generation).
- No behavior changes; existing tests and flows still pass.
- We have clear boundaries that future services/adapters can plug into.

---

## Phase 3 – LLM Service Extraction (Minimum Viable Engine Piece)

**Goal:** Centralize LLM orchestration behind a small, provider-agnostic port.

**Location:**
- Create `src/lib/engine/services/llmGeneration.ts` (or similar).
- Important: One-way dependency – this service must not import `bpmnGenerators.ts`. `bpmnGenerators.ts` calls the service, not the other way around.

**Design notes:**
- Let the Phase 1 analysis drive the `LlmPort` interface:
  - Start minimal: “call LLM with mode/profile + prompt + options → structured result/error”.
  - Provider selection (ChatGPT/Claude/Ollama) and profiles remain in existing LLM modules; the port just wraps them.
- Move LLM-specific cross-cutting concerns into this service:
  - Fallback behavior.
  - Monitoring / logging integration.
  - Debug artifact storage (where applicable).

**Implementation steps:**
- Implement `llmGenerationService` with a small `LlmPort`.
- Update `bpmnGenerators.ts` so all LLM calls go through this service.

**Exit criteria:**
- 100% of LLM calls in the generation pipeline go through `llmGenerationService`.
- A handful of unit tests exist for this service (can use simple fixed-response mocks).
- No change in externally visible behavior.

---

## Phase 4 – Storage/DB Service Extraction

**Goal:** Centralize Supabase Storage/DB usage for generation into a dedicated service and port.

**Location:**
- Create `src/lib/engine/services/generationStorage.ts`.
- Again, one-way dependency: this service should not import `bpmnGenerators.ts`.

**Design notes:**
- Define a small `GenerationStoragePort` based on Phase 1 tags, for example:
  - Artifact existence checks.
  - Writing documentation/test artifacts.
  - Recording generation jobs / planned scenarios.
- Keep path and naming logic in existing helpers (`artifactPaths.ts`, `nodeArtifactPaths.ts`); the service just orchestrates IO.

**Implementation steps:**
- Implement `generationStorageService` using the current Supabase client.
- Replace direct Supabase calls in `bpmnGenerators.ts` with calls to the storage service.

**Exit criteria:**
- `bpmnGenerators.ts` no longer imports or directly calls Supabase clients for generation; it uses the storage service instead.
- Existing behavior (artifact locations, naming, job records) remains unchanged.

---

## Phase 5 – Optional Engine Layer (Façade & Adapters)

This phase is optional and should only be pursued if Phases 1–4 clearly improve clarity/testability and feel worth building upon.

**Goal:** Provide a cohesive engine API and adapter types without rewriting everything.

**Location & artifacts:**
- `src/lib/engine/types.ts`:
  - Define `EngineAdapters` based on actual ports from Phases 3–4, e.g.:
    - `storage: GenerationStoragePort`.
    - `llm: LlmPort`.
    - `logger: Logger`.
    - Optional `clock` and `idGenerator` only if a concrete need is discovered.
- `src/lib/engine/index.ts`:
  - High-level functions such as:
    - `generateAllFromBpmnWithGraph(ctx, input, options)`.
  - Wire: `parseBpmnFile` → `buildBpmnProcessGraph` → internal planning → LLM + storage services.
- `src/lib/engine/defaultAdapters.ts`:
  - Wrap real Supabase + LLM clients + console logger into default production adapters.

**Compatibility:**
- Keep `src/lib/bpmnGenerators.ts` as the compatibility layer:
  - Its public entrypoints delegate to engine functions.
  - External imports do not have to change immediately.

**Exit criteria:**
- Engine types and façade exist and are used internally by `bpmnGenerators.ts`.
- No mandatory migrations for callers; further adoption can be incremental.

---

## Phase 6 – Error Handling (Top-Level First)

**Goal:** Improve error clarity at the top level without exhaustively rewriting all error handling.

**Approach:**
- Introduce a small error envelope for generation entrypoints, e.g.:
  - A `GenerationError` type with:
    - `kind` (e.g. `'parse' | 'graph' | 'generation' | 'storage' | 'llm' | 'validation'`).
    - `message`.
    - `cause` (original error) to preserve stack traces.
    - Optional `context` (file name, node id, mode, etc.).
- At first, only wrap errors at the top boundary:
  - Let deeper functions throw as they do today.
  - Map them into `GenerationError` at the outermost layer where UI or higher-level callers interact.

**Exit criteria:**
- Top-level generation entrypoint(s) consistently return/throw `GenerationError` (or a similar envelope) instead of raw errors.
- Stack traces and important context are preserved.
- UI and logs can distinguish at least a few high-level error kinds without needing a full taxonomy.

---

## Phase 7 – Tests with In-Memory Mocks (Concept Proving)

**Constraints:**
- No separate Supabase test project yet; avoid tests that hit real Supabase or real LLMs.

**Goal:** Prove that the service/adapter approach is testable using in-memory mocks.

**Steps:**
- After Phase 1, add a single example test that exercises a small end-to-end slice through:
  - A simple in-memory storage mock:
    - Backed by `Map<string, string>` for “files”.
    - Minimal behavior: write, read, existence check.
  - A simple LLM mock:
    - Fixed responses for known prompts/modes.
    - Enough to validate that orchestration logic is correct.
- As services (Phases 3–4) become available, add a few more unit tests around them, keeping everything in-process and in-memory.

**Exit criteria:**
- At least one example test demonstrates how to run the core pipeline with mocked adapters.
- The pattern is documented and can be replicated later as test infrastructure improves.

---

## Risk Management & Exit Strategy

**Key ideas:**
- Phases 1–4 are the “minimum viable” refactor. Later phases (façade, wide caller migration, full error taxonomy) are optional.
- Each phase is independently shippable:
  - After any phase, all tests should pass and the main generation flow should behave as before.
- If Phase 1 reveals that coupling is manageable (or not worth the effort), we can:
  - Stop after Phase 2 (internal simplification only), or
  - Only do the LLM service extraction (Phase 3) and defer everything else.

**Recommended Go/No-Go checkpoints:**
- After Phase 1:
  - Decide if deeper refactor is justified based on actual coupling.
- After Phase 2:
  - Confirm that separation of concerns inside `bpmnGenerators.ts` is noticeably better.
- After Phase 4:
  - Assess whether the added services/adapters materially improve testability and understanding.
  - Only then consider investing in the engine façade and broader adoption.

