import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export type CriterionType = 'dor' | 'dod';
export type CriterionCategory = 
  | 'process_krav'
  | 'data_input_output'
  | 'design'
  | 'teknik_arkitektur'
  | 'test_kvalitet'
  | 'planering_beroenden'
  | 'team_alignment'
  | 'funktion_krav'
  | 'data_api'
  | 'teknik_drift'
  | 'dokumentation'
  | 'overlamning';

export interface DorDodCriterion {
  id: string;
  subprocess_name: string;
  criterion_type: CriterionType;
  criterion_category: CriterionCategory;
  criterion_key: string;
  criterion_text: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

// Hook to fetch all unique subprocesses with their metadata
export const useAllSubprocesses = () => {
  return useQuery({
    queryKey: ['all-subprocesses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dor_dod_status')
        .select('subprocess_name, node_type, bpmn_file, bpmn_element_id')
        .order('subprocess_name');

      if (error) throw error;

      // Get unique subprocesses with their metadata
      const uniqueMap = new Map<string, {
        subprocess_name: string;
        node_type: string | null;
        bpmn_file: string | null;
        bpmn_element_id: string | null;
      }>();

      data.forEach(item => {
        if (!uniqueMap.has(item.subprocess_name)) {
          uniqueMap.set(item.subprocess_name, item);
        }
      });

      return Array.from(uniqueMap.values());
    },
  });
};

export const useDorDodStatus = (subprocessName: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all criteria for a subprocess
  const { data: criteria = [], isLoading } = useQuery({
    queryKey: ['dor-dod-status', subprocessName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dor_dod_status')
        .select('*')
        .eq('subprocess_name', subprocessName)
        .order('criterion_type', { ascending: true })
        .order('criterion_category', { ascending: true });

      if (error) throw error;
      return data as DorDodCriterion[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('dor-dod-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dor_dod_status',
          filter: `subprocess_name=eq.${subprocessName}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dor-dod-status', subprocessName] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subprocessName, queryClient]);

  // Toggle criterion completion
  const toggleCriterion = useMutation({
    mutationFn: async ({ 
      criterionKey,
      criterionType,
      isCompleted 
    }: { 
      criterionKey: string;
      criterionType: CriterionType;
      isCompleted: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('dor_dod_status')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          completed_by: isCompleted ? user?.id : null,
        })
        .eq('subprocess_name', subprocessName)
        .eq('criterion_key', criterionKey)
        .eq('criterion_type', criterionType)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dor-dod-status', subprocessName] });
    },
    onError: (error) => {
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera status: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize criteria if they don't exist
  const initializeCriteria = useMutation({
    mutationFn: async (criteriaData: Array<{
      criterion_type: CriterionType;
      criterion_category: CriterionCategory;
      criterion_key: string;
      criterion_text: string;
    }>) => {
      const { error } = await supabase
        .from('dor_dod_status')
        .upsert(
          criteriaData.map(c => ({
            subprocess_name: subprocessName,
            ...c,
          })),
          { onConflict: 'subprocess_name,criterion_type,criterion_key' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dor-dod-status', subprocessName] });
    },
    onError: (error) => {
      toast({
        title: 'Fel vid initiering',
        description: 'Kunde inte initiera kriterier: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate progress
  const getProgress = (type: CriterionType) => {
    const typeCriteria = criteria.filter(c => c.criterion_type === type);
    if (typeCriteria.length === 0) return 0;
    const completed = typeCriteria.filter(c => c.is_completed).length;
    return Math.round((completed / typeCriteria.length) * 100);
  };

  return {
    criteria,
    isLoading,
    toggleCriterion,
    initializeCriteria,
    getProgress,
    dorProgress: getProgress('dor'),
    dodProgress: getProgress('dod'),
  };
};
