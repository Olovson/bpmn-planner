import { useEffect, useRef, useState } from 'react';
import DmnJS from 'dmn-js/lib/Modeler';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn-embedded.css';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useDynamicDmnFiles, getDmnFileUrl } from '@/hooks/useDynamicBpmnFiles';

interface DmnViewerProps {
  businessRuleTaskName: string;
  manualDmnFile?: string;
}

export const DmnViewer = ({ businessRuleTaskName, manualDmnFile }: DmnViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<DmnJS | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dmnFileUrl, setDmnFileUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: availableDmnFiles = [] } = useDynamicDmnFiles();

  // Prioritize manual DMN file link over automatic matching
  const matchingDmnFile = (() => {
    if (manualDmnFile) return manualDmnFile;
    const normalizedTask = businessRuleTaskName.toLowerCase();
    return availableDmnFiles.find(file => {
      const normalizedFile = file.replace('.dmn', '').toLowerCase();
      return normalizedFile.includes(normalizedTask) || normalizedTask.includes(normalizedFile);
    }) || null;
  })();

  useEffect(() => {
    let cancelled = false;
    const resolveUrl = async () => {
      if (!matchingDmnFile) {
        setDmnFileUrl(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const url = await getDmnFileUrl(matchingDmnFile);
        if (!cancelled) {
          setDmnFileUrl(url);
        }
      } catch (err) {
        console.error('Failed to resolve DMN file URL', err);
        if (!cancelled) {
          setDmnFileUrl(null);
          setError(`Kunde inte hitta DMN-fil: ${matchingDmnFile}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    resolveUrl();
    return () => {
      cancelled = true;
    };
  }, [matchingDmnFile]);

  useEffect(() => {
    if (!containerRef.current || !dmnFileUrl) {
      setLoading(false);
      return;
    }

    const loadDmn = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Create viewer
        const viewer = new DmnJS({
          container: containerRef.current!,
          drd: {
            propertiesPanel: {},
          },
        });

        viewerRef.current = viewer;

        // Load DMN file
        const response = await fetch(dmnFileUrl, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`DMN file not found: ${dmnFileUrl}`);
        }

        const xml = await response.text();
        await viewer.importXML(xml);

        // Get first view and open it
        const views = viewer.getViews();
        if (views && views.length > 0) {
          await viewer.open(views[0]);
        }

        // Fit to viewport
        const canvas = viewer.getActiveViewer()?.get('canvas') as any;
        if (canvas?.zoom) {
          canvas.zoom('fit-viewport');
        }
        
        setLoading(false);
      } catch (err) {
        setLoading(false);
        const errorMsg = err instanceof Error ? err.message : 'Failed to load DMN';
        console.error('DMN load error:', err);
        setError(errorMsg);
        
        // Only show toast for unexpected errors
        if (!errorMsg.includes('not found')) {
          toast({
            title: 'DMN Load Error',
            description: errorMsg,
            variant: 'destructive',
          });
        }
      }
    };

    loadDmn();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [dmnFileUrl, toast]);

  if (!matchingDmnFile) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Ingen DMN-fil associerad med denna BusinessRuleTask
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error.includes('not found') 
            ? `DMN-fil hittades inte: ${matchingDmnFile}`
            : error
          }
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-[400px] border border-border rounded-md bg-background"
    />
  );
};
