import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowRight, ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import { useDorDodStatus, useAllSubprocesses } from "@/hooks/useDorDodStatus";
import { SUBPROCESS_REGISTRY, NodeType } from "@/data/subprocessRegistry";
import { useBpmnSelection } from "@/contexts/BpmnSelectionContext";
import { cn } from "@/lib/utils";
import { useAllBpmnElements } from "@/hooks/useAllBpmnElements";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SubprocessCard = ({ subprocess, isFocused, isActive, isOrphan }: { subprocess: { id: string; title: string; subtitle: string; nodeType: NodeType; bpmnElementId?: string; bpmnFile?: string }, isFocused?: boolean, isActive?: boolean, isOrphan?: boolean }) => {
  const navigate = useNavigate();
  const { dorProgress, dodProgress } = useDorDodStatus(subprocess.id);
  const overallProgress = Math.round((dorProgress + dodProgress) / 2);

  return (
    <Card 
      id={`subprocess-card-${subprocess.id}`}
      className={cn(
        "hover:shadow-lg transition-all cursor-pointer",
        isFocused && "ring-2 ring-primary shadow-xl",
        isActive && "border-2 border-blue-500 ring-2 ring-blue-500/40",
        isOrphan && "border-2 border-orange-500/50 bg-orange-50/5"
      )} 
      onClick={() => navigate(`/subprocess/${subprocess.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              {overallProgress === 100 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="flex-1">{subprocess.title}</span>
              {isOrphan && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Nod saknas i BPMN
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide ml-auto">
                {subprocess.nodeType}
              </Badge>
            </CardTitle>
            <CardDescription>{subprocess.subtitle}</CardDescription>
          </div>
          <Badge variant={overallProgress === 100 ? "default" : "secondary"} className="ml-2">
            {overallProgress}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Definition of Ready</span>
              <span className="font-medium">{dorProgress}%</span>
            </div>
            <Progress value={dorProgress} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Definition of Done</span>
              <span className="font-medium">{dodProgress}%</span>
            </div>
            <Progress value={dodProgress} className="h-2" />
          </div>
        </div>
        <Button variant="ghost" className="w-full mt-4" size="sm">
          Visa detaljer
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default function DorDodDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [nodeTypeFilter, setNodeTypeFilter] = useState<NodeType | 'ALL'>('ALL');
  const { data: allSubprocesses = [], isLoading } = useAllSubprocesses();
  const { selectedElementId } = useBpmnSelection();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Parse all BPMN files to validate element references
  const { elementExistsInFile, loading: bpmnLoading } = useAllBpmnElements();

  // Check for subprocess query param to highlight/focus
  const focusedSubprocess = searchParams.get('subprocess');
  const focusedNodeType = searchParams.get('nodeType');
  const focusedBpmnFile = searchParams.get('bpmn');
  
  // Identify orphan subprocesses (those with bpmn_file + bpmn_element_id set, but element doesn't exist in that file)
  const orphanSubprocesses = allSubprocesses.filter(sp => {
    // Only check if both bpmn_file and bpmn_element_id are set
    if (!sp.bpmn_file || !sp.bpmn_element_id) return false;
    
    // Check if element exists in the specified file
    return !elementExistsInFile(sp.bpmn_file, sp.bpmn_element_id);
  });
  
  const handleDeleteOrphans = async () => {
    setIsDeleting(true);
    try {
      const orphanSubprocessNames = orphanSubprocesses.map(sp => sp.subprocess_name);
      
      const { error } = await supabase
        .from('dor_dod_status')
        .delete()
        .in('subprocess_name', orphanSubprocessNames);

      if (error) throw error;

      toast({
        title: 'Orphans rensade',
        description: `${orphanSubprocessNames.length} DoR/DoD-poster för borttagna noder har rensats.`,
      });
      
      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error deleting orphans:', error);
      toast({
        title: 'Fel vid rensning',
        description: 'Kunde inte rensa orphan-poster. Försök igen.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Set initial filter based on query params
  useEffect(() => {
    if (focusedNodeType && ['UserTask', 'ServiceTask', 'BusinessRuleTask', 'CallActivity'].includes(focusedNodeType)) {
      setNodeTypeFilter(focusedNodeType as NodeType);
    }
  }, [focusedNodeType]);

  // Scroll to focused card when data loads
  useEffect(() => {
    if (focusedSubprocess && allSubprocesses.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`subprocess-card-${focusedSubprocess}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [focusedSubprocess, allSubprocesses]);

  const nodeTypeOptions: Array<{ label: string; value: NodeType | 'ALL' }> = [
    { label: 'Alla', value: 'ALL' },
    { label: 'UserTask', value: 'UserTask' },
    { label: 'ServiceTask', value: 'ServiceTask' },
    { label: 'BusinessRuleTask', value: 'BusinessRuleTask' },
    { label: 'CallActivity', value: 'CallActivity' },
  ];

  // Combine database subprocesses with registry (registry has richer metadata)
  const enrichedSubprocesses = allSubprocesses.map(dbSp => {
    const registryEntry = SUBPROCESS_REGISTRY.find(reg => reg.id === dbSp.subprocess_name);
    return {
      id: dbSp.subprocess_name,
      title: registryEntry?.displayName || dbSp.subprocess_name,
      subtitle: registryEntry?.subtitle || `${dbSp.node_type || 'Process'} - ${dbSp.bpmn_file || ''}`,
      nodeType: (dbSp.node_type || registryEntry?.nodeType || 'CallActivity') as NodeType,
      bpmnElementId: dbSp.bpmn_element_id || undefined,
      bpmnFile: dbSp.bpmn_file || undefined,
    };
  });

  const filteredSubprocesses = enrichedSubprocesses
    .filter(sp => {
      if (nodeTypeFilter === 'ALL') return true;
      return sp.nodeType === nodeTypeFilter;
    });

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till BPMN Viewer
          </Button>
          
          {orphanSubprocesses.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Rensa {orphanSubprocesses.length} orphan{orphanSubprocesses.length > 1 ? 's' : ''}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rensa DoR/DoD för borttagna noder?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Det finns {orphanSubprocesses.length} DoR/DoD-post{orphanSubprocesses.length > 1 ? 'er' : ''} som refererar till BPMN-noder som inte längre finns i diagrammet.
                    <br /><br />
                    Vill du radera dessa poster? Detta går inte att ångra.
                    <br /><br />
                    <strong>Påverkade noder:</strong>
                    <ul className="list-disc pl-5 mt-2">
                      {orphanSubprocesses.slice(0, 5).map(sp => (
                        <li key={sp.subprocess_name} className="text-sm">{sp.subprocess_name}</li>
                      ))}
                      {orphanSubprocesses.length > 5 && (
                        <li className="text-sm text-muted-foreground">... och {orphanSubprocesses.length - 5} till</li>
                      )}
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteOrphans} disabled={isDeleting}>
                    {isDeleting ? 'Rensar...' : 'Ja, rensa'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        
        <h1 className="text-4xl font-bold text-primary mb-2">DoR/DoD Dashboard</h1>
        <p className="text-lg text-muted-foreground mb-4">
          Översikt av Definition of Ready och Definition of Done för alla processelement
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-6">
          <span className="text-sm font-medium text-muted-foreground">Filtrera på nodtyp:</span>
          {nodeTypeOptions.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={nodeTypeFilter === opt.value ? 'default' : 'outline'}
              onClick={() => setNodeTypeFilter(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubprocesses.map((subprocess) => (
            <SubprocessCard 
            key={subprocess.id} 
            subprocess={{
              id: subprocess.id,
              title: subprocess.title,
              subtitle: subprocess.subtitle || '',
              nodeType: subprocess.nodeType,
              bpmnElementId: subprocess.bpmnElementId,
              bpmnFile: subprocess.bpmnFile
            }}
            isFocused={focusedSubprocess === subprocess.id}
            isActive={!!subprocess.bpmnElementId && subprocess.bpmnElementId === selectedElementId}
            isOrphan={subprocess.bpmnElementId && subprocess.bpmnFile ? !elementExistsInFile(subprocess.bpmnFile, subprocess.bpmnElementId) : false}
          />
          ))}
      </div>

      {filteredSubprocesses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            Inga subprocesser hittades för valt filter.
          </p>
        </div>
      )}
    </div>
  );
}
