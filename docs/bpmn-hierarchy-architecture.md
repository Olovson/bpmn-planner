# BPMN Hierarchy – Target Architecture & Implementation Plan

## 1. Background

The application lets users upload one or more BPMN files. From these, we need to build a **connected, recursive process hierarchy** where:

- Call Activities in one process link to subprocess definitions in other files.
- We **never** modify the original BPMN XML.
- The resulting hierarchy is the foundation for further features (tests, DMN, documentation, etc.).

The current implementation works for simple cases but is fragile, hard to debug, and does not expose matching decisions or failures to the user.

This document defines:
- The **target architecture** for hierarchy building.
- A **robust matching strategy**.
- **Diagnostics and transparency** requirements.
- A **phased implementation plan**.

---

## 2. Current State & Tech Debt (Reality Check)

Current system behavior and issues:

- Each BPMN file is parsed independently at upload.  
  - Metadata stores a single `processId`/`name`, tasks and callActivities.
  - Multiple `<process>` elements are effectively ignored (first wins).
  - Files without `<process>` produce empty/weak metadata.

- Hierarchy building is split:
  - A **client-side tree** using `bpmn_files.meta` + `bpmn_dependencies`.
  - A **generation path** that uses fuzzy filename matching to link Call Activities to subprocesses.

- Matching relies on **string includes / fuzzy heuristics**:
  - `calledElement` and process IDs are stored but *not* used for matching.
  - First matching file wins; ambiguous matches not detected.

- `bpmn_dependencies`:
  - Write-only.
  - Can become stale if BPMN files are updated.
  - Used on client side without verification.

- Edge handling:
  - Missing match → only `missingDefinition` flag, no diagnostics.
  - Cycles → detected via visited-set and silently pruned.
  - No root detection; user-chosen root may be incorrect.

- Diagnostics are minimal and not surfaced in UI.

---

## 3. Target Data Model

We introduce clear, explicit in-memory models.

### 3.1 ProcessDefinition

Represents a BPMN `<process>` (support multiple processes per file):

```ts
type ProcessDefinition = {
  id: string;
  name: string;
  fileName: string;
  storagePath: string;
  callActivities: CallActivityMeta[];
  tasks: TaskMeta[];
  parseDiagnostics: DiagnosticsEntry[];
};
