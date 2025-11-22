const sanitizeSegment = (value?: string | null) =>
  (value || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

type DebugArtifactType = 'doc' | 'test';

export async function saveLlmDebugArtifact(
  type: DebugArtifactType,
  identifier: string,
  content: string
): Promise<void> {
  // I test-läge undviker vi att skriva debug-artifacts till Supabase Storage
  // för att inte stöta på RLS-policy eller påverka utvecklarens data.
  if (import.meta.env.MODE === 'test') {
    return;
  }

  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeId = sanitizeSegment(identifier);
    const prefix = type === 'doc' ? 'llm-debug/docs' : 'llm-debug/tests';
    const extension = type === 'doc' ? 'html' : 'json';
    const path = `${prefix}/${safeId}-${timestamp}.${extension}`;
    const blob = new Blob([content], {
      type: type === 'doc' ? 'text/html; charset=utf-8' : 'application/json',
    });

    const { error } = await supabase.storage.from('bpmn-files').upload(path, blob, {
      upsert: true,
      contentType: blob.type,
    });

    if (error) {
      console.warn('Failed to persist LLM debug artifact:', error);
    }
  } catch (error) {
    console.warn('Unable to save LLM debug artifact:', error);
  }
}
