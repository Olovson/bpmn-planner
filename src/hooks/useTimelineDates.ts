import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GanttTask } from '@/lib/ganttDataConverter';

export interface TimelineDate {
  id: string;
  root_bpmn_file: string;
  bpmn_file: string;
  element_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  duration_days: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Load all timeline dates for a specific root BPMN file
 */
export const useTimelineDates = (rootBpmnFile: string) => {
  return useQuery<Map<string, TimelineDate>>({
    queryKey: ['timeline-dates', rootBpmnFile],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timeline_dates')
        .select('*')
        .eq('root_bpmn_file', rootBpmnFile)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[useTimelineDates] Error fetching timeline dates:', error);
        throw error;
      }

      // Create a map keyed by "bpmnFile:elementId" for quick lookup
      const datesMap = new Map<string, TimelineDate>();
      data?.forEach((date) => {
        const key = `${date.bpmn_file}:${date.element_id}`;
        datesMap.set(key, date);
      });

      return datesMap;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 2,
  });
};

/**
 * Save or update a timeline date
 */
export const useSaveTimelineDate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rootBpmnFile,
      bpmnFile,
      elementId,
      startDate,
      endDate,
    }: {
      rootBpmnFile: string;
      bpmnFile: string;
      elementId: string;
      startDate: string; // YYYY-MM-DD
      endDate: string; // YYYY-MM-DD
    }) => {
      // Calculate duration in days
      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      const { data, error } = await supabase
        .from('timeline_dates')
        .upsert(
          {
            root_bpmn_file: rootBpmnFile,
            bpmn_file: bpmnFile,
            element_id: elementId,
            start_date: startDate,
            end_date: endDate,
            duration_days: durationDays,
          },
          {
            onConflict: 'root_bpmn_file,bpmn_file,element_id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('[useSaveTimelineDate] Error saving timeline date:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch timeline dates for this root file
      queryClient.invalidateQueries({ queryKey: ['timeline-dates', variables.rootBpmnFile] });
    },
  });
};

/**
 * Apply saved timeline dates to Gantt tasks
 */
export function applyTimelineDatesToTasks(
  tasks: GanttTask[],
  timelineDates: Map<string, TimelineDate>
): GanttTask[] {
  return tasks.map((task) => {
    if (!task.bpmnFile || !task.bpmnElementId) {
      return task; // Skip tasks without BPMN identity
    }

    const key = `${task.bpmnFile}:${task.bpmnElementId}`;
    const savedDate = timelineDates.get(key);

    if (savedDate) {
      return {
        ...task,
        start_date: savedDate.start_date,
        end_date: savedDate.end_date,
        duration: savedDate.duration_days,
      };
    }

    return task;
  });
}

