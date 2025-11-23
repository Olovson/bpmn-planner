import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDocVariantPaths } from '@/lib/artifactUrls';

interface DocVariantAvailability {
  isLoading: boolean;
  hasLocal: boolean;
  hasChatgpt: boolean;
  hasOllama: boolean;
}

async function checkVariantExists(path: string): Promise<boolean> {
  const parts = path.split('/');
  const fileName = parts.pop();
  const dir = parts.join('/');
  if (!fileName) return false;

  const { data, error } = await supabase.storage
    .from('bpmn-files')
    .list(dir || undefined, { search: fileName, limit: 1 });

  if (error) {
    console.warn('[useDocVariantAvailability] list error for', path, error);
    return false;
  }

  return Boolean((data ?? []).find((entry) => entry.name === fileName));
}

export function useDocVariantAvailability(docId?: string | null): DocVariantAvailability {
  const enabled = Boolean(docId);

  const { data, isLoading } = useQuery({
    queryKey: ['doc-variants', docId],
    enabled,
    queryFn: async () => {
      if (!docId) {
        return {
          hasLocal: false,
          hasChatgpt: false,
          hasOllama: false,
        };
      }
      const paths = getDocVariantPaths(docId);
      const [hasLocal, hasChatgpt, hasOllama] = await Promise.all([
        checkVariantExists(paths.local),
        checkVariantExists(paths.chatgpt),
        checkVariantExists(paths.ollama),
      ]);
      return { hasLocal, hasChatgpt, hasOllama };
    },
  });

  return {
    isLoading,
    hasLocal: data?.hasLocal ?? false,
    hasChatgpt: data?.hasChatgpt ?? false,
    hasOllama: data?.hasOllama ?? false,
  };
}

