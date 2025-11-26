import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Context for managing integration replacement state across the application.
 * 
 * This context stores which Service Tasks should use Stacc's integration source
 * vs. be replaced with the bank's integration source.
 * 
 * Key format: `${bpmnFile}:${elementId}`
 * Value: boolean
 *   - true = use Stacc integration (default)
 *   - false = replace with bank's integration
 */
interface IntegrationContextType {
  /**
   * Get whether a Service Task should use Stacc integration (true) or be replaced with bank's (false).
   * Defaults to true (use Stacc) if not set.
   */
  useStaccIntegration: (bpmnFile: string, elementId: string) => boolean;
  
  /**
   * Set whether a Service Task should use Stacc integration.
   * @param bpmnFile - The BPMN file name
   * @param elementId - The element ID
   * @param useStacc - true to use Stacc, false to replace with bank's
   */
  setUseStaccIntegration: (bpmnFile: string, elementId: string, useStacc: boolean) => void;
  
  /**
   * Get all integration states as a record.
   * Useful for reading state in other components.
   */
  getAllIntegrationStates: () => Record<string, boolean>;

  /**
   * Indicates whether integration overrides are still loading from the backend.
   */
  loading: boolean;
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

export const IntegrationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State: key = `${bpmnFile}:${elementId}`, value = boolean (true = use Stacc, false = replace with bank)
  const [integrationStates, setIntegrationStates] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Initial load from Supabase (integration_overrides)
  useEffect(() => {
    let isMounted = true;

    const loadOverrides = async () => {
      try {
        const { data, error } = await supabase
          .from('integration_overrides')
          .select('bpmn_file, element_id, uses_stacc_integration');

        if (error) {
          console.error('[IntegrationContext] Failed to load integration_overrides:', error);
          return;
        }

        if (!data || !isMounted) return;

        const next: Record<string, boolean> = {};
        for (const row of data) {
          const key = `${row.bpmn_file}:${row.element_id}`;
          // Use the stored boolean; default behaviour (when no row) is handled by useStaccIntegration
          next[key] = row.uses_stacc_integration ?? true;
        }
        setIntegrationStates(next);
      } catch (err) {
        console.error('[IntegrationContext] Unexpected error loading integration_overrides:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOverrides();

    return () => {
      isMounted = false;
    };
  }, []);

  const useStaccIntegration = useCallback((bpmnFile: string, elementId: string): boolean => {
    const key = `${bpmnFile}:${elementId}`;
    // Default to true (use Stacc) if not set
    return integrationStates[key] ?? true;
  }, [integrationStates]);

  const setUseStaccIntegration = useCallback(
    (bpmnFile: string, elementId: string, useStacc: boolean) => {
      const key = `${bpmnFile}:${elementId}`;
      // Optimistic local update
      setIntegrationStates((prev) => ({
        ...prev,
        [key]: useStacc,
      }));

      // Persist to Supabase in the background
      supabase
        .from('integration_overrides')
        .upsert(
          {
            bpmn_file: bpmnFile,
            element_id: elementId,
            uses_stacc_integration: useStacc,
          },
          { onConflict: 'bpmn_file,element_id' },
        )
        .then(({ error }) => {
          if (error) {
            console.error('[IntegrationContext] Failed to upsert integration_overrides:', error);
          }
        })
        .catch((err) => {
          console.error('[IntegrationContext] Unexpected error upserting integration_overrides:', err);
        });
    },
    [],
  );

  const getAllIntegrationStates = useCallback(() => {
    return integrationStates;
  }, [integrationStates]);

  return (
    <IntegrationContext.Provider
      value={{
        useStaccIntegration,
        setUseStaccIntegration,
        getAllIntegrationStates,
        loading,
      }}
    >
      {children}
    </IntegrationContext.Provider>
  );
};

/**
 * Hook to access the integration context.
 * Must be used within an IntegrationProvider.
 */
export const useIntegration = (): IntegrationContextType => {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }
  return context;
};

