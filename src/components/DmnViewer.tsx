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

interface DmnViewerProps {
  businessRuleTaskName: string;
  manualDmnFile?: string;
}

export const DmnViewer = ({ businessRuleTaskName, manualDmnFile }: DmnViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<DmnJS | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Prioritize manual DMN file link over automatic matching
  let matchingDmnFile = manualDmnFile;

  // If no manual link, try to find matching DMN file automatically
  if (!matchingDmnFile) {
    const dmnFiles = [
      // Add DMN files here as they are created
      // Example: 'pre-screen-party.dmn',
    ];

    matchingDmnFile = dmnFiles.find(file => {
      const fileName = file.replace('.dmn', '').toLowerCase();
      const taskName = businessRuleTaskName.toLowerCase();
      
      // Check if names are similar (simple fuzzy match)
      return fileName.includes(taskName) || taskName.includes(fileName);
    });
  }

  const dmnFilePath = matchingDmnFile ? `/dmn/${matchingDmnFile}` : null;

  useEffect(() => {
    if (!containerRef.current || !dmnFilePath) {
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
        const response = await fetch(dmnFilePath);
        if (!response.ok) {
          throw new Error(`DMN file not found: ${dmnFilePath}`);
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
  }, [dmnFilePath, toast]);

  if (!dmnFilePath) {
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
            ? `DMN-fil hittades inte: ${dmnFilePath.split('/').pop()}`
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
