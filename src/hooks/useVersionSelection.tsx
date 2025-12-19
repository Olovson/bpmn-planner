/**
 * Hook for managing BPMN file version selection across the app
 * Provides a global context for which version of BPMN files to use
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import { getAllVersions, getCurrentVersion, getVersionByHash, type BpmnFileVersion } from '@/lib/bpmnVersioning';

interface VersionSelection {
  selectedVersionHash: string | null;
  selectedFileName: string | null;
}

interface VersionSelectionContextType {
  selection: VersionSelection;
  setSelection: (selection: VersionSelection) => void;
  getVersionHashForFile: (fileName: string) => Promise<string | null>;
  getVersionForFile: (fileName: string) => Promise<BpmnFileVersion | null>;
  isUsingSpecificVersion: () => boolean;
  getSelectedVersionInfo: () => Promise<{ fileName: string | null; versionNumber: number | null; isCurrent: boolean } | null>;
}

const VersionSelectionContext = createContext<VersionSelectionContextType | undefined>(undefined);

export function VersionSelectionProvider({ children }: { children: ReactNode }) {
  // Load from localStorage on mount
  const [selection, setSelectionState] = useState<VersionSelection>(() => {
    try {
      const stored = localStorage.getItem('selectedBpmnVersion');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          selectedVersionHash: parsed.versionHash || null,
          selectedFileName: parsed.fileName || null,
        };
      }
    } catch (e) {
      console.warn('[VersionSelection] Failed to load from localStorage:', e);
    }
    return {
      selectedVersionHash: null,
      selectedFileName: null,
    };
  });

  // Save to localStorage when selection changes
  const setSelection = (newSelection: VersionSelection) => {
    setSelectionState(newSelection);
    if (newSelection.selectedVersionHash && newSelection.selectedFileName) {
      localStorage.setItem('selectedBpmnVersion', JSON.stringify({
        versionHash: newSelection.selectedVersionHash,
        fileName: newSelection.selectedFileName,
      }));
    } else {
      localStorage.removeItem('selectedBpmnVersion');
    }
  };

  // Get version hash for a specific file based on current selection
  const getVersionHashForFile = async (fileName: string): Promise<string | null> => {
    // If we have a specific version selected for this file, use it
    if (selection.selectedFileName === fileName && selection.selectedVersionHash) {
      return selection.selectedVersionHash;
    }
    // Otherwise, use current version
    const currentVersion = await getCurrentVersion(fileName);
    return currentVersion?.content_hash || null;
  };

  // Get full version object for a file
  const getVersionForFile = async (fileName: string): Promise<BpmnFileVersion | null> => {
    // If we have a specific version selected for this file, fetch it
    if (selection.selectedFileName === fileName && selection.selectedVersionHash) {
      const version = await getVersionByHash(fileName, selection.selectedVersionHash);
      return version;
    }
    // Otherwise, use current version
    return await getCurrentVersion(fileName);
  };

  // Check if we're using a specific (non-current) version
  const isUsingSpecificVersion = (): boolean => {
    return selection.selectedVersionHash !== null && selection.selectedFileName !== null;
  };

  // Get info about selected version
  const getSelectedVersionInfo = async (): Promise<{ fileName: string | null; versionNumber: number | null; isCurrent: boolean } | null> => {
    if (!selection.selectedFileName || !selection.selectedVersionHash) {
      return null;
    }

    const selectedVersion = await getVersionByHash(selection.selectedFileName, selection.selectedVersionHash);
    const currentVersion = await getCurrentVersion(selection.selectedFileName);

    return {
      fileName: selection.selectedFileName,
      versionNumber: selectedVersion?.version_number || null,
      isCurrent: selectedVersion?.content_hash === currentVersion?.content_hash || false,
    };
  };

  const contextValue: VersionSelectionContextType = {
    selection,
    setSelection,
    getVersionHashForFile,
    getVersionForFile,
    isUsingSpecificVersion,
    getSelectedVersionInfo,
  };

  return (
    <VersionSelectionContext.Provider value={contextValue}>
      {children}
    </VersionSelectionContext.Provider>
  );
}

export function useVersionSelection() {
  const context = useContext(VersionSelectionContext);
  if (context === undefined) {
    // Return a default implementation if not in provider (for backward compatibility)
    return {
      selection: { selectedVersionHash: null, selectedFileName: null },
      setSelection: () => {},
      getVersionHashForFile: async (fileName: string) => {
        const currentVersion = await getCurrentVersion(fileName);
        return currentVersion?.content_hash || null;
      },
      getVersionForFile: async (fileName: string) => {
        return await getCurrentVersion(fileName);
      },
      isUsingSpecificVersion: () => false,
      getSelectedVersionInfo: async () => null,
    };
  }
  return context;
}

