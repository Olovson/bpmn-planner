import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useProcessTree } from '@/hooks/useProcessTree';
import { buildGanttTasksFromProcessTree, type GanttTask } from '@/lib/ganttDataConverter';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { supabase } from '@/integrations/supabase/client';
import { useIntegration } from '@/contexts/IntegrationContext';
import { useTimelineDates, useSaveTimelineDate, applyTimelineDatesToTasks } from '@/hooks/useTimelineDates';
import { getProcessNodeStyle, type ProcessTreeNode } from '@/lib/processTree';
import { getFilterableNodeTypeValues, getDefaultFilterSet, getFilterableNodeTypes } from '@/lib/bpmnNodeTypeFilters';
// Removed buildJiraName import - no longer using fallback logic
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import { Download } from 'lucide-react';
import { exportTimelineToExcel } from '@/lib/timelineExport';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';
import { createDurationCalculator } from '@/lib/timelineDurationCalculator';

const TimelinePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { data: rootFile } = useRootBpmnFile();
  const { data: processTree, isLoading } = useProcessTree(rootFile || 'mortgage.bpmn');
  const { useStaccIntegration } = useIntegration();
  const { data: timelineDates } = useTimelineDates(rootFile || 'mortgage.bpmn');
  const saveTimelineDate = useSaveTimelineDate();
  const { config: projectConfig, loadConfig } = useGlobalProjectConfig();
  
  // Load configuration when root file changes
  useEffect(() => {
    if (rootFile) {
      loadConfig(rootFile);
    }
  }, [rootFile, loadConfig]);
  
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [isGanttInitialized, setIsGanttInitialized] = useState(false);

  // BPMN type filtering (view-only), aligned with Process Explorer
  type TimelineNodeKind = ProcessTreeNode['type'];
  const FILTER_TYPES = getFilterableNodeTypeValues() as TimelineNodeKind[];
  const [enabledKinds, setEnabledKinds] = useState<Set<TimelineNodeKind>>(
    () => getDefaultFilterSet() as Set<TimelineNodeKind>,
  );

  // Debug: Log when tasks state changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(
        `[TimelinePage] Tasks state changed:`,
        {
          tasksCount: tasks.length,
          taskIds: tasks.slice(0, 10).map(t => ({ id: t.id, text: t.text })),
        }
      );
    }
  }, [tasks]);

  // View-only filtered tasks for Timeline (does not affect underlying scheduling)
  const visibleTasks = useMemo(() => {
    // If filter is empty (ska inte hända normalt), visa alla tasks
    if (enabledKinds.size === 0) return tasks;

    return tasks.filter((t) => {
      // Always keep project/root nodes to preserve hierarchy
      if (t.type === 'project') return true;
      const kind = t.meta?.kind as TimelineNodeKind | undefined;
      if (!kind) return true;
      // Only filter types we explicitly support in the UI; others are always visible
      if (!FILTER_TYPES.includes(kind)) return true;
      return enabledKinds.has(kind);
    });
  }, [tasks, enabledKinds]);

  const toGanttData = (items: GanttTask[]) => {
    if (import.meta.env.DEV) {
      console.log(
        `[TimelinePage] toGanttData called with ${items.length} items`
      );
    }
    
    // Convert to Gantt format
    const ganttTasks = items.map((task) => {
      // Determine integration mode for this task (if we have BPMN identity)
      const hasIdentity = Boolean(task.bpmnFile && task.bpmnElementId);
      const useStacc =
        hasIdentity && task.bpmnFile && task.bpmnElementId
          ? useStaccIntegration(task.bpmnFile, task.bpmnElementId)
          : true; // Default: treat as Stacc (keeps current blue color)

      // Use green color for tasks that are configured to use bank integration instead of Stacc
      const color = useStacc ? undefined : '#22c55e'; // Tailwind green-500

      return {
        id: String(task.id),
        text: task.text,
        jira_name: task.jira_name || task.text || 'N/A',
        jira_type: task.jira_type || null,
        start_date: new Date(task.start_date + 'T00:00:00'),
        end_date: new Date(task.end_date + 'T00:00:00'),
        duration: task.duration,
        progress: task.progress,
        type: task.type ?? 'task',
        parent: task.parent ? String(task.parent) : '0',
        orderIndex: task.orderIndex,
        branchId: task.branchId,
        bpmnFile: task.bpmnFile,
        bpmnElementId: task.bpmnElementId,
        meta: task.meta,
        open: task.type === 'project',
        // Custom visual hint for integration mode
        color,
        integrationMode: useStacc ? 'stacc' : 'bank',
      };
    });
    
    // DHTMLX Gantt requires parent tasks to come before their children
    // Sort tasks so that parents appear before children
    const taskMap = new Map(ganttTasks.map(t => [t.id, t]));
    const sorted: typeof ganttTasks = [];
    const added = new Set<string>();
    
    const addTask = (task: typeof ganttTasks[0]) => {
      if (added.has(task.id)) return;
      
      // If task has a parent (and it's not root), add parent first
      if (task.parent && task.parent !== '0') {
        const parent = taskMap.get(task.parent);
        if (parent && !added.has(parent.id)) {
          addTask(parent);
        } else if (!parent) {
          // Parent doesn't exist - log warning but still add the task
          if (import.meta.env.DEV) {
            console.warn(
              `[TimelinePage] Task "${task.text}" (${task.id}) has missing parent "${task.parent}"`
            );
          }
        }
      }
      
      sorted.push(task);
      added.add(task.id);
    };
    
    // Add all tasks in correct order
    ganttTasks.forEach(addTask);
    
    // If some tasks weren't added, try to add them anyway (they might have invalid parents)
    const remainingTasks = ganttTasks.filter(t => !added.has(t.id));
    if (remainingTasks.length > 0) {
      if (import.meta.env.DEV) {
        console.warn(
          `[TimelinePage] ${remainingTasks.length} tasks were not added in first pass. Adding them now.`
        );
      }
      remainingTasks.forEach(task => {
        if (!added.has(task.id)) {
          sorted.push(task);
          added.add(task.id);
        }
      });
    }
    
    if (import.meta.env.DEV) {
      console.log(
        `[TimelinePage] toGanttData sorting:`,
        {
          inputCount: items.length,
          ganttTasksCount: ganttTasks.length,
          sortedCount: sorted.length,
          addedSetSize: added.size,
          missingTasks: items.length - sorted.length,
        }
      );
      
      // Find tasks that weren't added (compare by converting IDs to strings)
      if (items.length !== sorted.length) {
        const sortedIds = new Set(sorted.map(t => String(t.id)));
        const ganttTaskIds = new Set(ganttTasks.map(t => String(t.id)));
        const missing = ganttTasks.filter(t => !sortedIds.has(String(t.id)));
        
        if (missing.length > 0) {
          console.warn(
            `[TimelinePage] Tasks not added to sorted list (${missing.length} tasks):`,
            missing.slice(0, 20).map(t => {
              const parent = t.parent ? String(t.parent) : '0';
              const parentExists = parent === '0' || ganttTaskIds.has(parent);
              return {
                id: String(t.id),
                text: t.text,
                parent,
                parentExists,
                type: t.type,
              };
            })
          );
        }
        
        // Also check for tasks with missing parents
        const tasksWithMissingParents = ganttTasks.filter(t => {
          const parent = t.parent ? String(t.parent) : '0';
          return parent !== '0' && !ganttTaskIds.has(parent);
        });
        
        if (tasksWithMissingParents.length > 0) {
          console.warn(
            `[TimelinePage] Tasks with missing parents (${tasksWithMissingParents.length} tasks):`,
            tasksWithMissingParents.slice(0, 20).map(t => ({
              id: String(t.id),
              text: t.text,
              parent: String(t.parent),
              type: t.type,
            }))
          );
        }
      }
    }
    
    const numbered = sorted.map((task, index) => ({
      ...task,
      rowNumber: index + 1,
    }));
    
    return numbered;
  };

  // Build Gantt tasks from ProcessTree and fetch Jira mappings
  useEffect(() => {
    const loadTasksWithJiraData = async () => {
      if (!processTree) return;

      // Create duration calculator based on project config
      const durationCalculator = createDurationCalculator(projectConfig, useStaccIntegration);

      // Get custom activities from config
      const customActivities = projectConfig?.customActivities || [];

      const baseDate = new Date('2026-01-01');
      const ganttTasks = buildGanttTasksFromProcessTree(processTree, baseDate, durationCalculator, customActivities);

      if (import.meta.env.DEV) {
        console.log(
          `[TimelinePage] Built Gantt tasks:`,
          {
            ganttTasksCount: ganttTasks.length,
            customActivitiesCount: customActivities.length,
          }
        );
      }

      // Fetch Jira mappings for all tasks
      if (ganttTasks.length > 0) {
        try {
          const { data: mappings, error } = await supabase
            .from('bpmn_element_mappings')
            .select('bpmn_file, element_id, jira_name, jira_type');

          if (error) {
            console.error('[TimelinePage] Error fetching Jira mappings:', error);
          } else {
            // Create a map for quick lookup
            const mappingsMap = new Map<string, { jira_name: string | null; jira_type: 'feature goal' | 'epic' | null }>();
            mappings?.forEach(m => {
              const key = `${m.bpmn_file}:${m.element_id}`;
              mappingsMap.set(key, {
                jira_name: m.jira_name,
                jira_type: m.jira_type as 'feature goal' | 'epic' | null,
              });
            });

            // Add Jira data to tasks (only from database, no fallback)
            let tasksWithJira = ganttTasks.map(task => {
              const key = task.bpmnFile && task.bpmnElementId 
                ? `${task.bpmnFile}:${task.bpmnElementId}`
                : null;
              const mapping = key ? mappingsMap.get(key) : null;
              
              // Only use data from database - no fallback to generated names
              // This makes it clear when Jira names need to be generated
              return {
                ...task,
                jira_name: mapping?.jira_name || null,
                jira_type: mapping?.jira_type || null,
              };
            });


            // Apply saved timeline dates if available
            const finalTasks = timelineDates
              ? applyTimelineDatesToTasks(tasksWithJira, timelineDates)
              : tasksWithJira;

            if (import.meta.env.DEV) {
              console.log(
                `[TimelinePage] Setting tasks in state:`,
                {
                  ganttTasksCount: ganttTasks.length,
                  tasksWithJiraCount: tasksWithJira.length,
                  finalTasksCount: finalTasks.length,
                  timelineDatesCount: timelineDates?.length || 0,
                }
              );
            }

            setTasks(finalTasks);
          }
        } catch (error) {
          console.error('[TimelinePage] Error loading Jira mappings:', error);
          // Apply saved timeline dates even on error
          const finalTasks = timelineDates
            ? applyTimelineDatesToTasks(ganttTasks, timelineDates)
            : ganttTasks;
          
          if (import.meta.env.DEV) {
            console.log(
              `[TimelinePage] Setting tasks in state (error case):`,
              {
                ganttTasksCount: ganttTasks.length,
                finalTasksCount: finalTasks.length,
                timelineDatesCount: timelineDates?.length || 0,
              }
            );
          }
          
          setTasks(finalTasks);
        }
      } else {
        // Apply saved timeline dates if available
        const finalTasks = timelineDates
          ? applyTimelineDatesToTasks(ganttTasks, timelineDates)
          : ganttTasks;
        
        if (import.meta.env.DEV) {
          console.log(
            `[TimelinePage] Setting tasks in state (no Jira mappings):`,
            {
              ganttTasksCount: ganttTasks.length,
              finalTasksCount: finalTasks.length,
              timelineDatesCount: timelineDates?.length || 0,
            }
          );
        }
        
        setTasks(finalTasks);
      }
    };

    loadTasksWithJiraData();
  }, [processTree, timelineDates, projectConfig, useStaccIntegration]);

  // Initialize DHTMLX Gantt when container is ready and we have tasks
  useEffect(() => {
    if (!ganttContainerRef.current || isGanttInitialized || tasks.length === 0) {
      return;
    }

    // Initialize Gantt
    gantt.config.date_format = '%Y-%m-%d';
    gantt.config.columns = [
      {
        name: 'rowNumber',
        label: '#',
        width: 40,
        align: 'center',
        template: (task: any) => task.rowNumber || '',
      },
      { 
        name: 'jira_name', 
        label: 'Jira namn', 
        width: 350, 
        tree: true,
        template: (task: any) => {
          const value = task.jira_name || task.text || 'N/A';
          return `<div class="gantt-column-wrap" style="white-space: normal; line-height: 1.3;">${value}</div>`;
        },
      },
      { 
        name: 'jira_type', 
        label: 'Jira typ', 
        width: 120, 
        align: 'center',
        template: (task: any) => {
          if (!task.jira_type) return '';
          // Capitalize first letter
          return task.jira_type.charAt(0).toUpperCase() + task.jira_type.slice(1);
        }
      },
    ];
    
    // Helper function to get ISO week number
    const getWeekNumber = (date: Date): number => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    // Configure scale to show weeks
    gantt.config.scales = [
      { unit: 'month', step: 1, format: '%F %Y' },
      { 
        unit: 'week', 
        step: 1, 
        format: (date: Date) => {
          if (!date || !(date instanceof Date)) return '';
          
          // Get week number for start of week (Monday)
          const weekStart = new Date(date);
          const dayOfWeek = weekStart.getDay();
          const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
          weekStart.setDate(diff);
          
          const startWeek = getWeekNumber(weekStart);
          const startYear = weekStart.getFullYear();
          
          // Get week number for end of week (Sunday, 6 days later)
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const endWeek = getWeekNumber(weekEnd);
          const endYear = weekEnd.getFullYear();
          
          // Format as V51-V52 or V1-V2
          if (startYear === endYear && startWeek === endWeek) {
            return `V${startWeek}`;
          } else if (startYear === endYear) {
            return `V${startWeek}-V${endWeek}`;
          } else {
            // Week spans across year boundary
            return `V${startWeek} (${startYear})-V${endWeek} (${endYear})`;
          }
        }
      }
    ];
    gantt.config.scale_height = 50;
    
    // Make week columns narrower for better readability
    gantt.config.min_column_width = 40; // Minimum width for week columns (default is usually 50-60)
    
    // Enable date editing
    gantt.config.editable = true;
    gantt.config.drag_resize = true;
    gantt.config.drag_move = true;
    
    // Set work time (optional, but helps with display)
    gantt.config.work_time = true;
    gantt.config.skip_off_time = false;
    
    // Initialize Gantt instance
    if (ganttContainerRef.current) {
      try {
        gantt.init(ganttContainerRef.current);
        
        if (import.meta.env.DEV) {
          console.log('[TimelinePage] Gantt initialized in container:', ganttContainerRef.current);
        }

        // Handle date changes
        gantt.attachEvent('onAfterTaskUpdate', (id: string | number) => {
          const task = gantt.getTask(id);
          if (task && task.start_date && task.end_date) {
            // Convert Gantt date objects to YYYY-MM-DD strings
            const startDate = task.start_date instanceof Date 
              ? task.start_date.toISOString().split('T')[0]
              : String(task.start_date).split('T')[0];
            const endDate = task.end_date instanceof Date
              ? task.end_date.toISOString().split('T')[0]
              : String(task.end_date).split('T')[0];
            
            // Update local state
            setTasks((prevTasks) =>
              prevTasks.map((t) =>
                t.id === String(id)
                  ? {
                      ...t,
                      start_date: startDate,
                      end_date: endDate,
                      duration: task.duration || 14,
                    }
                  : t
              )
            );

            // Save to database if task has BPMN identity
            if (task.bpmnFile && task.bpmnElementId && rootFile) {
              saveTimelineDate.mutate({
                rootBpmnFile: rootFile,
                bpmnFile: task.bpmnFile,
                elementId: task.bpmnElementId,
                startDate,
                endDate,
              });
            }
          }
          return true;
        });


        setIsGanttInitialized(true);
        
        // Load initial data immediately after initialization
        if (tasks.length > 0) {
          const ganttData = toGanttData(tasks);
          
          // No links - dependencies removed per user request
          gantt.parse({ data: ganttData, links: [] });
          gantt.render();
          
          if (import.meta.env.DEV) {
                console.log('[TimelinePage] Initial data loaded into Gantt:', ganttData.length, 'tasks');
          }
        }
      } catch (error) {
        console.error('[TimelinePage] Error initializing Gantt:', error);
      }
    }

    // Cleanup
    return () => {
      if (ganttContainerRef.current && isGanttInitialized) {
        try {
          gantt.destructor();
        } catch (error) {
          console.error('[TimelinePage] Error destroying Gantt:', error);
        }
      }
    };
  }, [isGanttInitialized, tasks]);

  // Update Gantt data when tasks or filters change (view-only filtering)
  useEffect(() => {
    if (isGanttInitialized && visibleTasks.length > 0) {
      // Convert tasks to Gantt data format
      const ganttData = toGanttData(visibleTasks);

      if (import.meta.env.DEV) {
        console.log('[TimelinePage] Parsing Gantt data:', { 
          taskCount: ganttData.length,
          firstTask: ganttData[0],
          containerExists: !!ganttContainerRef.current 
        });
        
        // Debug: Check parent references
        const taskIds = new Set(ganttData.map(t => String(t.id)));
        const invalidParents = ganttData.filter(t => {
          const parent = String(t.parent || '0');
          return parent !== '0' && !taskIds.has(parent);
        });
        if (invalidParents.length > 0) {
          console.warn('[TimelinePage] Tasks with invalid parent references:', invalidParents);
        }
        
        // Debug: Log all tasks with their hierarchy
        console.log('[TimelinePage] All Gantt tasks:', ganttData.map(t => ({
          id: t.id,
          text: t.text,
          parent: t.parent,
          type: t.type,
        })));
      }

      // No links - dependencies removed per user request
      gantt.clearAll();
      gantt.parse({ data: ganttData, links: [] });
      
      // Force Gantt to refresh/redraw
      if (ganttContainerRef.current) {
        gantt.render();
      }
    }
  }, [visibleTasks, isGanttInitialized]);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'configuration') navigate('/configuration');
    else if (view === 'files') navigate('/files');
    else if (view === 'timeline') navigate('/timeline');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const currentView: 'timeline' = 'timeline';

  return (
    <div className="flex h-screen bg-background">
      <AppHeaderWithTabs
        userEmail={user?.email}
        currentView={currentView}
        onViewChange={handleViewChange}
        onOpenVersions={() => {}}
        onSignOut={handleSignOut}
        isTestsEnabled={hasTests}
      />
      <main className="flex-1 ml-16 overflow-auto">
        <div className="container mx-auto p-6">
            <div className="mb-6">
              <div className="mb-2">
                <h1 className="text-3xl font-bold mb-2">Timeline / Planning View</h1>
                <p className="text-muted-foreground">
                  Visualize and refine time ordering for BPMN subprocesses (feature goals).
                  Each subprocess is shown with a default 2-week duration starting from 2026-01-01.
                </p>
              </div>
            {isLoading && (
              <p className="text-sm text-muted-foreground mt-2">Loading process tree...</p>
            )}
            {!isLoading && tasks.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No subprocesses found. Make sure you have uploaded BPMN files and built the hierarchy.
              </p>
            )}

            {/* BPMN type filter (view-only, same types as Process Explorer) */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Filter by BPMN type:
                </span>
              {getFilterableNodeTypes().map((filterConfig) => {
                const kind = filterConfig.type as TimelineNodeKind;
                const isActive = enabledKinds.has(kind);
                return (
                  <Button
                    key={kind}
                    type="button"
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    title={filterConfig.description}
                    onClick={() => {
                      setEnabledKinds((prev) => {
                        const next = new Set(prev);
                        if (next.has(kind)) {
                          next.delete(kind);
                        } else {
                          next.add(kind);
                        }
                        // Om alla filtreras bort, fall tillbaka till alla aktiva
                        return next.size > 0 ? next : new Set(FILTER_TYPES);
                      });
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: filterConfig.hexColor }}
                    />
                    {filterConfig.label}
                  </Button>
                );
              })}
              </div>
              <Button
                onClick={() => {
                  if (tasks.length > 0) {
                    const rootName = rootFile?.replace('.bpmn', '') || 'timeline';
                    exportTimelineToExcel(tasks, `${rootName}-timeline.xlsx`);
                  }
                }}
                variant="outline"
                disabled={tasks.length === 0}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportera till Excel
              </Button>
            </div>
          </div>

          {visibleTasks.length > 0 && (
            <div className="border rounded-lg overflow-hidden bg-white">
              <div 
                ref={ganttContainerRef} 
                style={{ 
                  width: '100%', 
                  height: '600px',
                  minHeight: '600px',
                  position: 'relative'
                }} 
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TimelinePage;

