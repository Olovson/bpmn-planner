import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type {
  GlobalProjectConfig,
  CustomActivity,
  IntegrationWorkItems,
  PerNodeWorkItems,
} from '@/types/globalProjectConfig';
import { DEFAULT_CONFIG } from '@/types/globalProjectConfig';

interface GlobalProjectConfigContextType {
  // Configuration state
  config: GlobalProjectConfig | null;
  loading: boolean;

  // Stacc integration work items
  staccIntegrationWorkItems: IntegrationWorkItems;
  setStaccIntegrationWorkItems: (items: IntegrationWorkItems) => Promise<void>;

  // Bank integration work items
  bankIntegrationWorkItems: IntegrationWorkItems;
  setBankIntegrationWorkItems: (items: IntegrationWorkItems) => Promise<void>;

  // Custom activities
  customActivities: CustomActivity[];
  addCustomActivity: (activity: Omit<CustomActivity, 'id' | 'order'>) => Promise<void>;
  updateCustomActivity: (id: string, updates: Partial<CustomActivity>) => Promise<void>;
  removeCustomActivity: (id: string) => Promise<void>;
  reorderCustomActivities: (activities: CustomActivity[]) => Promise<void>;

  // Per-node work items
  perNodeWorkItems: PerNodeWorkItems[];
  getPerNodeWorkItems: (bpmnFile: string, elementId: string) => PerNodeWorkItems | null;
  setPerNodeWorkItems: (bpmnFile: string, elementId: string, items: Partial<PerNodeWorkItems>) => Promise<void>;
  bulkApplyDefaults: (nodeKeys: Array<{ bpmnFile: string; elementId: string }>) => Promise<void>;

  // Load/Save
  loadConfig: (rootBpmnFile: string) => Promise<void>;
  saveConfig: () => Promise<void>;
}

const GlobalProjectConfigContext = createContext<GlobalProjectConfigContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'global_project_config_';

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

export const GlobalProjectConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<GlobalProjectConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentRootBpmnFile, setCurrentRootBpmnFile] = useState<string | null>(null);

  /**
   * Load configuration from Local Storage
   */
  const loadConfig = useCallback(async (rootBpmnFile: string) => {
    setLoading(true);
    try {
      const storageKey = getStorageKey(rootBpmnFile);
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored) as GlobalProjectConfig;
        setConfig(parsed);
      } else {
        // Create default configuration
        const defaultConfig: GlobalProjectConfig = {
          rootBpmnFile,
          ...DEFAULT_CONFIG,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setConfig(defaultConfig);
      }
      setCurrentRootBpmnFile(rootBpmnFile);
    } catch (error) {
      console.error('[GlobalProjectConfigContext] Error loading configuration:', error);
      // Create default on error
      const defaultConfig: GlobalProjectConfig = {
        rootBpmnFile,
        ...DEFAULT_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConfig(defaultConfig);
      setCurrentRootBpmnFile(rootBpmnFile);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Save configuration to Local Storage
   */
  const saveConfig = useCallback(async () => {
    if (!config || !currentRootBpmnFile) return;

    try {
      const storageKey = getStorageKey(currentRootBpmnFile);
      const toSave: GlobalProjectConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (error) {
      console.error('[GlobalProjectConfigContext] Error saving configuration:', error);
      throw error;
    }
  }, [config, currentRootBpmnFile]);

  // Stacc integration work items
  const setStaccIntegrationWorkItems = useCallback(
    async (items: IntegrationWorkItems) => {
      if (!config || !currentRootBpmnFile) return;

      const updated: GlobalProjectConfig = {
        ...config,
        staccIntegrationWorkItems: items,
        updatedAt: new Date().toISOString(),
      };

      setConfig(updated);
      
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[GlobalProjectConfigContext] Error saving configuration:', error);
      }
    },
    [config, currentRootBpmnFile]
  );

  // Bank integration work items
  const setBankIntegrationWorkItems = useCallback(
    async (items: IntegrationWorkItems) => {
      if (!config || !currentRootBpmnFile) return;

      const updated: GlobalProjectConfig = {
        ...config,
        bankIntegrationWorkItems: items,
        updatedAt: new Date().toISOString(),
      };

      setConfig(updated);
      
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[GlobalProjectConfigContext] Error saving configuration:', error);
      }
    },
    [config, currentRootBpmnFile]
  );

  // Custom activities
  const addCustomActivity = useCallback(
    async (activity: Omit<CustomActivity, 'id' | 'order'>) => {
      if (!config || !currentRootBpmnFile) return;

      // Find max order for activities with same placement
      const samePlacementActivities = config.customActivities.filter(
        (a) => a.placement === activity.placement
      );
      const maxOrder = samePlacementActivities.length > 0
        ? Math.max(...samePlacementActivities.map((a) => a.order))
        : -1;

      const newActivity: CustomActivity = {
        ...activity,
        id: generateId(),
        order: maxOrder + 1,
      };

      const updated: GlobalProjectConfig = {
        ...config,
        customActivities: [...config.customActivities, newActivity],
        updatedAt: new Date().toISOString(),
      };

      setConfig(updated);
      
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[GlobalProjectConfigContext] Error saving configuration:', error);
      }
    },
    [config, currentRootBpmnFile]
  );

  const updateCustomActivity = useCallback(
    async (id: string, updates: Partial<CustomActivity>) => {
      if (!config || !currentRootBpmnFile) return;

      const updated: GlobalProjectConfig = {
        ...config,
        customActivities: config.customActivities.map((activity) =>
          activity.id === id ? { ...activity, ...updates } : activity
        ),
        updatedAt: new Date().toISOString(),
      };

      setConfig(updated);
      
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[GlobalProjectConfigContext] Error saving configuration:', error);
      }
    },
    [config, currentRootBpmnFile]
  );

  const removeCustomActivity = useCallback(
    async (id: string) => {
      if (!config || !currentRootBpmnFile) return;

      const activityToRemove = config.customActivities.find((a) => a.id === id);
      if (!activityToRemove) return;

      // Reorder remaining activities with same placement
      const updatedActivities = config.customActivities
        .filter((activity) => activity.id !== id)
        .map((activity) => {
          if (activity.placement === activityToRemove.placement && activity.order > activityToRemove.order) {
            return { ...activity, order: activity.order - 1 };
          }
          return activity;
        });

      const updated: GlobalProjectConfig = {
        ...config,
        customActivities: updatedActivities,
        updatedAt: new Date().toISOString(),
      };

      setConfig(updated);
      
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[GlobalProjectConfigContext] Error saving configuration:', error);
      }
    },
    [config, currentRootBpmnFile]
  );

  const reorderCustomActivities = useCallback(
    async (activities: CustomActivity[]) => {
      if (!config || !currentRootBpmnFile) return;

      const updated: GlobalProjectConfig = {
        ...config,
        customActivities: activities.map((activity, index) => ({ ...activity, order: index })),
        updatedAt: new Date().toISOString(),
      };

      setConfig(updated);
      
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[GlobalProjectConfigContext] Error saving configuration:', error);
      }
    },
    [config, currentRootBpmnFile]
  );

  // Per-node work items
  const getPerNodeWorkItems = useCallback(
    (bpmnFile: string, elementId: string): PerNodeWorkItems | null => {
      if (!config) return null;
      return config.perNodeWorkItems.find(
        (item) => item.bpmnFile === bpmnFile && item.elementId === elementId
      ) || null;
    },
    [config]
  );

  const setPerNodeWorkItems = useCallback(
    async (bpmnFile: string, elementId: string, items: Partial<PerNodeWorkItems>) => {
      if (!config || !currentRootBpmnFile) return;

      const existingIndex = config.perNodeWorkItems.findIndex(
        (item) => item.bpmnFile === bpmnFile && item.elementId === elementId
      );

      let updated: GlobalProjectConfig;

      if (existingIndex >= 0) {
        // Update existing
        const updatedItems = [...config.perNodeWorkItems];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          ...items,
        };

        updated = {
          ...config,
          perNodeWorkItems: updatedItems,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Create new
        const newItem: PerNodeWorkItems = {
          bpmnFile,
          elementId,
          ...items,
        };

        updated = {
          ...config,
          perNodeWorkItems: [...config.perNodeWorkItems, newItem],
          updatedAt: new Date().toISOString(),
        };
      }

      setConfig(updated);
      
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[GlobalProjectConfigContext] Error saving configuration:', error);
      }
    },
    [config, currentRootBpmnFile]
  );

  const bulkApplyDefaults = useCallback(
    async (nodeKeys: Array<{ bpmnFile: string; elementId: string }>) => {
      if (!config || !currentRootBpmnFile) return;

      const defaults = config.bankIntegrationWorkItems;
      const updatedItems = [...config.perNodeWorkItems];

      for (const { bpmnFile, elementId } of nodeKeys) {
        const existingIndex = updatedItems.findIndex(
          (item) => item.bpmnFile === bpmnFile && item.elementId === elementId
        );

        const defaultItem: PerNodeWorkItems = {
          bpmnFile,
          elementId,
          analysisWeeks: defaults.analysisWeeks,
          implementationWeeks: defaults.implementationWeeks,
          testingWeeks: defaults.testingWeeks,
          validationWeeks: defaults.validationWeeks,
        };

        if (existingIndex >= 0) {
          updatedItems[existingIndex] = defaultItem;
        } else {
          updatedItems.push(defaultItem);
        }
      }

      const updated: GlobalProjectConfig = {
        ...config,
        perNodeWorkItems: updatedItems,
        updatedAt: new Date().toISOString(),
      };

      setConfig(updated);
      
      try {
        const storageKey = getStorageKey(currentRootBpmnFile);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('[GlobalProjectConfigContext] Error saving configuration:', error);
      }
    },
    [config, currentRootBpmnFile]
  );

  return (
    <GlobalProjectConfigContext.Provider
      value={{
        config,
        loading,
        staccIntegrationWorkItems: config?.staccIntegrationWorkItems ?? DEFAULT_CONFIG.staccIntegrationWorkItems,
        setStaccIntegrationWorkItems,
        bankIntegrationWorkItems: config?.bankIntegrationWorkItems ?? DEFAULT_CONFIG.bankIntegrationWorkItems,
        setBankIntegrationWorkItems,
        customActivities: config?.customActivities ?? [],
        addCustomActivity,
        updateCustomActivity,
        removeCustomActivity,
        reorderCustomActivities,
        perNodeWorkItems: config?.perNodeWorkItems ?? [],
        getPerNodeWorkItems,
        setPerNodeWorkItems,
        bulkApplyDefaults,
        loadConfig,
        saveConfig,
      }}
    >
      {children}
    </GlobalProjectConfigContext.Provider>
  );
};

/**
 * Hook to access the global project configuration context.
 * Must be used within a GlobalProjectConfigProvider.
 */
export const useGlobalProjectConfig = (): GlobalProjectConfigContextType => {
  const context = useContext(GlobalProjectConfigContext);
  if (context === undefined) {
    throw new Error('useGlobalProjectConfig must be used within a GlobalProjectConfigProvider');
  }
  return context;
};

