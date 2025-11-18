import { useState, useEffect } from 'react';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { useDynamicBpmnFiles, getBpmnFileUrl } from './useDynamicBpmnFiles';

export interface BpmnFileElements {
  fileName: string;
  elementIds: Set<string>;
}

/**
 * Hook that parses all BPMN files and returns a map of file name -> element IDs
 */
export const useAllBpmnElements = () => {
  const [elementsMap, setElementsMap] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { data: bpmnFiles = [], isLoading: filesLoading } = useDynamicBpmnFiles();

  useEffect(() => {
    if (filesLoading) return;
    
    let isMounted = true;

    const parseAllFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const newMap = new Map<string, Set<string>>();
        
        // Parse all BPMN files in parallel
        const results = await Promise.allSettled(
          bpmnFiles.map(async (fileName) => {
            const fileUrl = await getBpmnFileUrl(fileName);
            const result = await parseBpmnFile(fileUrl);
            return { fileName, elementIds: new Set(result.elements.map(el => el.id)) };
          })
        );

        // Process results
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            newMap.set(result.value.fileName, result.value.elementIds);
          } else {
            console.warn('Failed to parse BPMN file:', result.reason);
          }
        });

        if (isMounted) {
          setElementsMap(newMap);
        }
      } catch (err) {
        const error = err as Error;
        if (isMounted) {
          setError(error);
          console.error('Error parsing BPMN files:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    parseAllFiles();

    return () => {
      isMounted = false;
    };
  }, [bpmnFiles, filesLoading]);

  /**
   * Check if an element exists in a specific BPMN file
   */
  const elementExistsInFile = (fileName: string | null, elementId: string | null): boolean => {
    if (!fileName || !elementId) return true; // If no file/element specified, not an orphan
    const elementIds = elementsMap.get(fileName);
    return elementIds ? elementIds.has(elementId) : true; // If file not found, assume not orphan
  };

  return {
    elementsMap,
    loading,
    error,
    elementExistsInFile,
  };
};
