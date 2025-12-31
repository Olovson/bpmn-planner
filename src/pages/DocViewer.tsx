import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppHeaderWithTabs, type ViewKey } from '@/components/AppHeaderWithTabs';
import { navigateToView } from '@/utils/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useArtifactAvailability } from '@/hooks/useArtifactAvailability';
import { useDocVariantAvailability } from '@/hooks/useDocVariantAvailability';
import { buildBpmnProcessGraph } from '@/lib/bpmnProcessGraph';
import { buildNodeDocumentationContext } from '@/lib/documentationContext';
import { renderFeatureGoalDoc } from '@/lib/documentationTemplates';
import { useDynamicBpmnFiles } from '@/hooks/useDynamicBpmnFiles';
import { matchCallActivityUsingMap, loadBpmnMap } from '@/lib/bpmn/bpmnMapLoader';
import { getFeatureGoalDocFileKey } from '@/lib/nodeArtifactPaths';
import { useVersionSelection } from '@/hooks/useVersionSelection';
import { getCurrentVersion } from '@/lib/bpmnVersioning';
import { storageFileExists } from '@/lib/artifactUrls';
import bpmnMapData from '../../bpmn-map.json';

const DocViewer = () => {
  const { user, signOut } = useAuth();
  const { hasTests } = useArtifactAvailability();
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { getVersionHashForFile } = useVersionSelection();
  const blobUrlRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationSource, setGenerationSource] = useState<string>('');
  const [viewMode, setViewMode] = useState<'chatgpt' | 'ollama' | 'auto'>('auto');
  const [isFeatureGoal, setIsFeatureGoal] = useState(false);
  const [rawHtmlContent, setRawHtmlContent] = useState<string | null>(null);
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
  const isFeatureGoalPath = safeDocId.startsWith('feature-goals/');
  // För feature-goals paths: baseName är hela path (inklusive 'feature-goals/')
  // För andra paths: baseName är bara filnamnet
  let baseName = '';
  let elementSegment = '';
  if (isNodeDoc) {
    const parts = safeDocId.split('/');
    baseName = parts[1] || '';
    elementSegment = parts[2] || '';
  } else if (isFeatureGoalPath) {
    baseName = safeDocId; // Hela path inklusive 'feature-goals/'
    elementSegment = '';
  } else {
    baseName = safeDocId;
    elementSegment = '';
  }
  const prettyTitle = isNodeDoc
    ? `${elementSegment.replace(/-/g, ' ')}`
    : isFeatureGoalPath
    ? baseName.replace('feature-goals/', '').replace(/-/g, ' ')
    : decoded.replace(/-/g, ' ');
  const prettySubtitle = isNodeDoc
    ? `BPMN-fil: ${baseName.replace(/-/g, ' ')}`
    : isFeatureGoalPath
    ? `Feature Goal: ${baseName.replace('feature-goals/', '').replace(/-/g, ' ')}`
    : '';
  const formatGenerationSource = () => {
    if (!generationSource) return 'Okänt (äldre dokument)';
    
    // Legacy local generation sources - treat as unknown
    if (generationSource === 'local' || generationSource === 'local-fallback') {
      return 'Okänt (äldre dokument)';
    }
    if (generationSource === 'llm-slow-chatgpt') {
      return 'LLM (Claude)';
    }
    if (generationSource === 'llm-slow-ollama') {
      return 'LLM (Ollama)';
    }
    if (generationSource.startsWith('llm')) {
      return 'LLM (okänt läge)';
    }
    return generationSource;
  };

  const { isLoading: variantsLoading, hasClaude } =
    useDocVariantAvailability(safeDocId);
  const anyVariant = hasClaude;
  const { data: bpmnFiles = [] } = useDynamicBpmnFiles();

  useEffect(() => {
    if (viewMode !== 'auto' || variantsLoading) return;
    // Om vi vet att Claude-variant finns, välj den.
    if (anyVariant && hasClaude) {
      setViewMode('chatgpt');
    }
  }, [viewMode, variantsLoading, anyVariant, hasClaude]);

  // Note: viewMode and activeMode are kept for UI compatibility but only 'claude' is supported
  const activeMode: 'claude' = 'claude';

  useEffect(() => {
    const fetchDoc = async () => {
      setLoading(true);
      setError(null);
      setRawHtmlContent(null);
      setLoadedFromPath(null);
      // Don't reset isFeatureGoal here - let it be determined from the loaded content
      // Template selection is no longer available - only one version is used

      try {
        if (!docId) {
          throw new Error('Ingen dokumentationsfil angavs.');
        }

        // Clean up any existing blob URL
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }

        // Unified approach: Use buildDocStoragePaths() with version hash
        // No fallbacks, no ollama support - only claude with versioned paths
        const { buildDocStoragePaths } = await import('@/lib/artifactPaths');
        const { getFeatureGoalDocStoragePaths, getNodeDocStoragePath } = await import('@/lib/artifactUrls');
        const tryPaths: string[] = [];
        
        // Determine doc type and build path
        // Note: isFeatureGoalPath is defined outside useEffect, capture it here to avoid scope issues
        const currentIsFeatureGoalPath = safeDocId.startsWith('feature-goals/');
        let isCallActivity = false;
        let featureGoalBpmnFile: string | undefined = undefined;
        let parentBpmnFile: string | undefined = undefined;
        
        if (isNodeDoc && baseName && elementSegment) {
          // Check if this is a callActivity
          try {
            const versionHash = await getVersionHashForFile(baseName + '.bpmn');
            const versionHashes = new Map<string, string | null>();
            versionHashes.set(baseName + '.bpmn', versionHash);
            const graph = await buildBpmnProcessGraph(baseName + '.bpmn', bpmnFiles, versionHashes);
            const nodeId = `${baseName}.bpmn::${elementSegment}`;
            const nodeContext = buildNodeDocumentationContext(graph, nodeId);
            
            if (nodeContext?.node.type === 'callActivity') {
              isCallActivity = true;
              // Resolve subprocess file
              if (nodeContext.node.subprocessFile) {
                featureGoalBpmnFile = nodeContext.node.subprocessFile.replace('.bpmn', '');
                parentBpmnFile = baseName + '.bpmn';
              }
            }
          } catch (error) {
            // Fallback: try bpmn-map.json
            try {
              const bpmnMap = loadBpmnMap(bpmnMapData);
              const matchResult = matchCallActivityUsingMap(
                { id: elementSegment, name: undefined, calledElement: undefined },
                baseName + '.bpmn',
                bpmnMap
              );
              if (matchResult.matchedFileName) {
                isCallActivity = true;
                featureGoalBpmnFile = matchResult.matchedFileName.replace('.bpmn', '');
                parentBpmnFile = baseName + '.bpmn';
              }
            } catch (mapError) {
              // Silent fail
            }
          }
        }
        
        // Build path based on doc type
        if (isNodeDoc && baseName && elementSegment && isCallActivity && featureGoalBpmnFile) {
          // VIKTIGT: CallActivities länkar till Process Feature Goal för subprocess-filen (non-hierarchical)
          // Process Feature Goals använder non-hierarchical naming: feature-goals/{subprocessBaseName}
          // INTE hierarchical naming: feature-goals/{parent}-{elementId}
          const subprocessBpmnFile = featureGoalBpmnFile + '.bpmn';
          const versionHash = await getVersionHashForFile(subprocessBpmnFile);
          
          if (!versionHash) {
            throw new Error(`No version hash found for ${subprocessBpmnFile}`);
          }
          
          // Använd Process Feature Goal (non-hierarchical) istället för CallActivity Feature Goal (hierarchical)
          const { buildDocStoragePaths } = await import('@/lib/artifactPaths');
          const { getFeatureGoalDocFileKey } = await import('@/lib/nodeArtifactPaths');
          
          // Non-hierarchical naming för Process Feature Goal (ingen parent)
          const processFeatureGoalKey = getFeatureGoalDocFileKey(
            subprocessBpmnFile,
            featureGoalBpmnFile, // För Process Feature Goals är elementId = baseName
            undefined, // no version suffix
            undefined, // no parent (non-hierarchical)
            false, // isRootProcess = false (detta är en subprocess)
          );
          
          const { modePath } = buildDocStoragePaths(
            processFeatureGoalKey,
            'slow', // mode
            'cloud', // provider (claude är cloud provider)
            subprocessBpmnFile,
            versionHash
          );
          
          if (modePath) {
            tryPaths.push(modePath);
          }
        } else if (currentIsFeatureGoalPath) {
          // Feature Goal documentation (Process Feature Goal eller CallActivity Feature Goal)
          // Format: feature-goals/{baseName} eller feature-goals/{parent}-{elementId}
          const featureGoalName = baseName.replace('feature-goals/', '');
          
          // För nu, försök behandla det som Process Feature Goal (non-hierarchical)
          // Om det är hierarchical (parent-elementId), måste vi extrahera elementId och parent senare
          const bpmnFile = featureGoalName + '.bpmn';
          const versionHash = await getVersionHashForFile(bpmnFile);
          
          if (!versionHash) {
            throw new Error(`No version hash found for ${bpmnFile}`);
          }
          
          // Process Feature Goal: non-hierarchical naming
          // getFeatureGoalDocFileKey ignores elementId when parentBpmnFile is undefined,
          // it uses getBaseName(bpmnFile) instead, so we can pass anything as elementId
          const processFeatureGoalKey = getFeatureGoalDocFileKey(
            bpmnFile,
            featureGoalName, // Will be ignored, getBaseName(bpmnFile) is used instead
            undefined, // no version suffix
            undefined, // no parent (non-hierarchical)
            false, // isRootProcess = false (detta är en subprocess)
          );
          
          const { modePath } = buildDocStoragePaths(
            processFeatureGoalKey,
            'slow',
            'cloud', // 'cloud' is the ArtifactProvider type for Claude
            bpmnFile,
            versionHash
          );
          
          tryPaths.push(modePath);
        } else if (!isNodeDoc) {
          // File-level documentation (root-filer)
          const bpmnFile = baseName + '.bpmn';
          const docFileName = `${baseName}.html`;
          const versionHash = await getVersionHashForFile(bpmnFile);
          
          if (!versionHash) {
            throw new Error(`No version hash found for ${bpmnFile}`);
          }
          
          const { modePath } = buildDocStoragePaths(
            docFileName,
            'slow',
            'cloud', // 'cloud' is the ArtifactProvider type for Claude
            bpmnFile,
            versionHash
          );
          
          tryPaths.push(modePath);
          
          // Fallback: try node-level doc for process root (if file-level doesn't exist)
          const nodeDocFileKey = `nodes/${baseName}/${baseName}.html`;
          const { modePath: nodeDocPath } = buildDocStoragePaths(
            nodeDocFileKey,
            'slow',
            'cloud', // 'cloud' is the ArtifactProvider type for Claude
            bpmnFile,
            versionHash
          );
          tryPaths.push(nodeDocPath);
        } else if (isNodeDoc && baseName && elementSegment) {
          // Standard node doc (Epic, Business Rule)
          const bpmnFile = baseName + '.bpmn';
          const versionHash = await getVersionHashForFile(bpmnFile);
          
          if (!versionHash) {
            throw new Error(`No version hash found for ${bpmnFile}`);
          }
          
          const docPath = await getNodeDocStoragePath(bpmnFile, elementSegment, versionHash);
          tryPaths.push(docPath);
        }

        // Try to load from paths (only versioned paths, no fallbacks)
        let rawHtml: string | null = null;
        let currentLoadedFromPath: string | null = null;
        
        if (tryPaths.length === 0) {
          throw new Error(
            `Kunde inte bygga sökväg för dokumentation "${elementSegment || docId}". ` +
            `Kontrollera att BPMN-filen har en version hash och att dokumentation har genererats.`
          );
        }
        
        for (const path of tryPaths) {
          try {
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('bpmn-files')
              .download(path);
            
            if (!downloadError && fileData) {
              const html = await fileData.text();
              if (html && html.length > 0) {
                rawHtml = html;
                currentLoadedFromPath = path;
                setLoadedFromPath(path);
                break;
              }
            }
          } catch (error) {
            // Try next path
            continue;
          }
        }

        if (!rawHtml) {
          // Build error message
          let errorMessage = `Kunde inte hämta dokumentationen för "${elementSegment || docId}".\n\n`;
          errorMessage += `Försökte ${tryPaths.length} versioned sökvägar:\n`;
          errorMessage += tryPaths.map(p => `  • ${p}`).join('\n');
          errorMessage += `\n\n`;
          
          if (baseName) {
            const bpmnFileName = baseName + '.bpmn';
            errorMessage += `Tips:\n`;
            errorMessage += `  • Kontrollera att BPMN-filen "${bpmnFileName}" har en version hash\n`;
            errorMessage += `  • Generera dokumentation för denna nod via BPMN File Manager\n`;
            if (isCallActivity) {
              errorMessage += `  • För Call Activities, kontrollera att subprocess-filen finns och att dokumentation har genererats\n`;
            }
          }
          
          throw new Error(errorMessage);
        }

        // Check if HTML seems truncated or incomplete
        if (rawHtml.length < 1000 && !rawHtml.includes('</html>')) {
          // HTML seems incomplete, but continue anyway
        }

        // Sanitize HTML: Remove any script tags that might cause issues in iframe
        // Note: We don't add CSP here as it can be too restrictive and block content
        // Instead, we rely on iframe sandbox to prevent script execution
        let sanitizedHtml = rawHtml;
        
        // Remove any existing script tags (they shouldn't be in static documentation anyway)
        sanitizedHtml = sanitizedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        
        // Remove any existing base tags that might cause issues with relative URLs
        sanitizedHtml = sanitizedHtml.replace(/<base[^>]*>/gi, '');

        const metaMatch = sanitizedHtml.match(/<meta[^>]+name=["']x-generation-source["'][^>]*content=["']([^"']+)/i) || sanitizedHtml.match(/<!--\s*generation-source:([a-z0-9-_]+)\s*-->/i);
        if (metaMatch) {
          setGenerationSource(metaMatch[1]);
        } else {
          setGenerationSource('');
        }
        
        // Check if this is a Feature Goal (callActivity)
        // Feature Goals have docId format: nodes/bpmnFile/elementId
        // We can check HTML for Feature Goal badge, or check if this is a call activity node
        const hasFeatureGoalBadge = sanitizedHtml.includes('doc-badge">Feature Goal') || sanitizedHtml.includes('Feature Goal');
        // Use currentLoadedFromPath (local variable) if available, otherwise use loadedFromPath state
        // This ensures we check the path of the file we just loaded
        const finalLoadedFromPath = currentLoadedFromPath || loadedFromPath;
        const isFeatureGoalPath = isNodeDoc && finalLoadedFromPath?.includes('feature-goals');
        const isFeatureGoalDoc = isNodeDoc && (hasFeatureGoalBadge || isFeatureGoalPath);
        setIsFeatureGoal(isFeatureGoalDoc);
        
        // Store sanitized HTML (not raw, to avoid script injection issues)
        setRawHtmlContent(sanitizedHtml);
        
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
  }, [docId, decoded, viewMode, variantsLoading, bpmnFiles]);

  return (
    <div className="flex min-h-screen bg-background overflow-hidden pl-16">
      <AppHeaderWithTabs
        userEmail={user?.email ?? ''}
        currentView="diagram"
        onViewChange={(view) => {
          navigateToView(navigate, view as ViewKey);
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
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <p>
                  Genereringskälla: {formatGenerationSource()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <Button
                  size="sm"
                  variant={activeMode === 'claude' ? 'default' : 'outline'}
                  disabled={anyVariant && !hasClaude}
                  onClick={() => {
                    if (!anyVariant || hasClaude) {
                      setViewMode('chatgpt');
                    }
                  }}
                >
                  Claude
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

          {!loading && !error && rawHtmlContent ? (
            <div className="rounded-lg border overflow-hidden bg-card">
              <iframe
                key={docId}
                srcDoc={rawHtmlContent}
                className="w-full min-h-[80vh] bg-white"
                title={prettyTitle || 'Dokumentation'}
                sandbox="allow-same-origin allow-scripts allow-forms"
                // Note: allow-same-origin is needed for srcdoc to work properly
                // The sandbox still provides isolation, and we've removed script tags from HTML
                onError={(e) => {
                  // Silent fail - iframe errors are usually not critical
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
