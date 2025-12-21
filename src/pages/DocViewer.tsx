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
  const [_, baseName = '', elementSegment = ''] = isNodeDoc ? safeDocId.split('/') : [null, safeDocId];
  const prettyTitle = isNodeDoc
    ? `${elementSegment.replace(/-/g, ' ')}`
    : decoded.replace(/-/g, ' ');
  const prettySubtitle = isNodeDoc
    ? `BPMN-fil: ${baseName.replace(/-/g, ' ')}`
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

  const activeMode: 'claude' | 'ollama' =
    viewMode === 'auto' ? 'claude' : viewMode === 'chatgpt' ? 'claude' : viewMode;

  const resolveModeFolder = () => {
    if (viewMode === 'auto') {
      // Auto-läge används endast innan vi vet vilka varianter som finns.
      // Tills dess: försök med legacy-sökning.
      if (!generationSource) return null;
      if (generationSource === 'llm-slow-chatgpt' || generationSource === 'llm-slow-claude') return 'claude';
      if (generationSource === 'llm-slow-ollama') return 'ollama';
      if (generationSource.startsWith('llm-slow')) return 'claude'; // Default to claude for legacy
      if (generationSource.startsWith('llm-fast')) return 'claude'; // Default to claude for legacy
      return null;
    }
    if (viewMode === 'chatgpt' || viewMode === 'claude') return 'claude';
    if (viewMode === 'ollama') return 'ollama';
    return null;
  };

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

        const modeFolder = resolveModeFolder();
        const tryPaths: string[] = [];
        
        // For node docs that are Feature Goals (process nodes or callActivities)
        // Build Feature Goal path directly based on docId
        let isCallActivity = false;
        let nodeContext: ReturnType<typeof buildNodeDocumentationContext> | null = null;
        let featureGoalPath: string | undefined = undefined;
        let featureGoalBpmnFile: string | undefined = undefined;
        let parentBpmnFile: string | undefined = undefined;
        
        if (isNodeDoc && baseName && elementSegment) {
          // First, check if this is a callActivity or process by resolving from BPMN process graph
          try {
            // Get version hash for the file
            const versionHash = await getVersionHashForFile(baseName + '.bpmn');
            const versionHashes = new Map<string, string | null>();
            versionHashes.set(baseName + '.bpmn', versionHash);
            const graph = await buildBpmnProcessGraph(baseName + '.bpmn', bpmnFiles, versionHashes);
            
            // Try to find the node - first try as element node, then as root process node
            let nodeId = `${baseName}.bpmn::${elementSegment}`;
            nodeContext = buildNodeDocumentationContext(graph, nodeId);
            
            // If not found, try as root process node (for subprocess files, the root process node has ID "root:filename")
            if (!nodeContext) {
              const rootNodeId = `root:${baseName}.bpmn`;
              nodeContext = buildNodeDocumentationContext(graph, rootNodeId);
            }
            
            if (nodeContext?.node.type === 'callActivity') {
              isCallActivity = true;
            } else if (nodeContext?.node.type === 'process') {
              isCallActivity = true;
            }
          } catch (error) {
            // If we can't check from process graph, try bpmn-map.json as fallback
            try {
              const bpmnMap = loadBpmnMap(bpmnMapData);
              const matchResult = matchCallActivityUsingMap(
                { id: elementSegment, name: undefined, calledElement: undefined },
                baseName + '.bpmn',
                bpmnMap
              );
              if (matchResult.matchedFileName) {
                isCallActivity = true;
              }
            } catch (mapError) {
              // Silent fail
            }
          }
        }
        
        // For node docs that are Feature Goals (process nodes or callActivities)
        // Check if this is a process node or callActivity
        const isProcessNode = nodeContext?.node.type === 'process';
        const shouldTryFeatureGoal = isNodeDoc && baseName && elementSegment && (isCallActivity || isProcessNode);
        
        if (shouldTryFeatureGoal) {
          
          // For call activities, we need to resolve the subprocessFile (the actual BPMN file for the subprocess)
          // For process nodes in subprocess files, the subprocessFile is the file itself
          // This matches how bpmnGenerators.ts creates Feature Goal filenames
          featureGoalBpmnFile = baseName;
          parentBpmnFile = undefined;
          
          if (isProcessNode) {
            // For process nodes: nodeContext.node.bpmnFile should be the subprocess file
            // e.g., mortgage-se-internal-data-gathering.bpmn (not mortgage-se-application.bpmn)
            if (nodeContext?.node.bpmnFile && nodeContext.node.bpmnFile !== baseName + '.bpmn') {
              // nodeContext.node.bpmnFile is the subprocess file
              featureGoalBpmnFile = nodeContext.node.bpmnFile.replace('.bpmn', '');
            } else {
              // Fallback: construct subprocess file name from baseName and elementSegment
              // For mortgage-se-application/internal-data-gathering:
              // subprocess file = mortgage-se-internal-data-gathering
              featureGoalBpmnFile = `${baseName}-${elementSegment}`;
            }
            parentBpmnFile = baseName + '.bpmn'; // Parent is where the process is referenced (for version hash)
          } else {
            // For call activities, try to resolve subprocessFile from bpmn-map.json first (fastest and most reliable)
            try {
              console.log('[DocViewer] 🔍 Resolving subprocessFile for callActivity:', baseName, elementSegment);
              const bpmnMap = loadBpmnMap(bpmnMapData);
              const matchResult = matchCallActivityUsingMap(
                { id: elementSegment, name: undefined, calledElement: undefined },
                baseName + '.bpmn',
                bpmnMap
              );
              
              if (matchResult.matchedFileName) {
                featureGoalBpmnFile = matchResult.matchedFileName.replace('.bpmn', '');
                parentBpmnFile = baseName + '.bpmn'; // Parent is where call activity is defined
                console.log('[DocViewer] ✓ Found subprocessFile from bpmn-map.json:', featureGoalBpmnFile);
              } else {
                // Fallback: Use nodeContext we already have from above (if available)
                if (nodeContext?.node.type === 'callActivity' && nodeContext.node.subprocessFile) {
                  featureGoalBpmnFile = nodeContext.node.subprocessFile.replace('.bpmn', '');
                  parentBpmnFile = baseName + '.bpmn'; // Parent is where call activity is defined
                  console.log('[DocViewer] ✓ Found subprocessFile from process graph (reused):', featureGoalBpmnFile);
                } else {
                  parentBpmnFile = baseName + '.bpmn'; // Still use baseName as parent
                  console.log('[DocViewer] Using baseName (no subprocessFile found):', featureGoalBpmnFile);
                }
              }
            } catch (error) {
              // If we can't resolve subprocessFile, fall back to using baseName
              parentBpmnFile = baseName + '.bpmn';
              console.warn('[DocViewer] Could not resolve subprocessFile, using baseName:', error);
            }
          }
          
          // Build Feature Goal path using getFeatureGoalDocFileKey
          // For process nodes: NO parent (getFeatureGoalDocFileKey will use subprocess file name directly)
          // For call activities: use parent for hierarchical naming
          featureGoalPath = getFeatureGoalDocFileKey(
            featureGoalBpmnFile, // subprocess BPMN file
            elementSegment, // elementId
            undefined, // no version suffix
            isProcessNode ? undefined : parentBpmnFile // NO parent for process nodes, use parent for call activities
          );
          
          // Try versioned paths first (new structure with version hash)
          // For process nodes: use subprocess file (featureGoalBpmnFile)
          // For call activities: use parent file (where call activity is defined)
          try {
            // VIKTIGT: För process nodes ska vi använda PARENT filen (mortgage-se-application.bpmn), 
            // inte subprocess filen (mortgage-se-internal-data-gathering.bpmn)!
            // Eftersom filen är sparad under mortgage-se-application.bpmn/versionHash/feature-goals/...
            const bpmnFileForVersion = isProcessNode 
              ? (baseName + '.bpmn') // For process nodes, use the PARENT file (where the process is referenced)
              : (parentBpmnFile || baseName + '.bpmn'); // For call activities, use parent file
            // Use selected version if available, otherwise current version
            const versionHash = await getVersionHashForFile(bpmnFileForVersion);
            
            if (versionHash) {
              // NOTE: When saving, buildDocStoragePaths uses the full path including 'feature-goals/'
              // So we need to keep 'feature-goals/' in the path when using version hash
              const docFileName = featureGoalPath; // Keep 'feature-goals/' prefix (hierarchical naming with parent)
              
              // Determine provider from modeFolder (claude = cloud, ollama = local LLM)
              const provider = modeFolder === 'claude' ? 'claude' : modeFolder === 'ollama' ? 'ollama' : null;
              
              // VIKTIGT: Filen är sparad MED .bpmn i sökvägen, så vi behåller .bpmn
              const bpmnFileNameForPath = bpmnFileForVersion.endsWith('.bpmn') ? bpmnFileForVersion : `${bpmnFileForVersion}.bpmn`;
              
              if (modeFolder && (modeFolder === 'claude' || modeFolder === 'ollama')) {
                if (provider === 'claude') {
                  tryPaths.unshift(`docs/claude/${bpmnFileNameForPath}/${versionHash}/${docFileName}`);
                } else if (provider === 'ollama') {
                  tryPaths.unshift(`docs/ollama/${bpmnFileNameForPath}/${versionHash}/${docFileName}`);
                }
              } else {
                // Auto mode: try all providers, prioritize claude
                tryPaths.unshift(`docs/claude/${bpmnFileNameForPath}/${versionHash}/${docFileName}`);
                tryPaths.unshift(`docs/ollama/${bpmnFileNameForPath}/${versionHash}/${docFileName}`);
              }
            } else {
              console.log('[DocViewer] ⚠️ No version hash found for', bpmnFileForVersion);
            }
          } catch (error) {
            // Silent fail
          }
          
          // Always add non-versioned Feature Goal paths (even if modeFolder is null)
          if (modeFolder) {
            tryPaths.push(`docs/${modeFolder}/${featureGoalPath}`);
          } else {
            // If modeFolder is null (auto mode), try all possible paths
            // Prioritize claude (most common), then ollama
            tryPaths.push(`docs/claude/${featureGoalPath}`);
            tryPaths.push(`docs/ollama/${featureGoalPath}`);
          }
          // Also try without mode folder
          tryPaths.push(`docs/${featureGoalPath}`);
          
          console.log('[DocViewer] 🎯 Feature Goal paths:', tryPaths.slice(0, 5).join(', '), '... (total:', tryPaths.length, ')');
        } else {
          // Standard node doc paths (only if NOT a Feature Goal)
          // Feature Goals should ONLY use Feature Goal paths above
          if (isNodeDoc && baseName) {
            try {
              const bpmnFile = baseName + '.bpmn';
              const docFileName = `${safeDocId}.html`;
              
              // Use selected version if available, otherwise current version
              const versionHash = await getVersionHashForFile(bpmnFile);
              
              if (versionHash) {
                // VIKTIGT: buildDocStoragePaths använder bpmnFileName MED .bpmn extension
                // Så vi måste använda bpmnFile (med .bpmn) istället för baseName (utan .bpmn)
                // Try all providers if modeFolder is null (auto mode)
                if (!modeFolder || modeFolder === 'claude' || modeFolder === 'ollama') {
                  // Prioritize claude (most common), then ollama
                  tryPaths.unshift(`docs/claude/${bpmnFile}/${versionHash}/${docFileName}`);
                  tryPaths.unshift(`docs/ollama/${bpmnFile}/${versionHash}/${docFileName}`);
                } else if (modeFolder) {
                  if (modeFolder === 'claude') {
                    tryPaths.unshift(`docs/claude/${bpmnFile}/${versionHash}/${docFileName}`);
                  } else if (modeFolder === 'ollama') {
                    tryPaths.unshift(`docs/ollama/${bpmnFile}/${versionHash}/${docFileName}`);
                  }
                }
              }
            } catch (error) {
              // Silent fail
            }
          }
        }
        
        // Add non-versioned paths
        if (modeFolder) {
          tryPaths.push(`docs/${modeFolder}/${safeDocId}.html`);
        } else {
          // If modeFolder is null (auto mode), try all possible paths
          // Prioritize claude (most common), then ollama
          tryPaths.push(`docs/claude/${safeDocId}.html`);
          tryPaths.push(`docs/ollama/${safeDocId}.html`);
        }
        // Sista fallback: legacy utan modesubkatalog
        tryPaths.push(`docs/${safeDocId}.html`);

        let rawHtml: string | null = null;
        let currentLoadedFromPath: string | null = null;
        
        // First, filter paths to only check those that actually exist
        // This avoids unnecessary fetch requests that cause 400 errors
        const existingPaths: string[] = [];
        for (const path of tryPaths) {
          const exists = await storageFileExists(path);
          if (exists) {
            existingPaths.push(path);
          }
        }
        
        // Now try to load from existing paths only
        for (const path of existingPaths) {
          try {
            // Use download() directly instead of getPublicUrl() + fetch() to avoid v1 API issues
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('bpmn-files')
              .download(path);
            
            if (!downloadError && fileData) {
              rawHtml = await fileData.text();
              currentLoadedFromPath = path;
              setLoadedFromPath(path);
              if (path.includes('feature-goals')) {
                console.log('[DocViewer] ✅ Feature Goal loaded from:', path);
              }
              break;
            }
          } catch (error) {
            // Continue to next path if this one fails
            if (import.meta.env.DEV) {
              console.debug('[DocViewer] Failed to load from', path, error);
            }
            continue;
          }
        }

        if (!rawHtml) {
          console.error('[DocViewer] ✗ Failed to load HTML from any path. Tried:', tryPaths);
          console.error('[DocViewer] Debug info:', {
            docId,
            decoded,
            safeDocId,
            isNodeDoc,
            baseName,
            elementSegment,
            isCallActivity,
            modeFolder,
            viewMode,
            generationSource,
            featureGoalPath: isCallActivity ? featureGoalPath : undefined,
            featureGoalBpmnFile: isCallActivity ? featureGoalBpmnFile : undefined,
            parentBpmnFile: isCallActivity ? parentBpmnFile : undefined,
          });
          
          // Log all tried paths with their public URLs for debugging
          if (import.meta.env.DEV && tryPaths.length > 0) {
            console.log('[DocViewer] Checking public URLs for first 5 paths:');
            for (let i = 0; i < Math.min(5, tryPaths.length); i++) {
              const path = tryPaths[i];
              const { data } = supabase.storage.from('bpmn-files').getPublicUrl(path);
              console.log(`  [${i + 1}] ${path}`);
              console.log(`      Public URL: ${data?.publicUrl || 'N/A'}`);
            }
          }
          
          // Check if BPMN file exists in database
          let bpmnFileExists = false;
          let versionHashStatus = 'unknown';
          if (baseName) {
            try {
              const bpmnFileName = baseName + '.bpmn';
              const { data: fileData, error: fileError } = await supabase
                .from('bpmn_files')
                .select('file_name, current_version_hash')
                .eq('file_name', bpmnFileName)
                .maybeSingle();
              
              if (fileError) {
                console.warn('[DocViewer] Could not check if BPMN file exists:', fileError);
              } else if (fileData) {
                bpmnFileExists = true;
                versionHashStatus = fileData.current_version_hash ? 'exists' : 'missing';
                console.log('[DocViewer] BPMN file status:', {
                  fileName: bpmnFileName,
                  exists: true,
                  hasVersionHash: !!fileData.current_version_hash,
                });
              } else {
                bpmnFileExists = false;
                console.warn('[DocViewer] BPMN file not found in database:', bpmnFileName);
              }
            } catch (error) {
              console.warn('[DocViewer] Error checking BPMN file:', error);
            }
          }
          
          // Build a more helpful error message
          let errorMessage = `Kunde inte hämta dokumentationen för "${elementSegment || docId}".\n\n`;
          errorMessage += `Försökte ${tryPaths.length} olika sökvägar:\n`;
          errorMessage += tryPaths.slice(0, 5).map(p => `  • ${p}`).join('\n');
          if (tryPaths.length > 5) {
            errorMessage += `\n  ...och ${tryPaths.length - 5} fler`;
          }
          errorMessage += `\n\n`;
          
          // Add diagnostic information
          if (baseName) {
            const bpmnFileName = baseName + '.bpmn';
            if (!bpmnFileExists) {
              errorMessage += `⚠️ BPMN-filen "${bpmnFileName}" hittades inte i databasen.\n`;
              errorMessage += `   Detta kan betyda att filen inte har laddats upp korrekt.\n\n`;
            } else if (versionHashStatus === 'missing') {
              errorMessage += `⚠️ BPMN-filen "${bpmnFileName}" finns i databasen men saknar version hash.\n`;
              errorMessage += `   Detta kan betyda att filen behöver laddas upp igen eller att versionering inte är aktiverad.\n\n`;
            }
          }
          
          if (isCallActivity) {
            errorMessage += `Detta verkar vara en Call Activity eller Process-nod (Feature Goal). `;
            errorMessage += `Kontrollera att Feature Goal-dokumentationen har genererats.\n\n`;
          } else {
            errorMessage += `Detta verkar vara en vanlig nod. `;
            errorMessage += `Kontrollera att dokumentationen har genererats för denna nod.\n\n`;
          }
          
          errorMessage += `Tips:\n`;
          errorMessage += `  • Generera dokumentation för denna nod via BPMN File Manager\n`;
          errorMessage += `  • Kontrollera att noden finns i BPMN-filen "${baseName}.bpmn"\n`;
          if (isCallActivity) {
            errorMessage += `  • För Call Activities/Process-noder, kontrollera att subprocess-filen finns och att dokumentation har genererats\n`;
            errorMessage += `  • Om filen är en subprocess-fil, se till att generera dokumentation för den specifika filen\n`;
          }
          
          throw new Error(errorMessage);
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
        
        // Check if this is a Feature Goal (callActivity)
        // Feature Goals have docId format: nodes/bpmnFile/elementId
        // We can check HTML for Feature Goal badge, or check if this is a call activity node
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
