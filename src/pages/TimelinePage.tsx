import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useProcessTree } from '@/hooks/useProcessTree';
import { buildGanttTasksFromProcessTree, type GanttTask } from '@/lib/ganttDataConverter';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { supabase } from '@/integrations/supabase/client';
// Removed buildJiraName import - no longer using fallback logic
import { gantt } from 'dhtmlx-gantt';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';

const TimelinePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { data: rootFile } = useRootBpmnFile();
  const { data: processTree, isLoading } = useProcessTree(rootFile || 'mortgage.bpmn');
  
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [isGanttInitialized, setIsGanttInitialized] = useState(false);

  const toGanttData = (items: GanttTask[]) => {
    // Convert to Gantt format
    const ganttTasks = items.map((task) => ({
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
    }));
    
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
        }
      }
      
      sorted.push(task);
      added.add(task.id);
    };
    
    // Add all tasks in correct order
    ganttTasks.forEach(addTask);
    
    return sorted;
  };

  // Build Gantt tasks from ProcessTree and fetch Jira mappings
  useEffect(() => {
    const loadTasksWithJiraData = async () => {
      if (!processTree) return;

      const baseDate = new Date('2026-01-01');
      const ganttTasks = buildGanttTasksFromProcessTree(processTree, baseDate, 14);

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
            const tasksWithJira = ganttTasks.map(task => {
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

            setTasks(tasksWithJira);
          }
        } catch (error) {
          console.error('[TimelinePage] Error loading Jira mappings:', error);
          setTasks(ganttTasks); // Fallback to tasks without Jira data
        }
      } else {
        setTasks(ganttTasks);
      }
    };

    loadTasksWithJiraData();
  }, [processTree]);

  // Initialize DHTMLX Gantt when container is ready and we have tasks
  useEffect(() => {
    if (!ganttContainerRef.current || isGanttInitialized || tasks.length === 0) {
      return;
    }

    // Initialize Gantt
    gantt.config.date_format = '%Y-%m-%d';
    gantt.config.columns = [
      { 
        name: 'jira_name', 
        label: 'Jira namn', 
        width: 300, 
        tree: true,
        template: (task: any) => task.jira_name || task.text || 'N/A'
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
      { name: 'start_date', label: 'Start', width: 100, align: 'center' },
      { name: 'end_date', label: 'End', width: 100, align: 'center' },
      { name: 'duration', label: 'Duration (days)', width: 120, align: 'center' },
    ];
    
    // Configure scale to show weeks
    gantt.config.scales = [
      { unit: 'month', step: 1, format: '%F %Y' },
      { 
        unit: 'week', 
        step: 1, 
        format: (date: Date) => {
          if (!date || !(date instanceof Date)) return '';
          
          // Format start date
          const day = String(date.getDate()).padStart(2, '0');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const month = monthNames[date.getMonth()];
          const startStr = `${day} ${month}`;
          
          // Format end date (6 days later)
          const endDate = new Date(date);
          endDate.setDate(endDate.getDate() + 6);
          const endDay = String(endDate.getDate()).padStart(2, '0');
          const endMonth = monthNames[endDate.getMonth()];
          const endStr = `${endDay} ${endMonth}`;
          
          return `${startStr} - ${endStr}`;
        }
      }
    ];
    gantt.config.scale_height = 50;
    
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
          }
          return true;
        });


        setIsGanttInitialized(true);
        
        // Load initial data immediately after initialization
        if (tasks.length > 0) {
          const ganttData = toGanttData(tasks);
          
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

  // Update Gantt data when tasks change
  useEffect(() => {
    if (isGanttInitialized && tasks.length > 0) {
      // Convert tasks to Gantt data format
      const ganttData = toGanttData(tasks);

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

      gantt.clearAll();
      gantt.parse({ data: ganttData, links: [] });
      
      // Force Gantt to refresh/redraw
      if (ganttContainerRef.current) {
        gantt.render();
      }
    }
  }, [tasks, isGanttInitialized]);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
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
            <h1 className="text-3xl font-bold mb-2">Timeline / Planning View</h1>
            <p className="text-muted-foreground">
              Visualize and refine time ordering for BPMN subprocesses (feature goals).
              Each subprocess is shown with a default 2-week duration starting from 2026-01-01.
            </p>
            {isLoading && (
              <p className="text-sm text-muted-foreground mt-2">Loading process tree...</p>
            )}
            {!isLoading && tasks.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No subprocesses found. Make sure you have uploaded BPMN files and built the hierarchy.
              </p>
            )}
            {!isLoading && tasks.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Found {tasks.length} timeline task{tasks.length !== 1 ? 's' : ''}. 
                Expand rows to inspect subprocess hierarchy. Click and drag to adjust dates, or double-click to edit.
              </p>
            )}
          </div>

          {tasks.length > 0 && (
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

          {/* Debug info (optional, can be removed) */}
          {process.env.NODE_ENV === 'development' && tasks.length > 0 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-semibold mb-2">Debug Info</h3>
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(
                  tasks.map((t) => ({
                    id: t.id,
                    text: t.text,
                    orderIndex: t.orderIndex,
                    branchId: t.branchId,
                    start_date: t.start_date,
                    end_date: t.end_date,
                  })),
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TimelinePage;

