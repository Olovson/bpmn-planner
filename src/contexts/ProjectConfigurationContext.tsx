import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type {
  ProjectConfiguration,
  PreparatoryActivity,
  IntegrationConfig,
  WorkItem,
} from '@/types/projectConfiguration';

interface ProjectConfigurationContextType {
  // Configuration state
  configuration: ProjectConfiguration | null;
  loading: boolean;

  // Preparatory activities
  preparatoryActivities: PreparatoryActivity[];
  addPreparatoryActivity: (activity: Omit<PreparatoryActivity, 'id' | 'order'>) => Promise<void>;
  updatePreparatoryActivity: (id: string, updates: Partial<PreparatoryActivity>) => Promise<void>;
  removePreparatoryActivity: (id: string) => Promise<void>;
  reorderPreparatoryActivities: (activities: PreparatoryActivity[]) => Promise<void>;

  // Integration configuration
  integrations: IntegrationConfig[];
  getIntegrationConfig: (bpmnFile: string, elementId: string) => IntegrationConfig | null;
  setIntegrationOwner: (bpmnFile: string, elementId: string, owner: 'stacc' | 'bank') => Promise<void>;
  setIntegrationWorkItem: (bpmnFile: string, elementId: string, workItem: 'gemensamAnalys' | 'gemensamTestning' | 'revision', enabled: boolean) => Promise<void>;
  addExtraWorkItem: (bpmnFile: string, elementId: string, workItem: Omit<WorkItem, 'id' | 'order'>) => Promise<void>;
  updateExtraWorkItem: (bpmnFile: string, elementId: string, workItemId: string, updates: Partial<WorkItem>) => Promise<void>;
  removeExtraWorkItem: (bpmnFile: string, elementId: string, workItemId: string) => Promise<void>;
  reorderExtraWorkItems: (bpmnFile: string, elementId: string, workItems: WorkItem[]) => Promise<void>;

  // Load/Save
  loadConfiguration: (rootBpmnFile: string) => Promise<void>;
  saveConfiguration: () => Promise<void>;
}

const ProjectConfigurationContext = createContext<ProjectConfigurationContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'project_config_';

/**
 * Get storage key for a specific root BPMN file
 */
const getStorageKey = (rootBpmnFile: string): string => {
  return `${STORAGE_KEY_PREFIX}${rootBpmnFile}`;
};

/**
 * Generate a unique ID for new items
 */
const generateId = (): string => {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const ProjectConfigurationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [configuration, setConfiguration] = useState<ProjectConfiguration | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentRootBpmnFile, setCurrentRootBpmnFile] = useState<string | null>(null);

  /**
   * Load configuration from Local Storage
   */
  const loadConfiguration = useCallback(async (rootBpmnFile: string) => {
    setLoading(true);
    try {
      const storageKey = getStorageKey(rootBpmnFile);
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored) as ProjectConfiguration;
        setConfiguration(parsed);
      } else {
        // Create default configuration
        const defaultConfig: ProjectConfiguration = {
          rootBpmnFile,
          preparatoryActivities: [],
          integrations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setConfiguration(defaultConfig);
      }
      setCurrentRootBpmnFile(rootBpmnFile);
    } catch (error) {
      console.error('[ProjectConfigurationContext] Error loading configuration:', error);
      // Create default on error
      const defaultConfig: ProjectConfiguration = {
        rootBpmnFile,
        preparatoryActivities: [],
        integrations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConfiguration(defaultConfig);
      setCurrentRootBpmnFile(rootBpmnFile);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save configuration to Local Storage
   */
  const saveConfiguration = useCallback(async () => {
    if (!configuration || !currentRootBpmnFile) return;

    try {
      const storageKey = getStorageKey(currentRootBpmnFile);
      const toSave: ProjectConfiguration = {
        ...configuration,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
      // Don't update state here - it's already updated by the calling function
    } catch (error) {
      console.error('[ProjectConfigurationContext] Error saving configuration:', error);
      throw error;
    }
  }, [configuration, currentRootBpmnFile]);

  // Preparatory activities
  const addPreparatoryActivity = useCallback(
    async (activity: Omit<PreparatoryActivity, 'id' | 'order'>) => {
      if (!configuration) return;

      const newActivity: PreparatoryActivity = {
        ...activity,
        id: generateId(),
        order: configuration.preparatoryActivities.length,
      };

      const updated = {
        ...configuration,
        preparatoryActivities: [...configuration.preparatoryActivities, newActivity],
      };

      setConfiguration(updated);
      await saveConfiguration();
    },
    [configuration, saveConfiguration]
  );

  const updatePreparatoryActivity = useCallback(
    async (id: string, updates: Partial<PreparatoryActivity>) => {
      if (!configuration || !currentRootBpmnFile) return;

      const updated: ProjectConfiguration = {
        ...configuration,
        preparatoryActivities: configuration.preparatoryActivities.map((activity) =>
          activity.id === id ? { ...activity, ...updates } : activity
        ),
        updatedAt: new Date().toISOString(),
      };

      setConfiguration(updated);
      
      // Save to Local Storage
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[ProjectConfigurationContext] Error saving configuration:', error);
      }
    },
    [configuration, currentRootBpmnFile]
  );

  const removePreparatoryActivity = useCallback(
    async (id: string) => {
      if (!configuration || !currentRootBpmnFile) return;

      const updated: ProjectConfiguration = {
        ...configuration,
        preparatoryActivities: configuration.preparatoryActivities
          .filter((activity) => activity.id !== id)
          .map((activity, index) => ({ ...activity, order: index })),
        updatedAt: new Date().toISOString(),
      };

      setConfiguration(updated);
      
      // Save to Local Storage
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[ProjectConfigurationContext] Error saving configuration:', error);
      }
    },
    [configuration, currentRootBpmnFile]
  );

  const reorderPreparatoryActivities = useCallback(
    async (activities: PreparatoryActivity[]) => {
      if (!configuration) return;

      const updated = {
        ...configuration,
        preparatoryActivities: activities.map((activity, index) => ({ ...activity, order: index })),
      };

      setConfiguration(updated);
      await saveConfiguration();
    },
    [configuration, saveConfiguration]
  );

  // Integration configuration
  const getIntegrationConfig = useCallback(
    (bpmnFile: string, elementId: string): IntegrationConfig | null => {
      if (!configuration) return null;
      return configuration.integrations.find(
        (integration) => integration.bpmnFile === bpmnFile && integration.elementId === elementId
      ) || null;
    },
    [configuration]
  );

  const setIntegrationOwner = useCallback(
    async (bpmnFile: string, elementId: string, owner: 'stacc' | 'bank') => {
      if (!configuration) return;

      const existingIndex = configuration.integrations.findIndex(
        (integration) => integration.bpmnFile === bpmnFile && integration.elementId === elementId
      );

      let updated: ProjectConfiguration;

      if (existingIndex >= 0) {
        // Update existing
        const updatedIntegrations = [...configuration.integrations];
        updatedIntegrations[existingIndex] = {
          ...updatedIntegrations[existingIndex],
          implementedBy: owner,
          // If changing to 'stacc', remove extra work items
          extraWorkItems: owner === 'stacc' ? undefined : updatedIntegrations[existingIndex].extraWorkItems,
        };

        updated = {
          ...configuration,
          integrations: updatedIntegrations,
        };
      } else {
        // Create new
        const newIntegration: IntegrationConfig = {
          bpmnFile,
          elementId,
          implementedBy: owner,
          extraWorkItems: owner === 'bank' ? [] : undefined,
        };

        updated = {
          ...configuration,
          integrations: [...configuration.integrations, newIntegration],
        };
      }

      setConfiguration(updated);
      await saveConfiguration();
    },
    [configuration, saveConfiguration]
  );

  const addExtraWorkItem = useCallback(
    async (bpmnFile: string, elementId: string, workItem: Omit<WorkItem, 'id' | 'order'>) => {
      if (!configuration) return;

      const integrationIndex = configuration.integrations.findIndex(
        (integration) => integration.bpmnFile === bpmnFile && integration.elementId === elementId
      );

      if (integrationIndex < 0) {
        // Integration doesn't exist, create it first
        await setIntegrationOwner(bpmnFile, elementId, 'bank');
        // Recursive call after integration is created
        return addExtraWorkItem(bpmnFile, elementId, workItem);
      }

      const integration = configuration.integrations[integrationIndex];
      const currentWorkItems = integration.extraWorkItems || [];

      const newWorkItem: WorkItem = {
        ...workItem,
        id: generateId(),
        order: currentWorkItems.length,
      };

      const updatedIntegrations = [...configuration.integrations];
      updatedIntegrations[integrationIndex] = {
        ...integration,
        extraWorkItems: [...currentWorkItems, newWorkItem],
      };

      const updated = {
        ...configuration,
        integrations: updatedIntegrations,
      };

      setConfiguration(updated);
      await saveConfiguration();
    },
    [configuration, saveConfiguration, setIntegrationOwner]
  );

  const updateExtraWorkItem = useCallback(
    async (bpmnFile: string, elementId: string, workItemId: string, updates: Partial<WorkItem>) => {
      if (!configuration || !currentRootBpmnFile) return;

      const integrationIndex = configuration.integrations.findIndex(
        (integration) => integration.bpmnFile === bpmnFile && integration.elementId === elementId
      );

      if (integrationIndex < 0) return;

      const integration = configuration.integrations[integrationIndex];
      const updatedWorkItems = (integration.extraWorkItems || []).map((item) =>
        item.id === workItemId ? { ...item, ...updates } : item
      );

      const updatedIntegrations = [...configuration.integrations];
      updatedIntegrations[integrationIndex] = {
        ...integration,
        extraWorkItems: updatedWorkItems,
      };

      const updated: ProjectConfiguration = {
        ...configuration,
        integrations: updatedIntegrations,
        updatedAt: new Date().toISOString(),
      };

      setConfiguration(updated);
      
      // Save to Local Storage
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[ProjectConfigurationContext] Error saving configuration:', error);
      }
    },
    [configuration, currentRootBpmnFile]
  );

  const removeExtraWorkItem = useCallback(
    async (bpmnFile: string, elementId: string, workItemId: string) => {
      if (!configuration || !currentRootBpmnFile) return;

      const integrationIndex = configuration.integrations.findIndex(
        (integration) => integration.bpmnFile === bpmnFile && integration.elementId === elementId
      );

      if (integrationIndex < 0) return;

      const integration = configuration.integrations[integrationIndex];
      const updatedWorkItems = (integration.extraWorkItems || [])
        .filter((item) => item.id !== workItemId)
        .map((item, index) => ({ ...item, order: index }));

      const updatedIntegrations = [...configuration.integrations];
      updatedIntegrations[integrationIndex] = {
        ...integration,
        extraWorkItems: updatedWorkItems,
      };

      const updated: ProjectConfiguration = {
        ...configuration,
        integrations: updatedIntegrations,
        updatedAt: new Date().toISOString(),
      };

      setConfiguration(updated);
      
      // Save to Local Storage
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[ProjectConfigurationContext] Error saving configuration:', error);
      }
    },
    [configuration, currentRootBpmnFile]
  );

  const reorderExtraWorkItems = useCallback(
    async (bpmnFile: string, elementId: string, workItems: WorkItem[]) => {
      if (!configuration || !currentRootBpmnFile) return;

      const integrationIndex = configuration.integrations.findIndex(
        (integration) => integration.bpmnFile === bpmnFile && integration.elementId === elementId
      );

      if (integrationIndex < 0) return;

      const updatedWorkItems = workItems.map((item, index) => ({ ...item, order: index }));

      const updatedIntegrations = [...configuration.integrations];
      updatedIntegrations[integrationIndex] = {
        ...updatedIntegrations[integrationIndex],
        extraWorkItems: updatedWorkItems,
      };

      const updated: ProjectConfiguration = {
        ...configuration,
        integrations: updatedIntegrations,
        updatedAt: new Date().toISOString(),
      };

      setConfiguration(updated);
      
      // Save to Local Storage
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[ProjectConfigurationContext] Error saving configuration:', error);
      }
    },
    [configuration, currentRootBpmnFile]
  );

  const setIntegrationWorkItem = useCallback(
    async (bpmnFile: string, elementId: string, workItem: 'gemensamAnalys' | 'gemensamTestning' | 'revision', enabled: boolean) => {
      if (!configuration || !currentRootBpmnFile) return;

      const existingIndex = configuration.integrations.findIndex(
        (integration) => integration.bpmnFile === bpmnFile && integration.elementId === elementId
      );

      let updated: ProjectConfiguration;

      if (existingIndex >= 0) {
        // Update existing
        const updatedIntegrations = [...configuration.integrations];
        updatedIntegrations[existingIndex] = {
          ...updatedIntegrations[existingIndex],
          [workItem]: enabled,
        };

        updated = {
          ...configuration,
          integrations: updatedIntegrations,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Create new integration config
        const newIntegration: IntegrationConfig = {
          bpmnFile,
          elementId,
          implementedBy: 'stacc', // Default
          [workItem]: enabled,
        };

        updated = {
          ...configuration,
          integrations: [...configuration.integrations, newIntegration],
          updatedAt: new Date().toISOString(),
        };
      }

      setConfiguration(updated);
      
      // Save to Local Storage
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[ProjectConfigurationContext] Error saving configuration:', error);
      }
    },
    [configuration, currentRootBpmnFile]
  );

  return (
    <ProjectConfigurationContext.Provider
      value={{
        configuration,
        loading,
        preparatoryActivities: configuration?.preparatoryActivities || [],
        addPreparatoryActivity,
        updatePreparatoryActivity,
        removePreparatoryActivity,
        reorderPreparatoryActivities,
        integrations: configuration?.integrations || [],
        getIntegrationConfig,
        setIntegrationOwner,
        setIntegrationWorkItem,
        addExtraWorkItem,
        updateExtraWorkItem,
        removeExtraWorkItem,
        reorderExtraWorkItems,
        loadConfiguration,
        saveConfiguration,
      }}
    >
      {children}
    </ProjectConfigurationContext.Provider>
  );
};

/**
 * Hook to access the project configuration context.
 * Must be used within a ProjectConfigurationProvider.
 */
export const useProjectConfiguration = (): ProjectConfigurationContextType => {
  const context = useContext(ProjectConfigurationContext);
  if (context === undefined) {
    throw new Error('useProjectConfiguration must be used within a ProjectConfigurationProvider');
  }
  return context;
};

