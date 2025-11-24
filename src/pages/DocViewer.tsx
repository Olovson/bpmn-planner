import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { useDocVariantAvailability } from '@/hooks/useDocVariantAvailability';

const DocViewer = () => {
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const blobUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState<string>('');
  const [viewMode, setViewMode] = useState<'local' | 'chatgpt' | 'ollama' | 'auto'>('auto');
  const decoded = docId ? decodeURIComponent(docId) : '';
  const sanitizeDocId = (value: string) => value.replace(/[^a-zA-Z0-9/_-]/g, '');
  const rawSegments = decoded.split('/').filter(Boolean);
  let safeDocId = sanitizeDocId(decoded);
  if (rawSegments[0] === 'nodes' && rawSegments.length >= 3) {
    const cleanedThird = rawSegments[2].split(/[\s(]/)[0];
    safeDocId = sanitizeDocId(`nodes/${rawSegments[1]}/${cleanedThird}`);
  }
  const isNodeDoc = safeDocId.startsWith('nodes/');
  const [_, baseName = '', elementSegment = ''] = isNodeDoc ? safeDocId.split('/') : [null, safeDocId];
  const prettyTitle = isNodeDoc
    ? `${elementSegment.replace(/-/g, ' ')}`
    : decoded.replace(/-/g, ' ');
  const prettySubtitle = isNodeDoc
    ? `BPMN-fil: ${baseName.replace(/-/g, ' ')}`
    : '';
  const formatGenerationSource = () => {
    if (!generationSource) return 'Okänt (äldre dokument)';
    if (generationSource === 'local' || generationSource === 'local-fallback') {
      return 'Lokal fallback (utan LLM)';
    }
    if (generationSource === 'llm-slow-chatgpt') {
      return 'LLM (ChatGPT)';
    }
    if (generationSource === 'llm-slow-ollama') {
      return 'LLM (Ollama)';
    }
    if (generationSource.startsWith('llm')) {
      return 'LLM (okänt läge)';
    }
    return generationSource;
  };

  const { isLoading: variantsLoading, hasLocal, hasChatgpt, hasOllama } =
    useDocVariantAvailability(safeDocId);
  const anyVariant = hasLocal || hasChatgpt || hasOllama;

  useEffect(() => {
    if (viewMode !== 'auto' || variantsLoading) return;
    // Om vi vet att minst en variant finns, välj den i prioriterad ordning.
    if (anyVariant) {
      if (hasChatgpt) {
        setViewMode('chatgpt');
      } else if (hasLocal) {
        setViewMode('local');
      } else if (hasOllama) {
        setViewMode('ollama');
      }
    }
  }, [viewMode, variantsLoading, anyVariant, hasChatgpt, hasLocal, hasOllama]);

  const activeMode: 'local' | 'chatgpt' | 'ollama' =
    viewMode === 'auto' ? 'local' : viewMode;

  const resolveModeFolder = () => {
    if (viewMode === 'auto') {
      // Auto-läge används endast innan vi vet vilka varianter som finns.
      // Tills dess: försök med legacy-sökning.
      if (!generationSource) return null;
      if (generationSource === 'local' || generationSource === 'local-fallback') return 'local';
      if (generationSource === 'llm-slow-chatgpt') return 'slow/chatgpt';
      if (generationSource === 'llm-slow-ollama') return 'slow/ollama';
      if (generationSource.startsWith('llm-slow')) return 'slow';
      if (generationSource.startsWith('llm-fast')) return 'slow';
      return null;
    }
    if (viewMode === 'local') return 'local';
    if (viewMode === 'chatgpt') return 'slow/chatgpt';
    if (viewMode === 'ollama') return 'slow/ollama';
    return null;
  };

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      setIframeUrl('');

      try {
        if (!docId) {
          throw new Error('Ingen dokumentationsfil angavs.');
        }

        const modeFolder = resolveModeFolder();
        const tryPaths: string[] = [];
        if (modeFolder) {
          tryPaths.push(`docs/${modeFolder}/${safeDocId}.html`);
          // Fallback till generiska LLM-/legacy-sökvägar
          if (modeFolder.startsWith('slow/')) {
            tryPaths.push(`docs/slow/${safeDocId}.html`);
          }
        }
        // Sista fallback: legacy utan modesubkatalog
        tryPaths.push(`docs/${safeDocId}.html`);

        let rawHtml: string | null = null;
        for (const path of tryPaths) {
          const { data } = supabase.storage.from('bpmn-files').getPublicUrl(path);
          if (!data?.publicUrl) continue;
          const versionedUrl = `${data.publicUrl}?t=${Date.now()}`;
          const response = await fetch(versionedUrl, { cache: 'no-store' });
          if (!response.ok) continue;
          rawHtml = await response.text();
          break;
        }

        if (!rawHtml) {
          throw new Error('Kunde inte hämta dokumentationen i valt läge eller legacy-läge.');
        }

        const metaMatch = rawHtml.match(/<meta[^>]+name=["']x-generation-source["'][^>]*content=["']([^"']+)/i) || rawHtml.match(/<!--\s*generation-source:([a-z0-9-_]+)\s*-->/i);
        if (metaMatch) {
          setGenerationSource(metaMatch[1]);
        } else {
          setGenerationSource('');
        }
        const blob = new Blob([rawHtml], { type: 'text/html' });
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(blob);
        blobUrlRef.current = objectUrl;
        setIframeUrl(objectUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Okänt fel vid hämtning av dokumentation.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [docId, decoded, viewMode, variantsLoading]);

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? ''}
        currentView="diagram"
        onViewChange={(view) => {
          if (view === 'diagram') navigate('/');
          else if (view === 'tree') navigate('/process-explorer');
          else if (view === 'listvy') navigate('/node-matrix');
          else if (view === 'tests') navigate('/test-report');
          else if (view === 'project') navigate('/project-plan');
          else if (view === 'timeline') navigate('/timeline');
          else navigate('/files');
        }}
        onOpenVersions={() => navigate('/')}
        onSignOut={async () => {
          await signOut();
          navigate('/auth');
        }}
        isTestsEnabled={hasTests}
      />

      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Dokumentation
              </p>
              {prettySubtitle && (
                <p className="text-sm text-muted-foreground mt-1">{prettySubtitle}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Genereringskälla: {formatGenerationSource()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <Button
                  size="sm"
                  variant={activeMode === 'local' ? 'default' : 'outline'}
                  disabled={anyVariant && !hasLocal}
                  onClick={() => {
                    if (!anyVariant || hasLocal) {
                      setViewMode('local');
                    }
                  }}
                >
                  Lokal fallback
                </Button>
                <Button
                  size="sm"
                  variant={activeMode === 'chatgpt' ? 'default' : 'outline'}
                  disabled={anyVariant && !hasChatgpt}
                  onClick={() => {
                    if (!anyVariant || hasChatgpt) {
                      setViewMode('chatgpt');
                    }
                  }}
                >
                  ChatGPT
                </Button>
                <Button
                  size="sm"
                  variant={activeMode === 'ollama' ? 'default' : 'outline'}
                  disabled={anyVariant && !hasOllama}
                  onClick={() => {
                    if (!anyVariant || hasOllama) {
                      setViewMode('ollama');
                    }
                  }}
                >
                  Ollama
                </Button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Hämtar dokumentation …</p>
            </div>
          )}

          {!loading && error && (
            <div className="max-w-2xl mx-auto bg-destructive/15 border border-destructive/30 rounded-lg p-6 text-destructive">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Kunde inte visa dokumentationen</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && iframeUrl && (
            <div className="rounded-lg border overflow-hidden bg-card">
              <iframe
                key={iframeUrl}
                src={iframeUrl}
                className="w-full min-h-[80vh] bg-white"
                title={prettyTitle || 'Dokumentation'}
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DocViewer;
