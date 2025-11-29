import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { useDocVariantAvailability } from '@/hooks/useDocVariantAvailability';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { buildNodeDocumentationContext } from '@/lib/documentationContext';
import { renderFeatureGoalDoc } from '@/lib/documentationTemplates';
import { useDynamicBpmnFiles } from '@/hooks/useDynamicBpmnFiles';
import type { FeatureGoalTemplateVersion } from '@/lib/documentationTemplates';
import { matchCallActivityUsingMap, loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import bpmnMapData from '../../bpmn-map.json';

const DocViewer = () => {
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const blobUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState<string>('');
  const [viewMode, setViewMode] = useState<'local' | 'chatgpt' | 'ollama' | 'auto'>('auto');
  const [templateVersion, setTemplateVersion] = useState<'v1' | 'v2'>('v1');
  const [isFeatureGoal, setIsFeatureGoal] = useState(false);
  const [rawHtmlContent, setRawHtmlContent] = useState<string | null>(null);
  const [userSelectedVersion, setUserSelectedVersion] = useState<'v1' | 'v2' | null>(null);
  const [loadedFromPath, setLoadedFromPath] = useState<string | null>(null);
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
    
    // Use userSelectedVersion if available, otherwise fall back to templateVersion
    // This ensures we show the correct label even if templateVersion hasn't updated yet
    const effectiveVersion = userSelectedVersion || templateVersion;
    
    // Check if this is a local-content v2 file
    // We check both loadedFromPath (if available) and if userSelectedVersion is v2
    // This handles the case where loadedFromPath might not be updated yet during render
    const isLocalContentV2 = 
      generationSource === 'local-fallback' && 
      effectiveVersion === 'v2' && 
      (loadedFromPath?.includes('/local-content/') || userSelectedVersion === 'v2');
    
    // Debug logging
    console.log('[DocViewer] formatGenerationSource:', {
      generationSource,
      templateVersion,
      userSelectedVersion,
      effectiveVersion,
      loadedFromPath,
      isLocalContentV2,
      check1: generationSource === 'local-fallback',
      check2: effectiveVersion === 'v2',
      check3: loadedFromPath?.includes('/local-content/'),
      check4: userSelectedVersion === 'v2',
    });
    
    // For local-content v2 files, show a more descriptive label
    if (isLocalContentV2) {
      return 'Lokalt förbättrat innehåll (v2)';
    }
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
  const { data: bpmnFiles = [] } = useDynamicBpmnFiles();

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
      setRawHtmlContent(null);
      setLoadedFromPath(null);
      // Don't reset isFeatureGoal here - let it be determined from the loaded content
      // This ensures template selection stays visible when switching between v1 and v2

      try {
        if (!docId) {
          throw new Error('Ingen dokumentationsfil angavs.');
        }

        // Clean up any existing blob URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }

        const modeFolder = resolveModeFolder();
        const tryPaths: string[] = [];
        
        // For Feature Goals (callActivity nodes), use version-specific filename if user selected a version
        // Feature Goals are stored as: feature-goals/bpmnFile-elementId-v1.html or -v2.html
        // We'll detect if it's a Feature Goal from the HTML content later, but for now try both paths
        const versionToUse = userSelectedVersion || templateVersion;
        
        // Try Feature Goal paths first (if this is a node doc, it might be a Feature Goal)
        if (isNodeDoc && baseName && elementSegment) {
          // For call activities, we need to resolve the subprocessFile (the actual BPMN file for the subprocess)
          // This matches how bpmnGenerators.ts creates Feature Goal filenames
          let featureGoalBpmnFile = baseName;
          
          // Try to resolve subprocessFile from bpmn-map.json first (fastest and most reliable)
          try {
            console.log('[DocViewer] 🔍 Resolving subprocessFile for:', baseName, elementSegment);
            const bpmnMap = loadBpmnMap(bpmnMapData);
            const matchResult = matchCallActivityUsingMap(
              { id: elementSegment, name: undefined, calledElement: undefined },
              baseName + '.bpmn',
              bpmnMap
            );
            
            if (matchResult.matchedFileName) {
              featureGoalBpmnFile = matchResult.matchedFileName.replace('.bpmn', '');
              console.log('[DocViewer] ✓ Found subprocessFile from bpmn-map.json:', featureGoalBpmnFile);
            } else {
              // Fallback: Try to resolve from BPMN process graph
              console.log('[DocViewer] No match in bpmn-map.json, trying process graph...');
              const graph = await buildBpmnProcessGraph(baseName + '.bpmn', bpmnFiles);
              const nodeId = `${baseName}.bpmn::${elementSegment}`;
              const nodeContext = buildNodeDocumentationContext(graph, nodeId);
              
              if (nodeContext?.node.type === 'callActivity' && nodeContext.node.subprocessFile) {
                featureGoalBpmnFile = nodeContext.node.subprocessFile.replace('.bpmn', '');
                console.log('[DocViewer] ✓ Found subprocessFile from process graph:', featureGoalBpmnFile);
              } else {
                console.log('[DocViewer] Using baseName (not a call activity or no subprocessFile):', featureGoalBpmnFile);
              }
            }
          } catch (error) {
            // If we can't resolve subprocessFile, fall back to using baseName
            console.warn('[DocViewer] Could not resolve subprocessFile, using baseName:', error);
          }
          
          // Build Feature Goal path with version: feature-goals/bpmnFile-elementId-v1.html
          // Use subprocessFile if available, otherwise use baseName
          const featureGoalPathWithVersion = `feature-goals/${featureGoalBpmnFile}-${elementSegment}-${versionToUse}.html`;
          const featureGoalPathNoVersion = `feature-goals/${featureGoalBpmnFile}-${elementSegment}.html`;
          
          // Also try with original baseName for backward compatibility
          const featureGoalPathWithVersionOriginal = `feature-goals/${baseName}-${elementSegment}-${versionToUse}.html`;
          const featureGoalPathNoVersionOriginal = `feature-goals/${baseName}-${elementSegment}.html`;
          
          // For v2 Feature Goals, try local content first (from public/local-content/feature-goals/)
          if (versionToUse === 'v2') {
            const localContentFilename = featureGoalPathWithVersion.replace('feature-goals/', '');
            const localContentPath = `/local-content/feature-goals/${localContentFilename}`;
            console.log('[DocViewer] 📁 Adding local content path (with subprocessFile):', localContentPath);
            tryPaths.push(localContentPath);
            
            // Also try with original baseName
            const localContentFilenameOriginal = featureGoalPathWithVersionOriginal.replace('feature-goals/', '');
            const localContentPathOriginal = `/local-content/feature-goals/${localContentFilenameOriginal}`;
            console.log('[DocViewer] 📁 Adding local content path (with baseName):', localContentPathOriginal);
            tryPaths.push(localContentPathOriginal);
          }
          
          console.log('[DocViewer] All tryPaths for Feature Goal:', tryPaths);
          
          if (modeFolder) {
            // Try version-specific path first (with subprocessFile)
            tryPaths.push(`docs/${modeFolder}/${featureGoalPathWithVersion}`);
            // Then try without version for backward compatibility
            tryPaths.push(`docs/${modeFolder}/${featureGoalPathNoVersion}`);
            // Also try with original baseName
            tryPaths.push(`docs/${modeFolder}/${featureGoalPathWithVersionOriginal}`);
            tryPaths.push(`docs/${modeFolder}/${featureGoalPathNoVersionOriginal}`);
            if (modeFolder.startsWith('slow/')) {
              tryPaths.push(`docs/slow/${featureGoalPathWithVersion}`);
              tryPaths.push(`docs/slow/${featureGoalPathNoVersion}`);
              tryPaths.push(`docs/slow/${featureGoalPathWithVersionOriginal}`);
              tryPaths.push(`docs/slow/${featureGoalPathNoVersionOriginal}`);
            }
          }
          // Also try legacy paths (with subprocessFile first, then original)
          tryPaths.push(`docs/${featureGoalPathWithVersion}`);
          tryPaths.push(`docs/${featureGoalPathNoVersion}`);
          tryPaths.push(`docs/${featureGoalPathWithVersionOriginal}`);
          tryPaths.push(`docs/${featureGoalPathNoVersionOriginal}`);
        }
        
        // Standard node doc paths
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
        let currentLoadedFromPath: string | null = null;
        for (const path of tryPaths) {
          // Check if this is a local content path (starts with /local-content/)
          if (path.startsWith('/local-content/')) {
            // Try to fetch from public directory
            try {
              console.log('[DocViewer] 🔍 Attempting to fetch from local-content:', path);
              const response = await fetch(path, { cache: 'no-store' });
              console.log('[DocViewer] Response status:', response.status, 'OK:', response.ok);
              if (response.ok) {
                const contentLength = response.headers.get('content-length');
                console.log('[DocViewer] Content-Length header:', contentLength || 'not set');
                rawHtml = await response.text();
                currentLoadedFromPath = path;
                setLoadedFromPath(path);
                console.log('[DocViewer] ✓ Loaded from local-content:', path, `(${rawHtml.length} bytes)`);
                console.log('[DocViewer] First 300 chars:', rawHtml.substring(0, 300));
                if (rawHtml.length < 1000) {
                  console.error('[DocViewer] ⚠️ HTML seems too small! Expected ~37KB but got', rawHtml.length, 'bytes');
                  console.error('[DocViewer] Full response (first 1000 chars):', rawHtml.substring(0, 1000));
                }
                break;
              } else {
                const errorText = await response.text().catch(() => '');
                console.warn('[DocViewer] ✗ Failed to fetch from local-content:', path, 'Status:', response.status);
                console.warn('[DocViewer] Error response (first 200 chars):', errorText.substring(0, 200));
              }
            } catch (error) {
              console.error('[DocViewer] ❌ Error fetching from local-content:', path, error);
              // Continue to next path if local content fetch fails
              continue;
            }
          } else {
            // Try Supabase Storage
            const { data } = supabase.storage.from('bpmn-files').getPublicUrl(path);
            if (!data?.publicUrl) continue;
            const versionedUrl = `${data.publicUrl}?t=${Date.now()}`;
            const response = await fetch(versionedUrl, { cache: 'no-store' });
            if (!response.ok) continue;
            rawHtml = await response.text();
            currentLoadedFromPath = path;
            setLoadedFromPath(path);
            console.log('[DocViewer] ✓ Loaded from Supabase:', path, `(${rawHtml.length} bytes)`);
            break;
          }
        }

        if (!rawHtml) {
          console.error('[DocViewer] ✗ Failed to load HTML from any path. Tried:', tryPaths);
          throw new Error('Kunde inte hämta dokumentationen i valt läge eller legacy-läge.');
        }

        console.log('[DocViewer] ✓ HTML loaded successfully from:', currentLoadedFromPath || 'unknown', `(${rawHtml.length} bytes)`);
        console.log('[DocViewer] First 500 chars of raw HTML:', rawHtml.substring(0, 500));
        
        // Check if HTML seems truncated or incomplete
        if (rawHtml.length < 1000 && !rawHtml.includes('</html>')) {
          console.error('[DocViewer] ⚠️ HTML seems incomplete or truncated!');
          console.error('[DocViewer] Last 200 chars:', rawHtml.substring(Math.max(0, rawHtml.length - 200)));
        }

        // Sanitize HTML: Remove any script tags that might cause issues in iframe
        // Note: We don't add CSP here as it can be too restrictive and block content
        // Instead, we rely on iframe sandbox to prevent script execution
        let sanitizedHtml = rawHtml;
        
        // Remove any existing script tags (they shouldn't be in static documentation anyway)
        const scriptCount = (sanitizedHtml.match(/<script[^>]*>/gi) || []).length;
        if (scriptCount > 0) {
          console.warn('[DocViewer] Found', scriptCount, 'script tag(s) in HTML, removing them');
          sanitizedHtml = sanitizedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        }
        
        // Remove any existing base tags that might cause issues with relative URLs
        sanitizedHtml = sanitizedHtml.replace(/<base[^>]*>/gi, '');
        
        console.log('[DocViewer] ✓ HTML sanitized, final length:', sanitizedHtml.length, 'bytes');

        const metaMatch = sanitizedHtml.match(/<meta[^>]+name=["']x-generation-source["'][^>]*content=["']([^"']+)/i) || sanitizedHtml.match(/<!--\s*generation-source:([a-z0-9-_]+)\s*-->/i);
        if (metaMatch) {
          setGenerationSource(metaMatch[1]);
        } else {
          setGenerationSource('');
        }
        
        // Read template version from HTML metadata
        const templateVersionMatch = sanitizedHtml.match(/<meta[^>]+name=["']x-feature-goal-template-version["'][^>]*content=["']([^"']+)/i) || sanitizedHtml.match(/<!--\s*feature-goal-template-version:([v12]+)\s*-->/i);
        const detectedVersion = templateVersionMatch ? (templateVersionMatch[1] === 'v2' ? 'v2' : 'v1') : 'v1'; // Default to v1 if not found
        setTemplateVersion(detectedVersion);
        
        // Check if this is a Feature Goal (callActivity)
        // Feature Goals have docId format: nodes/bpmnFile/elementId
        // We can check HTML for Feature Goal badge, or check if this is a call activity node
        // For v2 files, we also check if the path includes feature-goals
        const hasFeatureGoalBadge = sanitizedHtml.includes('doc-badge">Feature Goal') || sanitizedHtml.includes('Feature Goal');
        // Use currentLoadedFromPath (local variable) if available, otherwise use loadedFromPath state
        // This ensures we check the path of the file we just loaded
        const finalLoadedFromPath = currentLoadedFromPath || loadedFromPath;
        const isFeatureGoalPath = isNodeDoc && finalLoadedFromPath?.includes('feature-goals');
        const isFeatureGoalDoc = isNodeDoc && (hasFeatureGoalBadge || isFeatureGoalPath);
        console.log('[DocViewer] Setting isFeatureGoal:', {
          isNodeDoc,
          hasFeatureGoalBadge,
          isFeatureGoalPath,
          loadedFromPath: loadedFromPath, // state
          currentLoadedFromPath, // local variable
          finalLoadedFromPath,
          isFeatureGoalDoc,
        });
        setIsFeatureGoal(isFeatureGoalDoc);
        
        // Store sanitized HTML (not raw, to avoid script injection issues)
        console.log('[DocViewer] Setting rawHtmlContent, length:', sanitizedHtml.length);
        setRawHtmlContent(sanitizedHtml);
        
        // Only reset user selection when loading a different document (not when switching versions)
        // Check if docId changed by comparing with previous docId
        if (userSelectedVersion && detectedVersion === userSelectedVersion) {
          // User selected version matches detected version, keep the selection
          // This means we successfully loaded the version the user wanted
        } else if (!userSelectedVersion) {
          // No user selection, set to detected version
          // This happens on initial load or when docId changes
        }
        // If userSelectedVersion is set and differs from detected, it means user wants a different version
        // Don't reset it, let the next fetch (triggered by dependency) load the correct file
        
        // HTML content is stored in rawHtmlContent state and used directly in iframe srcdoc
        // This avoids sandbox security warnings (no need for allow-same-origin) and React Refresh issues
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Okänt fel vid hämtning av dokumentation.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();

    return () => {
      // Cleanup blob URL if it exists (though we're not using it anymore)
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [docId, decoded, viewMode, variantsLoading, userSelectedVersion, templateVersion, bpmnFiles]);

  // Reset userSelectedVersion when docId changes (user navigates to different document)
  useEffect(() => {
    setUserSelectedVersion(null);
  }, [docId]);

  // Note: Re-rendering is no longer needed since we now read different files for v1 and v2
  // The fetchDoc useEffect will reload the document when userSelectedVersion changes

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
              
              {/* Feature Goal Template Version Selection */}
              {isFeatureGoal && (
                <div className="flex flex-wrap gap-2 text-xs ml-2 pl-2 border-l">
                  <span className="text-xs text-muted-foreground self-center">Template:</span>
                  <Button
                    size="sm"
                    variant={templateVersion === 'v1' ? 'default' : 'outline'}
                    onClick={() => {
                      // Only set userSelectedVersion, let useEffect handle the re-render and templateVersion update
                      setUserSelectedVersion('v1');
                    }}
                    aria-pressed={templateVersion === 'v1'}
                  >
                    v1
                  </Button>
                  <Button
                    size="sm"
                    variant={templateVersion === 'v2' ? 'default' : 'outline'}
                    onClick={() => {
                      // Only set userSelectedVersion, let useEffect handle the re-render and templateVersion update
                      setUserSelectedVersion('v2');
                    }}
                    aria-pressed={templateVersion === 'v2'}
                  >
                    v2
                  </Button>
                </div>
              )}
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

          {!loading && !error && rawHtmlContent ? (
            <div className="rounded-lg border overflow-hidden bg-card">
              <iframe
                key={`${docId}-${templateVersion}`}
                srcDoc={rawHtmlContent}
                className="w-full min-h-[80vh] bg-white"
                title={prettyTitle || 'Dokumentation'}
                sandbox="allow-same-origin allow-scripts allow-forms"
                // Note: allow-same-origin is needed for srcdoc to work properly
                // The sandbox still provides isolation, and we've removed script tags from HTML
                onLoad={() => {
                  console.log('[DocViewer] ✓ Iframe loaded successfully');
                }}
                onError={(e) => {
                  console.error('[DocViewer] ✗ Iframe error:', e);
                }}
              />
            </div>
          ) : !loading && !error ? (
            <div className="max-w-2xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 font-semibold">
                ⚠️ Inget innehåll att visa
              </p>
              <p className="text-sm text-yellow-600 mt-2">
                Debug info: loading={String(loading)}, error={error || 'null'}, rawHtmlContent={rawHtmlContent ? `exists (${rawHtmlContent.length} bytes)` : 'null'}
              </p>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default DocViewer;
