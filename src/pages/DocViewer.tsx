import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';

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
  const [viewMode, setViewMode] = useState<'local' | 'slow' | 'auto'>('auto');
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
    if (generationSource === 'local') return 'Lokala mallar (utan LLM)';
    if (generationSource.startsWith('llm')) {
      const mode = generationSource.replace('llm', '').replace(/^-/, '') || 'standard';
      return `LLM (${mode})`;
    }
    return generationSource;
  };

  const resolveModeFolder = () => {
    if (viewMode === 'auto') {
      if (!generationSource) return null;
      if (generationSource === 'local') return 'local';
      if (generationSource.startsWith('llm-slow')) return 'slow';
      // Legacy: llm-fast behandlas som slow
      if (generationSource.startsWith('llm-fast')) return 'slow';
      return null;
    }
    return viewMode;
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
        const docPath =
          modeFolder != null ? `docs/${modeFolder}/${safeDocId}.html` : `docs/${safeDocId}.html`;
        const tryPaths = modeFolder != null
          ? [`docs/${modeFolder}/${safeDocId}.html`, `docs/${safeDocId}.html`]
          : [`docs/${safeDocId}.html`];

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
  }, [docId, decoded, viewMode]);

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      <AppHeaderWithTabs
        userEmail={user?.email ?? ''}
        currentView="diagram"
        onViewChange={(view) => {
          if (view === 'diagram') navigate('/');
          else if (view === 'tree') navigate('/process-explorer');
          else if (view === 'listvy') navigate('/node-matrix');
          else if (view === 'tests') navigate('/test-report');
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
              <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs">
                {(['local', 'slow'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`px-2 py-1 rounded-sm ${
                      viewMode === mode ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    }`}
                    onClick={() => setViewMode(mode)}
                  >
                    {mode === 'local' ? 'Local' : 'Slow LLM'}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 shrink-0">
              <ArrowLeft className="h-4 w-4" />
              Tillbaka
            </Button>
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
