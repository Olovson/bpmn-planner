import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface JiraIssue {
  id: string;
  url: string;
  title?: string;
}

export interface BpmnMapping {
  id?: string;
  bpmn_file: string;
  element_id: string;
  jira_issues?: JiraIssue[];
  confluence_url?: string;
  figma_url?: string;
  test_report_url?: string;
  subprocess_bpmn_file?: string;
  dmn_file?: string;
  jira_type?: 'feature goal' | 'epic' | null;
  jira_name?: string | null;
}

export const useBpmnMappings = (bpmnFile: string) => {
  const [mappings, setMappings] = useState<Record<string, BpmnMapping>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadMappings();
  }, [bpmnFile]);

  const loadMappings = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('bpmn_element_mappings')
        .select('*')
        .eq('bpmn_file', bpmnFile);

      if (error) throw error;

      const mappingsMap: Record<string, BpmnMapping> = {};
      data?.forEach((item) => {
        mappingsMap[item.element_id] = {
          id: item.id,
          bpmn_file: item.bpmn_file,
          element_id: item.element_id,
          jira_issues: (item.jira_issues as unknown as JiraIssue[]) || [],
          confluence_url: item.confluence_url || undefined,
          figma_url: item.figma_url || undefined,
          test_report_url: item.test_report_url || undefined,
          subprocess_bpmn_file: item.subprocess_bpmn_file || undefined,
          dmn_file: item.dmn_file || undefined,
          jira_type: item.jira_type as 'feature goal' | 'epic' | null || null,
          jira_name: item.jira_name || undefined,
        };
      });

      setMappings(mappingsMap);
    } catch (error: any) {
      console.error('Error loading mappings:', error);
      toast({
        title: 'Fel vid laddning',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveMapping = async (elementId: string, data: Partial<BpmnMapping>) => {
    try {
      const existing = mappings[elementId];
      
      const payload: any = {
        bpmn_file: bpmnFile,
        element_id: elementId,
        jira_issues: data.jira_issues || existing?.jira_issues || [],
        confluence_url: data.confluence_url !== undefined ? (data.confluence_url || null) : (existing?.confluence_url ?? null),
        figma_url: data.figma_url !== undefined ? (data.figma_url || null) : (existing?.figma_url ?? null),
        test_report_url: data.test_report_url !== undefined ? (data.test_report_url || null) : (existing?.test_report_url ?? null),
        subprocess_bpmn_file: data.subprocess_bpmn_file !== undefined ? (data.subprocess_bpmn_file || null) : (existing?.subprocess_bpmn_file ?? null),
        dmn_file: data.dmn_file !== undefined ? (data.dmn_file || null) : (existing?.dmn_file ?? null),
        jira_type: data.jira_type !== undefined ? (data.jira_type || null) : (existing?.jira_type ?? null),
        jira_name: data.jira_name !== undefined ? (data.jira_name || null) : (existing?.jira_name ?? null),
      };

      const { data: result, error } = await supabase
        .from('bpmn_element_mappings')
        .upsert([payload], {
          onConflict: 'bpmn_file,element_id',
        })
        .select()
        .single();

      if (error) throw error;

      setMappings(prev => ({
        ...prev,
        [elementId]: {
          id: result.id,
          bpmn_file: result.bpmn_file,
          element_id: result.element_id,
          jira_issues: (result.jira_issues as unknown as JiraIssue[]) || [],
          confluence_url: result.confluence_url || undefined,
          figma_url: result.figma_url || undefined,
          test_report_url: result.test_report_url || undefined,
          subprocess_bpmn_file: result.subprocess_bpmn_file || undefined,
          dmn_file: result.dmn_file || undefined,
          jira_type: result.jira_type as 'feature goal' | 'epic' | null || null,
          jira_name: result.jira_name || undefined,
        },
      }));

      // Notify app that DB mapping was updated
      window.dispatchEvent(new CustomEvent('bpmn-db-mapping-updated', {
        detail: { bpmnFile, elementId, mapping: result }
      }));

      return result;
    } catch (error: any) {
      console.error('Error saving mapping:', error);
      toast({
        title: 'Fel vid sparande',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteMapping = async (elementId: string) => {
    try {
      const mapping = mappings[elementId];
      if (!mapping?.id) return;

      const { error } = await supabase
        .from('bpmn_element_mappings')
        .delete()
        .eq('id', mapping.id);

      if (error) throw error;

      setMappings(prev => {
        const updated = { ...prev };
        delete updated[elementId];
        return updated;
      });

      // Notify app that DB mapping was deleted
      window.dispatchEvent(new CustomEvent('bpmn-db-mapping-updated', {
        detail: { bpmnFile, elementId, deleted: true }
      }));
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      toast({
        title: 'Fel vid borttagning',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const addJiraIssue = async (elementId: string, issue: JiraIssue) => {
    const existing = mappings[elementId];
    const currentIssues = existing?.jira_issues || [];
    
    await saveMapping(elementId, {
      jira_issues: [...currentIssues, issue],
    });
  };

  const deleteJiraIssue = async (elementId: string, issueId: string) => {
    const existing = mappings[elementId];
    const currentIssues = existing?.jira_issues || [];
    
    await saveMapping(elementId, {
      jira_issues: currentIssues.filter(i => i.id !== issueId),
    });
  };

  return {
    mappings,
    loading,
    saveMapping,
    deleteMapping,
    addJiraIssue,
    deleteJiraIssue,
    reload: loadMappings,
  };
};
