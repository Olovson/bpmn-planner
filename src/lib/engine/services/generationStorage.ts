import { supabase } from '@/integrations/supabase/client';
import { storageFileExists, getDocumentationUrl } from '@/lib/artifactUrls';
import { buildDocStoragePaths } from '@/lib/artifactPaths';
import { loadChildDocFromStorage } from '@/lib/bpmnGenerators/docRendering';
import { getNodeDocFileKey } from '@/lib/nodeArtifactPaths';
import type { PlannedScenarioRow } from '@/lib/plannedScenariosHelper';
import { savePlannedScenarios } from '@/lib/plannedScenariosHelper';

export interface GenerationStorageService {
  docExists(options: {
    docFileKey: string;
    generationSourceLabel: string | null;
    provider: 'cloud';
    bpmnFile: string;
    versionHash: string;
  }): Promise<{ exists: boolean; modePath?: string }>;

  loadExistingNodeDoc(options: {
    bpmnFile: string;
    bpmnElementId: string;
    versionHash: string | null;
    generationSourceLabel: string | null;
  }): Promise<
    | {
        summary?: string;
        flowSteps?: string[];
        inputs?: string[];
        outputs?: string[];
        scenarios?: Array<{ id: string; name: string; type: string; outcome: string }>;
      }
    | undefined
  >;

  getDocumentationUrlForNode(options: {
    bpmnFile: string;
    bpmnElementId: string;
    docFileKey: string;
    versionHash: string | null;
    generationSourceLabel: string | null;
  }): Promise<string | null>;

  savePlannedScenarios(rows: PlannedScenarioRow[], source: string): Promise<void>;
}

export function createGenerationStorageService(): GenerationStorageService {
  return {
    async docExists({ docFileKey, generationSourceLabel, provider, bpmnFile, versionHash }) {
      const pathResult = buildDocStoragePaths(
        docFileKey,
        generationSourceLabel?.includes('slow') ? 'slow' : null,
        provider,
        bpmnFile,
        versionHash,
      );
      const modePath = pathResult.modePath;
      const exists = await storageFileExists(modePath);
      return { exists, modePath };
    },

    async loadExistingNodeDoc({ bpmnFile, bpmnElementId, versionHash, generationSourceLabel }) {
      const docFileKey = getNodeDocFileKey(bpmnFile, bpmnElementId);
      return loadChildDocFromStorage(
        bpmnFile,
        bpmnElementId,
        docFileKey,
        versionHash,
        generationSourceLabel ?? undefined,
      );
    },

    async getDocumentationUrlForNode({
      bpmnFile,
      bpmnElementId,
      docFileKey,
      versionHash,
      generationSourceLabel,
    }) {
      if (!versionHash) {
        return null;
      }
      const paths = buildDocStoragePaths(
        docFileKey,
        generationSourceLabel?.includes('slow') ? 'slow' : null,
        'cloud',
        bpmnFile,
        versionHash,
      );
      return getDocumentationUrl(paths.modePath);
    },

    async savePlannedScenarios(rows, source) {
      await savePlannedScenarios(rows, source);
    },
  };
}

