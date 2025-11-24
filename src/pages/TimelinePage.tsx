import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useProcessTree } from '@/hooks/useProcessTree';
import { buildGanttTasksFromProcessTree, type GanttTask } from '@/lib/ganttDataConverter';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
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

  // Build Gantt tasks from ProcessTree
  useEffect(() => {
    if (processTree) {
      const baseDate = new Date('2026-01-01');
      const ganttTasks = buildGanttTasksFromProcessTree(processTree, baseDate, 14);
      setTasks(ganttTasks);
    }
  }, [processTree]);

  // Initialize DHTMLX Gantt
  useEffect(() => {
    if (!ganttContainerRef.current || isGanttInitialized) {
      return;
    }

    // Initialize Gantt
    gantt.config.date_format = '%Y-%m-%d';
    gantt.config.columns = [
      { name: 'text', label: 'Subprocess', width: 250, tree: true },
      { name: 'start_date', label: 'Start', width: 100, align: 'center' },
      { name: 'end_date', label: 'End', width: 100, align: 'center' },
      { name: 'duration', label: 'Duration (days)', width: 120, align: 'center' },
    ];
    
    // Enable date editing
    gantt.config.editable = true;
    gantt.config.drag_resize = true;
    gantt.config.drag_move = true;
    
    // Initialize Gantt instance
    gantt.init(ganttContainerRef.current);

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

    // Cleanup
    return () => {
      if (ganttContainerRef.current) {
        gantt.destructor();
      }
    };
  }, [isGanttInitialized]);

  // Update Gantt data when tasks change
  useEffect(() => {
    if (isGanttInitialized && tasks.length > 0) {
      // Convert tasks to Gantt data format
      const ganttData = tasks.map((task) => ({
        id: task.id,
        text: task.text,
        start_date: task.start_date,
        end_date: task.end_date,
        duration: task.duration,
        progress: task.progress,
      }));

      gantt.clearAll();
      gantt.parse({ data: ganttData });
    }
  }, [tasks, isGanttInitialized]);

  const handleViewChange = (view: string) => {
    if (view === 'diagram') navigate('/');
    else if (view === 'tree') navigate('/process-explorer');
    else if (view === 'listvy') navigate('/node-matrix');
    else if (view === 'tests') navigate('/test-report');
    else if (view === 'files') navigate('/files');
    else if (view === 'project') navigate('/project-plan');
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
                Found {tasks.length} subprocess{tasks.length !== 1 ? 'es' : ''}. 
                Click and drag to adjust dates, or double-click to edit.
              </p>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div ref={ganttContainerRef} style={{ width: '100%', height: '600px' }} />
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

