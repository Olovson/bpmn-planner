import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { DorDodChecklist } from "@/components/DorDodChecklist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSubprocessById } from "@/data/subprocessRegistry";
import { useAllSubprocesses } from "@/hooks/useDorDodStatus";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getDocumentationUrl } from "@/lib/artifactUrls";

export default function SubprocessDocs() {
  const { subprocess } = useParams<{ subprocess: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const activeTab = searchParams.get('tab') || 'dor';
  const { data: allSubprocesses = [] } = useAllSubprocesses();
  
  // First try to find in registry
  const subprocessInfo = subprocess ? getSubprocessById(subprocess) : null;
  
  // Find the BPMN element data from database
  const subprocessData = allSubprocesses.find(s => s.subprocess_name === subprocess);
  const bpmnElementId = subprocessData?.bpmn_element_id;
  const bpmnFile = subprocessData?.bpmn_file || 'mortgage.bpmn';
  
  // If not in registry, create minimal info from database data
  // Note: htmlDoc will be dynamically generated from bpmnFile using getDocumentationUrl
  const elementInfo = subprocessInfo || (subprocessData ? {
    id: subprocess!,
    displayName: subprocess!.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    bpmnFile: subprocessData.bpmn_file || 'mortgage.bpmn',
    htmlDoc: '', // Will be generated from bpmnFile when needed
    nodeType: (subprocessData.node_type || 'BusinessRuleTask') as any,
  } : null);
  
  const handleOpenInBpmn = () => {
    // First, navigate to home page
    navigate('/');
    
    // Wait a bit for BpmnViewer to be ready, then dispatch event
    setTimeout(() => {
      if (bpmnElementId) {
        const event = new CustomEvent('highlightBpmnElement', {
          detail: { elementId: bpmnElementId, bpmnFile }
        });
        window.dispatchEvent(event);
      } else {
        toast({
          title: 'Nod saknas i BPMN',
          description: 'Den här DoR/DoD-posten refererar till en nod som inte längre finns i BPMN-diagrammet.',
          variant: 'destructive',
        });
      }
    }, 300);
  };
  
  if (!subprocess || !elementInfo) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Element not found</h1>
          <p className="text-muted-foreground mb-4">
            Ingen information hittades för "{subprocess}"
          </p>
          <Button onClick={() => navigate('/dor-dod')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till DoR/DoD
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till översikt
        </Button>
        
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-bold text-primary">{elementInfo.displayName}</h1>
              {!bpmnElementId && (
                <Badge variant="destructive" className="text-xs">
                  Nod saknas i BPMN
                </Badge>
              )}
              {subprocessData?.node_type && (
                <Badge variant="outline" className="text-xs">
                  {subprocessData.node_type}
                </Badge>
              )}
            </div>
            {('subtitle' in elementInfo) && elementInfo.subtitle && (
              <p className="text-lg text-muted-foreground mt-1">{elementInfo.subtitle}</p>
            )}
            {subprocessData?.bpmn_file && (
              <p className="text-sm text-muted-foreground mt-1">
                {subprocessData.bpmn_file}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleOpenInBpmn}
              disabled={!bpmnElementId}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Öppna i BPMN
            </Button>
            <Button variant="outline" asChild>
              <a href={getDocumentationUrl(elementInfo.bpmnFile)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Full dokumentation
              </a>
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        const params = new URLSearchParams(searchParams);
        if (value === 'dor') {
          params.delete('tab');
        } else {
          params.set('tab', value);
        }
        navigate(`/subprocess/${subprocess}?${params.toString()}`, { replace: true });
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dor">Definition of Ready</TabsTrigger>
          <TabsTrigger value="dod">Definition of Done</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dor" className="mt-6">
          <DorDodChecklist
            subprocessName={subprocess}
            type="dor"
            title="Definition of Ready"
            description="Denna subprocess / feature är redo för utveckling när:"
          />
        </TabsContent>
        
        <TabsContent value="dod" className="mt-6">
          <DorDodChecklist
            subprocessName={subprocess}
            type="dod"
            title="Definition of Done"
            description="Denna subprocess / feature är klar när:"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
