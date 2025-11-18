import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface NodeReference {
  id: string;
  bpmn_file: string;
  bpmn_element_id: string | null;
  ref_type: 'figma' | 'jira' | 'confluence' | 'other';
  ref_label: string;
  ref_url: string;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export const useNodeReferences = (bpmnFile?: string, elementId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: references, isLoading } = useQuery({
    queryKey: ['node-references', bpmnFile, elementId],
    queryFn: async () => {
      if (!bpmnFile) return [];

      let query = supabase
        .from('node_references')
        .select('*')
        .eq('bpmn_file', bpmnFile);

      if (elementId) {
        query = query.or(`bpmn_element_id.eq.${elementId},bpmn_element_id.is.null`);
      } else {
        query = query.is('bpmn_element_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as NodeReference[];
    },
    enabled: !!bpmnFile,
  });

  const addReference = useMutation({
    mutationFn: async (newRef: Omit<NodeReference, 'id' | 'created_at' | 'created_by' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('node_references')
        .insert(newRef)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node-references'] });
      toast({
        title: 'Länk tillagd',
        description: 'Referensen har sparats',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fel',
        description: `Kunde inte spara referensen: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteReference = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('node_references')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node-references'] });
      toast({
        title: 'Länk borttagen',
        description: 'Referensen har tagits bort',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fel',
        description: `Kunde inte ta bort referensen: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const groupedByType = references?.reduce((acc, ref) => {
    if (!acc[ref.ref_type]) acc[ref.ref_type] = [];
    acc[ref.ref_type].push(ref);
    return acc;
  }, {} as Record<string, NodeReference[]>);

  return {
    references: references || [],
    groupedByType: groupedByType || {},
    isLoading,
    addReference,
    deleteReference,
  };
};
