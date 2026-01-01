import { useMemo } from 'react';
import { useAllFilesArtifactCoverage } from '@/hooks/useFileArtifactCoverage';

export const useArtifactAvailability = () => {
  const { data: coverageMap, isLoading } = useAllFilesArtifactCoverage();

  const hasTests = useMemo(() => {
    if (!coverageMap) return false;
    for (const coverage of coverageMap.values()) {
      if ((coverage.tests?.covered || 0) > 0) return true;
    }
    return false;
  }, [coverageMap]);

  return { hasTests, isLoading };
};

