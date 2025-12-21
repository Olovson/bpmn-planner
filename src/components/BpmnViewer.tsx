import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BpmnJS from 'bpmn-js/lib/NavigatedViewer';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import { Button } from '@/components/ui/button';
import { Upload, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BpmnMapping } from '@/hooks/useBpmnMappings';
import { useTestResults } from '@/hooks/useTestResults';
import { useBpmnSelection } from '@/contexts/BpmnSelectionContext';
import { useDynamicBpmnFiles, getBpmnFileUrl } from '@/hooks/useDynamicBpmnFiles';
import { useVersionSelection } from '@/hooks/useVersionSelection';
import { supabase } from '@/integrations/supabase/client';
import { useProcessTree } from '@/hooks/useProcessTree';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { buildSubprocessNavigationMap } from '@/lib/processTreeNavigation';
import type { ProcessTreeNode } from '@/lib/processTree';
import { elementResourceMapping } from '@/data/elementResourceMapping';
import { buildBreadcrumbPath } from '@/lib/breadcrumbNavigation';
import { BpmnBreadcrumb } from './BpmnBreadcrumb';

interface BpmnViewerProps {
  onElementSelect?: (elementId: string | null, elementType?: string | null, elementName?: string | null) => void;
  onFileChange?: (fileName: string) => void;
  bpmnMappings?: Record<string, BpmnMapping>;
  initialFileName?: string;
}

interface BpmnHistoryItem {
  fileName: string;
  xml: string;
}

// Load mappings from localStorage
const loadMappings = (): Record<string, { bpmnFile?: string }> => {
  const stored = localStorage.getItem('bpmn-node-mappings');
  return stored ? JSON.parse(stored) : {};
};

// Save mappings to localStorage
const saveMappings = (mappings: Record<string, { bpmnFile?: string }>) => {
  localStorage.setItem('bpmn-node-mappings', JSON.stringify(mappings));
};

export const BpmnViewer = ({ onElementSelect, onFileChange, bpmnMappings, initialFileName }: BpmnViewerProps) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<BpmnJS | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [currentXml, setCurrentXml] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [bpmnHistory, setBpmnHistory] = useState<BpmnHistoryItem[]>([]);
  const [nodeMappings, setNodeMappings] = useState<Record<string, { bpmnFile?: string }>>(loadMappings());
  
  // Click/dblclick controller to prevent conflicts and race conditions
  const clickControllerRef = useRef<{
    lastClickTime: number;
    lastClickTarget: string | null;
    doubleClickTimeout: ReturnType<typeof setTimeout> | null;
    isNavigating: boolean;
    currentDiagramVersion: number;
  }>({
    lastClickTime: 0,
    lastClickTarget: null,
    doubleClickTimeout: null,
    isNavigating: false,
    currentDiagramVersion: 0,
  });
  
  const { toast } = useToast();
  const { getTestResultByNodeId } = useTestResults();
  const { setSelectedElementId } = useBpmnSelection();
  const { data: bpmnFiles, isLoading: isLoadingFiles } = useDynamicBpmnFiles();
  const { getVersionHashForFile } = useVersionSelection();
  const { data: rootBpmnFile } = useRootBpmnFile();
  const hierarchyRootFile = rootBpmnFile || initialFileName || 'mortgage.bpmn';
  const { data: processTree, isLoading: processTreeLoading } = useProcessTree(hierarchyRootFile);
  const subprocessNavMap = useMemo(
    () => buildSubprocessNavigationMap(processTree),
    [processTree],
  );
  const findCallActivityNode = useCallback(
    (targetFile: string, elementId: string): ProcessTreeNode | null => {
      if (!processTree) return null;
      const stack: ProcessTreeNode[] = [processTree];
      while (stack.length) {
        const node = stack.pop()!;
        if (
          node.type === 'callActivity' &&
          node.bpmnFile === targetFile &&
          (node.bpmnElementId === elementId || node.id === elementId)
        ) {
          return node;
        }
        node.children.forEach((child) => stack.push(child));
      }
      return null;
    },
    [processTree],
  );

  const summarizeDiagnostics = useCallback((node: ProcessTreeNode | null): string | null => {
    if (!node) return null;
    const parts: string[] = [];
    if (node.subprocessLink && node.subprocessLink.matchStatus && node.subprocessLink.matchStatus !== 'matched') {
      parts.push(`Subprocess: ${node.subprocessLink.matchStatus}`);
    }
    (node.diagnostics ?? []).forEach((diag) => {
      if (diag.message) {
        parts.push(diag.message);
      }
    });
    (node.subprocessLink?.diagnostics ?? []).forEach((diag) => {
      if (diag.message) {
        parts.push(diag.message);
      }
    });
    return parts.length ? parts.join(' • ') : null;
  }, []);

  // Find parent BPMN file in hierarchy for the current diagram
  const findParentProcessFile = useCallback(
    (targetFile: string | null): string | null => {
      if (!targetFile || !processTree) return null;

      let parentFile: string | null = null;

      const walk = (node: ProcessTreeNode) => {
        if (parentFile) return;

        node.children.forEach((child) => {
          if (parentFile) return;

          const link = child.subprocessLink as any;
          const matchedFile: string | undefined =
            child.subprocessFile ||
            (link && typeof link.matchedFileName === 'string' && link.matchedFileName) ||
            undefined;

          if (matchedFile === targetFile) {
            parentFile = child.bpmnFile;
            return;
          }

          walk(child);
        });
      };

      walk(processTree);
      return parentFile;
    },
    [processTree],
  );

  const parentHistoryItem = bpmnHistory.length > 0 ? bpmnHistory[bpmnHistory.length - 1] : null;
  const downloadFromStorage = useCallback(async (name: string) => {
    const { data: record } = await supabase
      .from('bpmn_files')
      .select('storage_path')
      .eq('file_name', name)
      .maybeSingle();

    const storagePath = record?.storage_path || name;
    const { data, error } = await supabase.storage
      .from('bpmn-files')
      .download(storagePath);

    if (error || !data) return null;
    const xml = await data.text();
    return xml.includes('<bpmn:definitions') ? xml : null;
  }, []);

  // Track the last loaded initialFileName to prevent unnecessary reloads
  const lastLoadedInitialFileRef = useRef<string | null>(null);
  
  // Define loadSubProcess before it's used in useEffects
  const loadSubProcess = useCallback(async (bpmnFileName: string) => {
    // Mark navigation as in progress to prevent race conditions
    clickControllerRef.current.isNavigating = true;
    clickControllerRef.current.currentDiagramVersion += 1;
    const navigationVersion = clickControllerRef.current.currentDiagramVersion;
    
    try {
      // Get version hash for this file (uses selected version if available)
      const versionHash = await getVersionHashForFile(bpmnFileName);
      const url = await getBpmnFileUrl(bpmnFileName, versionHash);
      console.log('[BpmnViewer] Loading subprocess:', bpmnFileName, versionHash ? `(version: ${versionHash.substring(0, 8)}...)` : '(current version)', url);

      let response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} when fetching ${url}`);
      }

      let contentType = response.headers.get('content-type') || '';
      let xml = await response.text();

      // Validate that we actually received BPMN XML and not an HTML fallback
      let looksLikeBpmn = /<bpmn:definitions[\s>]/i.test(xml);
      if (!looksLikeBpmn) {
        const storageXml = await downloadFromStorage(bpmnFileName);
        if (storageXml) {
          xml = storageXml;
          looksLikeBpmn = true;
          contentType = 'application/xml (storage fallback)';
        }
      }

      if (!looksLikeBpmn) {
        throw new Error(
          `Received non-BPMN content (content-type: ${contentType || 'unknown'}) from ${url}. ` +
          `The file may not exist in Supabase Storage.`
        );
      }

      // Only update state after validation so we don't blank the viewer on bad content
      // Verify we're still on the same navigation version (not superseded by another navigation)
      if (clickControllerRef.current.currentDiagramVersion === navigationVersion) {
        // Update lastLoadedInitialFileRef to prevent initialFileName useEffect from reloading
        lastLoadedInitialFileRef.current = bpmnFileName;
        setBpmnHistory((prev) => [...prev, { fileName, xml: currentXml }]);
        setCurrentXml(xml);
        setFileName(bpmnFileName);
      }

      toast({
        title: 'Subprocess loaded',
        description: `Loaded ${bpmnFileName}`,
      });
    } catch (error) {
      console.error('[BpmnViewer] Error loading subprocess:', error);
      toast({
        title: 'Error',
        description: `Failed to load ${bpmnFileName}. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    } finally {
      // Only clear navigation flag if this is still the current navigation
      if (clickControllerRef.current.currentDiagramVersion === navigationVersion) {
        clickControllerRef.current.isNavigating = false;
      }
    }
  }, [fileName, currentXml, toast, downloadFromStorage]);

  // Centralized highlight function with navigation guard
  const highlightElement = useCallback((elementId: string | null, diagramVersion?: number) => {
    if (!viewerRef.current) return;
    
    // Guard: Don't highlight if navigation is in progress or if diagram version doesn't match
    const controller = clickControllerRef.current;
    if (controller.isNavigating) {
      // If diagramVersion is provided, check if it matches current version
      if (diagramVersion !== undefined && diagramVersion !== controller.currentDiagramVersion) {
        return; // This highlight is for an old diagram
      }
    }
    
    const canvas = viewerRef.current.get('canvas') as any;
    const elementRegistry = viewerRef.current.get('elementRegistry') as any;

    // Clear all highlights
    elementRegistry.forEach((el: any) => {
      canvas.removeMarker(el.id, 'highlight-selected');
    });

    // Add highlight to specified element
    if (elementId) {
      const element = elementRegistry.get(elementId);
      if (element) {
        canvas.addMarker(elementId, 'highlight-selected');
      }
    }
  }, []);

  // Notify parent when fileName changes (but only if it's a meaningful change)
  const lastNotifiedFileRef = useRef<string>('');
  useEffect(() => {
    if (fileName && fileName !== lastNotifiedFileRef.current) {
      lastNotifiedFileRef.current = fileName;
      onFileChange?.(fileName);
    }
  }, [fileName, onFileChange]);

  // Listen for mapping updates from sidebar
  useEffect(() => {
    const handleMappingUpdate = (event: CustomEvent) => {
      setNodeMappings(event.detail);
    };

    window.addEventListener('bpmn-mapping-updated', handleMappingUpdate as EventListener);
    return () => {
      window.removeEventListener('bpmn-mapping-updated', handleMappingUpdate as EventListener);
    };
  }, []);

  // Listen for subprocess navigation from RightPanel
  useEffect(() => {
    const handleLoadBpmnFile = (event: CustomEvent) => {
      const { fileName: newFileName } = event.detail;
      if (newFileName) {
        loadSubProcess(newFileName);
      }
    };

    window.addEventListener('loadBpmnFile', handleLoadBpmnFile as EventListener);
    return () => {
      window.removeEventListener('loadBpmnFile', handleLoadBpmnFile as EventListener);
    };
  }, [loadSubProcess]);

  // Listen for highlight requests (e.g. from registry or other views)
  useEffect(() => {
    const handleHighlightElement = (event: CustomEvent) => {
      const { elementId, bpmnFile: targetFile } = event.detail;
      
      if (!viewerRef.current || !elementId) return;

      // If we need to switch BPMN file first
      if (targetFile && targetFile !== fileName) {
        loadSubProcess(targetFile).then(() => {
          // After loading, highlight the element
          setTimeout(() => {
            if (!viewerRef.current) return;
            
            const elementRegistry = viewerRef.current.get('elementRegistry') as any;
            const canvas = viewerRef.current.get('canvas') as any;
            const element = elementRegistry.get(elementId);

            if (!element) {
              toast({
                title: 'Nod saknas i BPMN',
                description: 'Den här referensen pekar på en nod som inte längre finns i BPMN-diagrammet.',
                variant: 'destructive',
              });
              return;
            }

            // Highlight and zoom to element
            highlightElement(elementId);
            canvas.zoom('fit-viewport', element);
            canvas.scrollToElement(element);
            
            setSelectedElement(elementId);
            setSelectedElementId(elementId);
          }, 100);
        });
      } else {
        // Same file, just highlight
        const elementRegistry = viewerRef.current.get('elementRegistry') as any;
        const canvas = viewerRef.current.get('canvas') as any;
        const element = elementRegistry.get(elementId);

        if (!element) {
          toast({
            title: 'Nod saknas i BPMN',
            description: 'Den här referensen pekar på en nod som inte längre finns i BPMN-diagrammet.',
            variant: 'destructive',
          });
          return;
        }

        // Highlight and zoom to element
        highlightElement(elementId);
        canvas.zoom('fit-viewport', element);
        canvas.scrollToElement(element);
        
        setSelectedElement(elementId);
        setSelectedElementId(elementId);
      }
    };

    window.addEventListener('highlightBpmnElement', handleHighlightElement as EventListener);
    return () => {
      window.removeEventListener('highlightBpmnElement', handleHighlightElement as EventListener);
    };
  }, [fileName, loadSubProcess, toast, highlightElement, setSelectedElementId]);

  // Load BPMN file from Supabase Storage for the "current" route/initial file
  useEffect(() => {
    if (isLoadingFiles || !bpmnFiles) return;

    const loadBpmn = async () => {
      const availableFiles = Array.isArray(bpmnFiles) ? bpmnFiles : [];
      const hasInitial = initialFileName && availableFiles.includes(initialFileName);
      const fileToLoad = hasInitial ? initialFileName! : availableFiles[0];
      
      if (!fileToLoad) {
        setCurrentXml('');
        setFileName('');
        lastLoadedInitialFileRef.current = null;
        toast({
          title: 'Inga BPMN-filer',
          description: 'Lägg till filer via Filer-sidan för att börja.',
        });
        return;
      }

      // Skip if we're already loading/loaded this file
      if (fileToLoad === lastLoadedInitialFileRef.current && fileToLoad === fileName) {
        return;
      }

      // Skip if navigation is in progress (user is navigating via double-click)
      if (clickControllerRef.current.isNavigating) {
        return;
      }

      try {
        lastLoadedInitialFileRef.current = fileToLoad;
        // Get version hash for this file (uses selected version if available)
        const versionHash = await getVersionHashForFile(fileToLoad);
        const url = await getBpmnFileUrl(fileToLoad, versionHash);
        console.log('[BpmnViewer] Loading BPMN from initialFileName:', fileToLoad, versionHash ? `(version: ${versionHash.substring(0, 8)}...)` : '(current version)', url);

        // Nollställ navigationen när vi aktivt byter fil via route
        if (fileToLoad !== fileName) {
          setBpmnHistory([]);
          setSelectedElement(null);
          setSelectedElementId(null);
        }
        
        let response = await fetch(url);
        let contentType = response.headers.get('content-type') || '';
        let xml = response.ok ? await response.text() : '';

        // Validate BPMN content
        let looksLikeBpmn = /<bpmn:definitions[\s>]/i.test(xml);
        if (!looksLikeBpmn) {
          const storageXml = await downloadFromStorage(fileToLoad);
          if (storageXml) {
            xml = storageXml;
            looksLikeBpmn = true;
            contentType = 'application/xml (storage fallback)';
          }
        }

        if (!looksLikeBpmn) {
          throw new Error(
            `Mottog icke-BPMN-innehåll (content-type: ${contentType || 'okänt'}) från ${url}.`
          );
        }

        console.log('[BpmnViewer] BPMN loaded successfully, length:', xml.length);
        setCurrentXml(xml);
        setFileName(fileToLoad);
      } catch (error) {
        console.error('[BpmnViewer] Error loading BPMN file:', error);
        lastLoadedInitialFileRef.current = null;
        toast({
          title: 'Kunde inte ladda BPMN',
          description: error instanceof Error ? error.message : 'Okänt fel',
          variant: 'destructive',
        });
      }
    };
    
    loadBpmn();
  }, [bpmnFiles, isLoadingFiles, initialFileName, toast, downloadFromStorage, setSelectedElementId, getVersionHashForFile]);

  // Initialize viewer when container becomes available (after loading UI is gone)
  useEffect(() => {
    if (viewerRef.current || !containerRef.current) return;

    const viewer = new BpmnJS({
      container: containerRef.current,
    });

    viewerRef.current = viewer;
    setViewerReady(true);
    console.log('[BpmnViewer] Viewer initialized');
  }, [isLoadingFiles, fileName]);

  // Destroy viewer on unmount
  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      setViewerReady(false);
      console.log('[BpmnViewer] Viewer destroyed');
    };
  }, []);

  // Helper function to add test status overlays
  const addTestStatusOverlays = useCallback(() => {
    if (!viewerRef.current) return;

    const overlays = viewerRef.current.get('overlays') as any;
    const elementRegistry = viewerRef.current.get('elementRegistry') as any;

    // Clear existing overlays
    overlays.clear();

    // Get all elements
    const elements = elementRegistry.getAll();

    elements.forEach((element: any) => {
      // Skip non-element types
      if (!element.businessObject || element.type === 'bpmn:Process' || element.type === 'label') {
        return;
      }

      const testResult = getTestResultByNodeId(element.id);
      
      if (testResult && testResult.scenarios) {
        const statusConfig = {
          passing: { color: '#10b981', icon: '✓', bgColor: '#d1fae5' },
          failing: { color: '#ef4444', icon: '✕', bgColor: '#fee2e2' },
          pending: { color: '#f59e0b', icon: '◷', bgColor: '#fef3c7' },
          skipped: { color: '#6b7280', icon: '○', bgColor: '#f3f4f6' },
        };

        const config = statusConfig[testResult.status];
        const passingCount = testResult.scenarios.filter(s => s.status === 'passing').length;
        const totalCount = testResult.scenarios.length;

        const overlayHtml = `
          <div 
            class="test-status-badge"
            data-element-id="${element.id}"
            style="
              position: absolute;
              top: -8px;
              right: -8px;
              width: 24px;
              height: 24px;
              background: ${config.bgColor};
              border: 2px solid ${config.color};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              color: ${config.color};
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              z-index: 10;
              transition: transform 0.2s;
            "
            onmouseover="this.style.transform='scale(1.2)'"
            onmouseout="this.style.transform='scale(1)'"
            title="${testResult.node_name || element.id}\nStatus: ${testResult.status}\nTests: ${passingCount}/${totalCount} passing\nClick to view test report"
          >
            ${config.icon}
          </div>
        `;

        try {
          overlays.add(element.id, 'badge', {
            position: { top: 0, right: 0 },
            html: overlayHtml,
          });
        } catch (error) {
          console.error('Error adding overlay to element:', element.id, error);
        }
      }
    });

    // Add click listener to badges
    setTimeout(() => {
      const badges = document.querySelectorAll('.test-status-badge');
          badges.forEach((badge) => {
            badge.addEventListener('click', (e) => {
              e.stopPropagation();
              const elId = (e.currentTarget as HTMLElement).dataset.elementId;
              if (elId) {
                highlightElement(elId);
              }
              navigate('/test-report');
            });
          });
    }, 100);
  }, [navigate]);

  const handleSubprocessNavigation = useCallback(
    (target: any) => {
      const type = target?.businessObject?.$type || target?.type;
      if (type !== 'bpmn:CallActivity') return;

      const elementId = target.id;
      const hierarchyMatch = subprocessNavMap.get(`${fileName}:${elementId}`);
      const callActivityNode = findCallActivityNode(fileName, elementId);
      const diagnosticsSummary = summarizeDiagnostics(callActivityNode);
      const dbMapping = bpmnMappings?.[elementId];
      const localMapping = nodeMappings[elementId]?.bpmnFile;
      const registryMapping = elementResourceMapping[elementId]?.bpmnFile;

      const link = callActivityNode?.subprocessLink as any;
      const linkCandidate: string | null =
        (link && typeof link.matchedFileName === 'string' && link.matchedFileName) ||
        (callActivityNode?.subprocessFile ?? null);

      const resolvedFile =
        hierarchyMatch ||
        linkCandidate ||
        dbMapping?.subprocess_bpmn_file ||
        localMapping ||
        registryMapping ||
        null;

      console.log('[BpmnViewer] navigateSubprocess', {
        elementId,
        type,
        fileName,
        hierarchyMatch,
        hasCallActivityNode: !!callActivityNode,
        dbMappingFile: dbMapping?.subprocess_bpmn_file,
        localMappingFile: localMapping,
        registryMappingFile: registryMapping,
        resolvedFile,
      });

      if (!resolvedFile) {
        console.warn(`No resolved subprocess for element ${elementId} in file ${fileName}`);
        toast({
          title: 'Ingen subprocess kopplad',
          description:
            diagnosticsSummary ||
            `Ingen subprocess hittades för ${target?.businessObject?.name || elementId}.`,
        });
        return;
      }

      const needsHierarchy =
        !dbMapping?.subprocess_bpmn_file && !localMapping && !registryMapping;
      if (
        needsHierarchy &&
        !hierarchyMatch &&
        !callActivityNode &&
        (processTreeLoading || !processTree)
      ) {
        toast({
          title: 'Hierarki laddas',
          description: 'Vänta några sekunder och försök igen.',
        });
        return;
      }

      const matchStatus = callActivityNode?.subprocessLink?.matchStatus;
      if (diagnosticsSummary || (matchStatus && matchStatus !== 'matched')) {
        toast({
          title: 'Subprocessdiagnostik',
          description:
            diagnosticsSummary ||
            `Subprocess‑matchning: ${matchStatus}. Kontrollera att rätt BPMN‑fil öppnades.`,
        });
      }

      loadSubProcess(resolvedFile);
    },
    [
      subprocessNavMap,
      fileName,
      findCallActivityNode,
      summarizeDiagnostics,
      bpmnMappings,
      nodeMappings,
      toast,
      processTreeLoading,
      processTree,
      loadSubProcess,
    ],
  );

  // Import XML when currentXml changes
  useEffect(() => {
    if (!viewerReady || !viewerRef.current || !currentXml) {
      console.log('Skipping XML import:', { hasViewer: !!viewerRef.current, hasXml: !!currentXml, viewerReady });
      return;
    }
    
    // Debug logging disabled for cleaner output

    let clickListener: any = null;
    let dblclickListener: any = null;
    let canvasClickListener: any = null;
    let selectionChangedListener: any = null;

    // Increment diagram version when new XML is loaded
    clickControllerRef.current.currentDiagramVersion += 1;
    clickControllerRef.current.isNavigating = false; // Reset navigation flag on new diagram
    
    viewerRef.current!
      .importXML(currentXml)
      .then(() => {
        const canvas = viewerRef.current!.get('canvas') as any;
        // Initial fit once per import
        canvas.zoom('fit-viewport');
        
        // Add test status overlays
        addTestStatusOverlays();
        
        // Add click listener for elements
        const eventBus = viewerRef.current!.get('eventBus') as any;
        
        // Single click - select element with double-click detection
        clickListener = (event: any) => {
          const { element } = event;
          // Resolve to actual element if a label was clicked
          const target = (element as any).labelTarget || element;
          if (!target?.businessObject || target.type === 'bpmn:Process') return;

          const controller = clickControllerRef.current;
          const now = Date.now();
          const timeSinceLastClick = now - controller.lastClickTime;
          const isSameTarget = controller.lastClickTarget === target.id;
          const isPotentialDoubleClick = isSameTarget && timeSinceLastClick < 300; // 300ms window

          // If navigation is in progress, ignore click
          if (controller.isNavigating) {
            return;
          }

          // Clear any pending double-click timeout
          if (controller.doubleClickTimeout) {
            clearTimeout(controller.doubleClickTimeout);
            controller.doubleClickTimeout = null;
          }

          // Update click tracking
          controller.lastClickTime = now;
          controller.lastClickTarget = target.id;

          // If this might be part of a double-click, delay the click handling
          if (isPotentialDoubleClick) {
            // Set a timeout - if dblclick doesn't fire within 300ms, treat as single click
            controller.doubleClickTimeout = setTimeout(() => {
              // This was a single click after all
              const type = target.businessObject?.$type || target.type || null;
              const elementName = target.businessObject?.name || target.id;
              
              const selection = viewerRef.current!.get('selection') as any;
              selection?.select(target);
              
              const diagramVersion = controller.currentDiagramVersion;
              requestAnimationFrame(() => highlightElement(target.id, diagramVersion));
              
              setSelectedElement(target.id);
              setSelectedElementId(target.id);
              onElementSelect?.(target.id, type, elementName);
              
              controller.doubleClickTimeout = null;
            }, 300);
          } else {
            // Clear single click - handle immediately
            const type = target.businessObject?.$type || target.type || null;
            const elementName = target.businessObject?.name || target.id;
            
            const selection = viewerRef.current!.get('selection') as any;
            selection?.select(target);
            
            const diagramVersion = controller.currentDiagramVersion;
            requestAnimationFrame(() => highlightElement(target.id, diagramVersion));
            
            setSelectedElement(target.id);
            setSelectedElementId(target.id);
            onElementSelect?.(target.id, type, elementName);
          }
        };
        
        eventBus.on('element.click', clickListener);

        // Hantera dubbelklick separat: stoppa standard-zoom och använd vår subprocess-navigation
        dblclickListener = (event: any) => {
          const oe = event?.originalEvent as MouseEvent | undefined;
          if (oe) {
            oe.preventDefault();
            oe.stopPropagation();
          }

          const rawElement = event?.element;
          const target = rawElement?.labelTarget || rawElement;
          if (!target) return;

          const controller = clickControllerRef.current;
          
          // Cancel any pending single-click timeout
          if (controller.doubleClickTimeout) {
            clearTimeout(controller.doubleClickTimeout);
            controller.doubleClickTimeout = null;
          }

          // Guard: Don't trigger navigation if already navigating
          if (controller.isNavigating) {
            return;
          }

          // Verify this is a double-click on the same target as last click
          const isSameTarget = controller.lastClickTarget === target.id;
          const timeSinceLastClick = Date.now() - controller.lastClickTime;
          
          if (isSameTarget && timeSinceLastClick < 500) {
            // This is a valid double-click
            // Set selection once for visual feedback before navigation
            const selection = viewerRef.current!.get('selection') as any;
            selection?.select(target);
            
            const elementName = target.businessObject?.name || target.id;
            setSelectedElement(target.id);
            setSelectedElementId(target.id);
            
            // Highlight once before navigation
            const diagramVersion = controller.currentDiagramVersion;
            requestAnimationFrame(() => highlightElement(target.id, diagramVersion));
            
            // Trigger navigation
            handleSubprocessNavigation(target);
          }
        };
        eventBus.on('element.dblclick', dblclickListener);

        // Keep marker in sync with selection changes
        selectionChangedListener = (e: any) => {
          const controller = clickControllerRef.current;
          
          // Don't update highlight if navigation is in progress
          if (controller.isNavigating) {
            return;
          }
          
          const selected = e?.newSelection?.[0];
          const diagramVersion = controller.currentDiagramVersion;
          
          if (selected?.id) {
            requestAnimationFrame(() => highlightElement(selected.id, diagramVersion));
          } else {
            highlightElement(null, diagramVersion);
          }
        };
        eventBus.on('selection.changed', selectionChangedListener);

        // (Removed mousedown highlight; rely on click/selection + emulerad dubbelklick)

        // Canvas click - clear selection
        canvasClickListener = () => {
          const selection = viewerRef.current!.get('selection') as any;
          if (selection?.select) selection.select(null);
          setSelectedElement(null);
          setSelectedElementId(null); // Clear global context
        };
        eventBus.on('canvas.click', canvasClickListener);
      })
      .catch((err) => {
        console.error('Error rendering diagram', err);
        toast({
          title: "Error",
          description: "Failed to render BPMN diagram",
          variant: "destructive"
        });
      });

    // Cleanup event listeners on unmount or when currentXml changes
    return () => {
      // Clear any pending click timeout
      const controller = clickControllerRef.current;
      if (controller.doubleClickTimeout) {
        clearTimeout(controller.doubleClickTimeout);
        controller.doubleClickTimeout = null;
      }
      
      if (viewerRef.current && clickListener) {
        const eventBus = viewerRef.current.get('eventBus') as any;
        eventBus.off('element.click', clickListener);
      }
      if (viewerRef.current && dblclickListener) {
        const eventBus = viewerRef.current.get('eventBus') as any;
        eventBus.off('element.dblclick', dblclickListener);
      }
      if (viewerRef.current && canvasClickListener) {
        const eventBus = viewerRef.current.get('eventBus') as any;
        eventBus.off('canvas.click', canvasClickListener);
      }
      if (viewerRef.current && selectionChangedListener) {
        const eventBus = viewerRef.current.get('eventBus') as any;
        eventBus.off('selection.changed', selectionChangedListener);
      }
    };
  }, [
    viewerReady,
    currentXml,
    toast,
    nodeMappings,
    bpmnMappings,
    loadSubProcess,
    addTestStatusOverlays,
    subprocessNavMap,
    findCallActivityNode,
    summarizeDiagnostics,
    processTreeLoading,
    highlightElement,
  ]);

  const navigateBack = (index: number) => {
    if (index < 0 || index >= bpmnHistory.length) return;
    
    const historyItem = bpmnHistory[index];
    setCurrentXml(historyItem.xml);
    setFileName(historyItem.fileName);
    
    // Remove everything after this index
    setBpmnHistory(bpmnHistory.slice(0, index));
  };

  // Build breadcrumb path
  const breadcrumbItems = useMemo(() => {
    return buildBreadcrumbPath(processTree, fileName, bpmnHistory);
  }, [processTree, fileName, bpmnHistory]);

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback((targetFileName: string) => {
    // Don't navigate if already on this file
    if (targetFileName === fileName) return;

    // Find the target in history
    const historyIndex = bpmnHistory.findIndex(item => item.fileName === targetFileName);
    if (historyIndex >= 0) {
      // Navigate back to this point in history
      navigateBack(historyIndex);
    } else {
      // Check if it's the root file (should reset history)
      const isRoot = processTree && processTree.bpmnFile === targetFileName;
      if (isRoot) {
        // Reset to root - clear history and load root file
        setBpmnHistory([]);
        // Load root file via initialFileName mechanism
        onFileChange?.(targetFileName);
      } else {
        // Navigate to file (load subprocess)
        loadSubProcess(targetFileName);
      }
    }
  }, [bpmnHistory, fileName, processTree, loadSubProcess, onFileChange]);

  // Show empty state if no files
  if (!isLoadingFiles && bpmnFiles && bpmnFiles.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-4 px-4 py-2 bg-card border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-medium text-foreground">BPMN Viewer</h2>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => navigate('/files')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Ladda upp BPMN-fil
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <div className="text-center p-8 max-w-md">
            <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Inga BPMN-filer
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Det finns inga BPMN-filer att visa. Börja med att ladda upp en BPMN-fil via Filer-sidan.
            </p>
            <Button 
              variant="default" 
              onClick={() => navigate('/files')}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Gå till Filer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoadingFiles || !fileName) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-4 px-4 py-2 bg-card border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-medium text-foreground">Laddar...</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <p className="text-muted-foreground">Laddar BPMN-fil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-medium text-foreground truncate">{fileName}</h2>
            {selectedElement && (
              <span className="text-xs text-muted-foreground truncate">
                {selectedElement}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BpmnBreadcrumb
            items={breadcrumbItems}
            onNavigate={handleBreadcrumbNavigate}
            currentFileName={fileName}
          />
        </div>
      </div>
      <div className="flex-1 relative bg-muted/30">
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>
  );
};
