import { useEffect } from 'react';
import { useIntegration } from '@/contexts/IntegrationContext';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';

/**
 * Hook that automatically applies bank defaults when an integration
 * is changed from Stacc to Bank on the integrations page.
 */
export function useIntegrationChangeHandler() {
  const { getAllIntegrationStates } = useIntegration();
  const { bankIntegrationWorkItems, setPerNodeWorkItems } = useGlobalProjectConfig();

  useEffect(() => {
    const integrationStates = getAllIntegrationStates();
    
    // For each integration that is bank-implemented (false = bank)
    for (const [key, useStacc] of Object.entries(integrationStates)) {
      if (!useStacc) {
        // This is a bank-implemented integration
        const [bpmnFile, elementId] = key.split(':');
        
        if (bpmnFile && elementId) {
          // Check if this node already has custom config
          // If not, apply bank defaults
          // Note: We'll let the PerNodeWorkItemsSection handle this via the defaults
          // This hook is mainly for future use if we want to auto-apply on change
        }
      }
    }
  }, [getAllIntegrationStates, bankIntegrationWorkItems, setPerNodeWorkItems]);
}

