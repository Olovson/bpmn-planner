import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Version {
  id: string;
  user_id: string;
  description: string;
  snapshot_data: any;
  created_at: string;
}

export const useVersionControl = () => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('versions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading versions',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createVersion = async (description: string) => {
    try {
      // Fetch current mappings
      const { data: mappings, error: fetchError } = await supabase
        .from('bpmn_element_mappings')
        .select('*');

      if (fetchError) throw fetchError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create snapshot
      const snapshot = {
        mappings: mappings || [],
        timestamp: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('versions')
        .insert({
          user_id: user.id,
          description,
          snapshot_data: snapshot,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Version created',
        description: 'Snapshot saved successfully',
      });

      fetchVersions();
    } catch (error: any) {
      toast({
        title: 'Error creating version',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      // Fetch version data
      const { data: version, error: fetchError } = await supabase
        .from('versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (fetchError) throw fetchError;
      if (!version) throw new Error('Version not found');

      // Create backup before restoring
      await createVersion('Auto-backup before restore');

      // Delete current mappings
      const { error: deleteError } = await supabase
        .from('bpmn_element_mappings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;

      // Restore mappings from snapshot
      const snapshotData = version.snapshot_data as { mappings?: any[]; timestamp?: string };
      const mappings = snapshotData?.mappings || [];
      if (mappings.length > 0) {
        const { error: insertError } = await supabase
          .from('bpmn_element_mappings')
          .insert(
            mappings.map(({ id, created_at, updated_at, ...rest }: any) => rest)
          );

        if (insertError) throw insertError;
      }

      toast({
        title: 'Version restored',
        description: 'Successfully restored to selected version',
      });

      // Reload the page to reflect changes
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Error restoring version',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    versions,
    isLoading,
    fetchVersions,
    createVersion,
    restoreVersion,
  };
};
