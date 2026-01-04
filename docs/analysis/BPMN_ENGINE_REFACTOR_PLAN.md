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

## Phase 1 – Map & Decide (Must-Do) ✅ Done

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

### Phase 1 – Findings (Summary)

**Main entrypoint:**
- `generateAllFromBpmnWithGraph` is the single exported async function and central orchestrator.

**Rough section tagging inside `generateAllFromBpmnWithGraph`:**
- **Graph construction (pure/graph):**
  - Version-hash loading (via optional `getVersionHashForFile`).
  - `buildBpmnProcessGraph`, `createGraphSummary`, `getTestableNodes`.
  - Uses `buildProcessHierarchy`, `processDefinition` helpers, and flow graph utilities for analysis.
- **Root detection & scope selection (pure/planning):**
  - Loading `bpmn-map` (via dynamic imports of `bpmnMapLoader` / `bpmnMapStorage`).
  - Determining `rootProcessId` / `effectiveRootProcessId`.
  - Deciding `graphFileScope`, `analyzedFiles`, and `sortedAnalyzedFiles` (file order).
- **Node selection & progress (pure + UI/progress):**
  - Filtering nodes by `analyzedFiles`, `nodeFilter`, and graph context into `nodesToGenerate`.
  - Counting total nodes/files (including process/root feature goals) for progress.
  - Reporting progress via `ProgressReporter` callback; DEV-only console logging of progress breakdowns.
- **Per-file / per-node generation (mixed – pure + LLM + storage):**
  - For each file in `sortedAnalyzedFiles`:
    - Determining `nodesInFile` and sort order (pure ordering logic).
    - Building node documentation context (`buildNodeDocumentationContext`).
    - Deciding whether to use LLM or template-based generation.
    - Calling LLM helpers (`generateDocumentationWithLlm`, `generateTestSpecWithLlm`, `renderDocWithLlm`) when enabled.
    - Building final HTML via `generateDocumentationHTML`, `wrapLlmContentAsDocument`, `insertGenerationMeta`.
    - Writing/reading docs/tests via Supabase storage and helpers (`buildDocStoragePaths`, `storageFileExists`, `getDocumentationUrl`).
    - Managing child doc loading (`loadChildDocFromStorage`) and JSON metadata for scenarios/tests.
- **Scenario planning & persistence (storage/DB):**
  - Building planned scenarios from documentation JSON (`buildScenariosFromDocJson`, `buildTestSkeletonScenariosFromDocJson`, `mapProviderToScenarioProvider`, `buildScenariosFromEpicUserStories`).
  - Persisting planned scenarios via `savePlannedScenarios` (DB).
  - Legacy test generation exports (`generateNodeTests`, `generateExportReadyTestFromUserStory`, `generateTestSkeleton`) are re-exported but conceptually separate from the main engine scope.
- **Error handling & logging (UI/progress + infra):**
  - LLM enabled checks (`isLlmEnabled`) and environment validation.
  - Console warnings/errors for missing subprocesses, missing docs, LLM failures, storage failures, and invalid graph situations.
  - Use of LLM monitoring and debug storage (`logLlmFallback`, `saveLlmDebugArtifact`, `CloudLlmAccountInactiveError`).

**Candidate adapter responsibilities inferred from Phase 1:**
- **LLM port (`LlmPort`):**
  - Core operations:
    - Generate documentation content for a node (current `generateDocumentationWithLlm` calls).
    - Generate test specs for a node (current `generateTestSpecWithLlm` calls).
  - Cross-cutting behavior:
    - Provider selection (`getLlmClient`, `getDefaultLlmProvider`).
    - Fallbacks, logging, and debug artifact storage (currently `logLlmFallback`, `saveLlmDebugArtifact`).
- **Generation storage/DB port (`GenerationStoragePort`):**
  - Artifact existence and retrieval:
    - Check if doc/test files exist (via `storageFileExists`, `getDocumentationUrl`, `loadChildDocFromStorage`).
  - Artifact persistence:
    - Store generated documentation HTML and accompanying JSON metadata (using `buildDocStoragePaths` and Supabase Storage).
    - Store generated test artifacts in Storage.
  - Scenario persistence / DB:
    - Persist planned scenarios via `savePlannedScenarios`.
  - Note: Low-level Supabase client usage is localized around these responsibilities and is a prime candidate for extraction.

**Refactor justification:**
- `generateAllFromBpmnWithGraph` currently mixes:
  - Pure graph/ordering logic.
  - LLM orchestration and diagnostics.
  - Storage/DB writes and reads.
  - Progress/UI-style logging and error messaging.
- This confirms that targeted extraction of LLM orchestration and storage/DB interactions (Phases 3–4), preceded by internal simplification (Phase 2), should materially improve separation of concerns and testability.

---

## Phase 2 – Internal Simplification (Time-Boxed) ✅ Done (initial pass)

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

### Phase 2 – Implemented changes (summary)

- Extracted pure helper functions in `src/lib/bpmnGenerators.ts`:
  - `sortFilesForGeneration(graph, analyzedFiles)`:
    - Contains all logic for determining the file traversal order used for generation, including:
      - Root callActivity traversal and sorting via `compareNodesByVisualOrder`.
      - Recursive processing of subprocess callActivities.
      - Safety fallback for files not reached by traversal.
      - DEV-only debug logging of file order and mismatch warnings.
    - `generateAllFromBpmnWithGraph` now calls this helper instead of inlining the logic, making file ordering a clear, reusable seam.
  - `sortNodesForGeneration(nodes, nodeDepthMap)`:
    - Encapsulates node ordering within a file, using:
      - `orderIndex` (primary) and `visualOrderIndex` (secondary).
      - Node type priority (tasks/epics before callActivities before process).
      - Depth (via `nodeDepthMap`) and final alphabetical fallback for determinism.
    - `generateAllFromBpmnWithGraph` now calls this helper for per-file node ordering.
- Imports updated to use `BpmnProcessGraph` and `BpmnProcessNode` types from `bpmnProcessGraph`, keeping helpers strongly typed and clearly “graph-level pure”.

These changes keep the public API unchanged while carving out two key pure seams (file ordering and node ordering) that can be reused by future services and tested in isolation later.

---

## Phase 3 – LLM Service Extraction (Minimum Viable Engine Piece) ✅ Done

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

### Phase 3 – Implemented changes (summary)

- Added `src/lib/engine/services/llmGeneration.ts`:
  - Exposes `LlmGenerationService` with:
    - `getDefaultProvider`, `getClient`.
    - `generateNodeDocumentation` wrapping `generateDocumentationWithLlm`, tracking provider, fallback usage, and JSON payload.
    - `generateNodeTestSpecs` wrapping `generateTestSpecWithLlm`.
  - Centralizes LLM fallback logging and debug artifact saving (best-effort, non-fatal on failure).
- Updated `src/lib/bpmnGenerators.ts`:
  - Instantiates `llmService = createLlmGenerationService()` in `generateAllFromBpmnWithGraph`.
  - Routes epic and business-rule documentation generation through `llmService.generateNodeDocumentation` instead of calling `renderDocWithLlm` directly, while preserving existing JSON handling and child-doc caching behavior.
- Added a basic unit test `tests/unit/engine.llmGenerationService.test.ts` to verify the service can return a default provider and client without touching Supabase or real LLM endpoints.

These changes keep behavior the same while giving a single, testable LLM orchestration entrypoint.

---

## Phase 4 – Storage/DB Service Extraction ✅ Done

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

### Phase 4 – Implemented changes (summary)

- Added `src/lib/engine/services/generationStorage.ts`:
  - Defines `GenerationStorageService` with methods for:
    - Document existence checks (`docExists`) via `buildDocStoragePaths` + `storageFileExists`.
    - Loading existing node documentation (`loadExistingNodeDoc`) via `loadChildDocFromStorage`.
    - Resolving documentation URLs for nodes (`getDocumentationUrlForNode`) using existing path helpers and `getDocumentationUrl`.
    - Persisting planned scenarios via `savePlannedScenarios`.
- Updated `src/lib/bpmnGenerators.ts`:
  - Instantiates `storageService = createGenerationStorageService()` inside `generateAllFromBpmnWithGraph`.
  - Uses `storageService.docExists` instead of `buildDocStoragePaths` + `storageFileExists` directly for leaf-node doc existence checks.
  - Uses `storageService.loadExistingNodeDoc` when validating existing docs for quality before skipping regeneration.
  - Uses `storageService.getDocumentationUrlForNode` to resolve doc URLs for non-callActivity nodes, with fallback to `getDocumentationUrl` to preserve behavior.
  - Uses the service’s `savePlannedScenarios` indirectly via the existing helper, keeping DB interactions centralized.

Supabase is no longer imported directly by `bpmnGenerators.ts` for generation-related checks; these responsibilities now live in the storage service.

---

## Phase 5 – Engine Layer (Façade & Adapters) ✅ Done

**Goal:** Provide a cohesive engine API and adapter types without rewriting everything.

**Location & artifacts:**
- `src/lib/engine/types.ts`:
  - Defines:
    - `GenerationErrorKind` and `GenerationErrorContext`.
    - `GenerationError` class used as a top-level error envelope.
    - `Logger` interface.
    - `EngineAdapters` interface with:
      - `llm: LlmGenerationService`.
      - `storage: GenerationStorageService`.
      - optional `logger`.
- `src/lib/engine/defaultAdapters.ts`:
  - Implements `createDefaultEngineAdapters()`:
    - Instantiates `llm` and `storage` using `createLlmGenerationService` and `createGenerationStorageService`.
    - Provides a simple console-backed `logger`.
- `src/lib/engine/index.ts`:
  - Exposes:
    - `generateAllFromBpmnWithGraphEngine(adapters, ...args)` – façade that delegates to `bpmnGenerators.generateAllFromBpmnWithGraph`.
    - `generateAllFromBpmnWithGraphWithDefaults(...args)` – convenience wrapper that uses `createDefaultEngineAdapters`.

**Compatibility:**
- `src/lib/bpmnGenerators.ts` remains the primary compatibility layer:
  - It now uses `createDefaultEngineAdapters()` to obtain `llm` and `storage` services.
  - External callers can keep importing `generateAllFromBpmnWithGraph` from `bpmnGenerators.ts`, or opt into the engine façade via `src/lib/engine/index.ts`.

**Exit criteria (met):**
- Engine types and façade exist and are used internally by `bpmnGenerators.ts` (via `createDefaultEngineAdapters`).
- No caller migrations are required; the façade is available for new code and tests.

---

## Phase 6 – Error Handling (Top-Level First) ✅ Done

**Goal:** Improve error clarity at the top level without exhaustively rewriting all error handling.

**Approach:**
- Introduced a `GenerationError` class in `src/lib/engine/types.ts`:
  - Fields:
    - `kind` (currently using `'generation'` at the top level).
    - `message`.
    - `cause` (original error).
    - `context` (e.g. `bpmnFileName`, `useHierarchy`, `useLlm`, `generationSourceLabel`).
- Applied at the top boundary of `generateAllFromBpmnWithGraph`:
  - The main body remains wrapped in an internal `try/catch` that:
    - Falls back to the legacy generator when `useHierarchy` is `false`.
    - Rethrows on failure with hierarchy.
  - The catch now rethrows a `GenerationError('generation', ...)` instead of the raw error when hierarchy is enabled.

**Exit criteria (met):**
- The top-level generation entrypoint `generateAllFromBpmnWithGraph` now throws a `GenerationError` envelope on failure (when hierarchy is used), preserving original error as `cause` and including basic context.
- Stack traces and context are preserved via the `cause` field.
- Callers and future UI code can distinguish generation failures via the `kind` field without needing a full taxonomy right away.

---

## Phase 7 – Tests with In-Memory Mocks (Concept Proving) ✅ Done

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

### Phase 7 – Current status

- Added unit tests:
  - `tests/unit/engine.llmGenerationService.test.ts` – validates basic LLM service wiring (default provider + client) without external dependencies.
  - `tests/unit/generateAllFromBpmnWithGraph.error.test.ts` – forces a hierarchical failure and asserts that a `GenerationError('generation', …)` is thrown with proper `cause` and `context`.
  - `tests/unit/engine.facade.test.ts` – uses mocks to verify that the engine façade functions delegate correctly to the core `generateAllFromBpmnWithGraph`, both with explicit adapters and with default adapters.
- These tests rely on in-memory mocks for Supabase, graph building, and LLM behavior, and do not hit real external systems.

---

## Risk Management & Exit Strategy

**Key ideas:**
- All refactor work should happen on a dedicated Git feature branch (e.g. `feature/bpmn-engine-refactor`) so `main` remains stable.
- Phases 1–4 are the “minimum viable” refactor. Later phases (façade, wide caller migration, full error taxonomy) are optional.
- Each phase is independently shippable:
  - After any phase, all tests should pass and the main generation flow should behave as before.
- If Phase 1 reveals that coupling is manageable (or not worth the effort), we can:
  - Stop after Phase 2 (internal simplification only), or
  - Only do the LLM service extraction (Phase 3) and defer everything else.

**Branching and rollback:**
- Base branch: `main` (synced with `origin/main`).
- Working branch: `feature/bpmn-engine-refactor`.
- If a phase turns out poorly, rollback options:
  - Reset or revert within `feature/bpmn-engine-refactor`.
  - Abandon the feature branch and create a new one from `main` if needed.

**Recommended Go/No-Go checkpoints:**
- After Phase 1:
  - Decide if deeper refactor is justified based on actual coupling.
- After Phase 2:
  - Confirm that separation of concerns inside `bpmnGenerators.ts` is noticeably better.
- After Phase 4:
  - Assess whether the added services/adapters materially improve testability and understanding.
  - Only then consider investing in the engine façade and broader adoption.
