# Codex Batch Override Generation Guide

This guide explains how to use Codex (AI assistant) to batch-generate documentation override content, reusing the exact same prompts and logic as the ChatGPT API path.

## Overview

The batch override generation workflow allows you to:
- Generate override content for multiple nodes at once
- Use the same prompts from `prompts/llm/` that ChatGPT uses
- Maintain consistency between ChatGPT-generated and Codex-generated content
- Fill in TODO placeholders in override files automatically

## Architecture

The solution consists of:

1. **`src/lib/llmDocumentationShared.ts`** - Shared abstraction for:
   - Prompt selection (`getPromptForDocType`)
   - LLM input building (`buildLlmInputPayload`, `buildLlmRequestStructure`)
   - Response mapping (`mapLlmResponseToModel`)

2. **`src/lib/codexBatchOverrideHelper.ts`** - Codex-specific utilities:
   - Finding override files (`findOverrideFiles`)
   - Parsing override file context (`parseOverrideFileContext`)
   - Getting generation instructions (`getCodexGenerationInstructions`)
   - Mapping responses to override format (`mapLlmResponseToOverrides`)

3. **Existing ChatGPT path** - Continues to work as before, now using the shared module internally

## Usage from Codex

### Step 1: Find Override Files

Specify a scope (directory or BPMN file):

```typescript
// Find all override files in a directory
const files = findOverrideFiles('src/data/node-docs/epic');

// Or find all override files for a specific BPMN file
const files = findOverrideFiles('mortgage-se-application.bpmn');
```

### Step 2: Parse Each File

For each file, extract the node context:

```typescript
for (const file of files) {
  const context = parseOverrideFileContext(file.filePath);
  if (!context) continue;
  
  // context contains:
  // - bpmnFile: string
  // - elementId: string
  // - docType: DocumentationDocType
  // - nodeType: string
}
```

### Step 3: Get Generation Instructions

Get the prompt and instructions that Codex should follow:

```typescript
const instructions = getCodexGenerationInstructions(context);

// instructions contains:
// - systemPrompt: string (the same prompt ChatGPT uses)
// - userPrompt: string (simplified with node metadata)
// - docType: DocumentationDocType
// - expectedOutputFormat: string
```

### Step 4: Generate Content

Use Codex to generate content following the prompt instructions:

1. Read the `systemPrompt` - this is the full prompt from `prompts/llm/feature_epic_prompt.md` or `prompts/llm/dmn_businessrule_prompt.md`
2. Use the `userPrompt` as context (contains node metadata)
3. Generate a JSON object matching the model structure (FeatureGoalDocModel, EpicDocModel, or BusinessRuleDocModel)
4. The prompt contains detailed instructions on what each field should contain

### Step 5: Map Response to Overrides

Convert the generated model to override format:

```typescript
// Parse the raw JSON response
const rawResponse = `{ ... }`; // Codex-generated JSON

// Map to model (same logic as ChatGPT path)
const model = mapLlmResponseToModel(context.docType, rawResponse);

// Convert to override format (only includes non-empty fields)
const overrides = mapLlmResponseToOverrides(context.docType, model);
```

### Step 6: Update Override File

Update the `.doc.ts` file:

1. Read the existing file content
2. Replace TODO placeholders with generated content
3. Preserve any non-TODO content that already exists
4. Keep the file structure (imports, exports, NODE CONTEXT comment) intact
5. Write back to file

**Important**: Only fill in fields that are:
- Empty arrays `[]`
- `'TODO'` strings
- Empty strings `''`

Do **not** overwrite fields that already contain meaningful content.

## Example: Batch Fill All Epics in a BPMN File

Here's a complete example workflow:

```
1. Find all epic override files for mortgage-se-application.bpmn:
   const files = findOverrideFiles('mortgage-se-application.bpmn')
     .filter(f => f.docType === 'epic');

2. For each file:
   a. Parse context: const context = parseOverrideFileContext(file.filePath)
   b. Get instructions: const instructions = getCodexGenerationInstructions(context)
   c. Read the systemPrompt and generate JSON following its instructions
   d. Map response: const model = mapLlmResponseToModel('epic', rawJson)
   e. Convert to overrides: const overrides = mapLlmResponseToOverrides('epic', model)
   f. Update the file, replacing TODO placeholders with overrides content
```

## Key Principles

1. **Reuse existing prompts**: Always use `getPromptForDocType()` to get the same prompt ChatGPT uses
2. **Follow prompt structure**: The prompts in `prompts/llm/` contain detailed instructions on what each field should contain
3. **Preserve existing content**: Only fill in TODOs and empty fields
4. **Maintain file structure**: Keep imports, exports, and NODE CONTEXT comments unchanged
5. **Use same mapping logic**: Use `mapLlmResponseToModel()` to parse responses (same as ChatGPT path)

## Integration with Existing Pipeline

The generated overrides integrate seamlessly with the existing pipeline:

```
Base Model (from context)
  → Apply Overrides (from .doc.ts files) ← Your Codex-generated content
  → Apply LLM Patch (if ChatGPT/Ollama active)
  → Render HTML
```

The override files you generate will be automatically loaded and merged when documentation is rendered.

## Notes

- Codex doesn't have access to the full `BpmnProcessGraph`, so it works with node metadata from the override files
- The prompts are designed to work with just node metadata, so this is sufficient
- If you need full process context, you can load BPMN files and build the graph, but it's not required for basic generation
- The helper functions provide guidance, but Codex should work directly with file content for maximum flexibility

