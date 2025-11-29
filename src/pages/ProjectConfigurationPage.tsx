import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useProcessTree } from '@/hooks/useProcessTree';
import { buildGanttTasksFromProcessTree, type GanttTask } from '@/lib/ganttDataConverter';
import { useProjectConfiguration } from '@/contexts/ProjectConfigurationContext';
import { useIntegration } from '@/contexts/IntegrationContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ProjectConfigurationPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { data: rootFile } = useRootBpmnFile();
  const { data: processTree, isLoading } = useProcessTree(rootFile || 'mortgage.bpmn');
  const { useStaccIntegration, setUseStaccIntegration } = useIntegration();
  const {
    configuration,
    loading: configLoading,
    getIntegrationConfig,
    setIntegrationOwner,
    setIntegrationWorkItem,
    loadConfiguration,
  } = useProjectConfiguration();

  // Load configuration when root file changes
  useEffect(() => {
    if (rootFile) {
      loadConfiguration(rootFile);
    }
  }, [rootFile, loadConfiguration]);

  // Build tasks from process tree (same as timeline page)
  const tasks = useMemo(() => {
    if (!processTree) return [];
    return buildGanttTasksFromProcessTree(processTree);
  }, [processTree]);

  // Fetch Jira mappings
  const [jiraMappings, setJiraMappings] = useState<Map<string, { jira_name: string | null; jira_type: 'feature goal' | 'epic' | null }>>(new Map());
  
  useEffect(() => {
    const fetchJiraMappings = async () => {
      try {
        const { data: mappings, error } = await supabase
          .from('bpmn_element_mappings')
          .select('bpmn_file, element_id, jira_name, jira_type');

        if (error) {
          console.error('[ProjectConfigurationPage] Error fetching Jira mappings:', error);
        } else {
          const mappingsMap = new Map<string, { jira_name: string | null; jira_type: 'feature goal' | 'epic' | null }>();
          mappings?.forEach(m => {
            const key = `${m.bpmn_file}:${m.element_id}`;
            mappingsMap.set(key, {
              jira_name: m.jira_name,
              jira_type: m.jira_type as 'feature goal' | 'epic' | null,
            });
          });
          setJiraMappings(mappingsMap);
        }
      } catch (error) {
        console.error('[ProjectConfigurationPage] Error fetching Jira mappings:', error);
      }
    };

    if (tasks.length > 0) {
      fetchJiraMappings();
    }
  }, [tasks]);

  // Filter to only show service tasks and call activities (the ones that can have bank implementation)
  const configurableTasks = useMemo(() => {
    return tasks.filter((task) => {
      const kind = task.meta?.kind;
      // Only show service tasks and call activities
      return kind === 'serviceTask' || kind === 'callActivity';
    });
  }, [tasks]);

  const handleViewChange = (view: string) => {
    if (view === 'timeline') {
      navigate('/timeline');
    } else if (view === 'listvy') {
      navigate('/node-matrix');
    } else if (view === 'tree') {
      navigate('/process-explorer');
    } else if (view === 'tests') {
      navigate('/test-report');
    } else if (view === 'configuration') {
      navigate('/configuration');
    } else if (view === 'files') {
      navigate('/files');
    } else {
      navigate('/');
    }
  };

  const handleToggleBankImplementation = async (task: GanttTask) => {
    if (!task.bpmnFile || !task.bpmnElementId) return;

    const currentUseStacc = useStaccIntegration(task.bpmnFile, task.bpmnElementId);
    const newUseStacc = !currentUseStacc;

    // Update IntegrationContext (for timeline color)
    setUseStaccIntegration(task.bpmnFile, task.bpmnElementId, newUseStacc);

    // Update ProjectConfiguration
    await setIntegrationOwner(task.bpmnFile, task.bpmnElementId, newUseStacc ? 'stacc' : 'bank');

    toast({
      title: 'Uppdaterat',
      description: `${task.text} implementeras nu av ${newUseStacc ? 'Stacc' : 'Banken'}`,
    });
  };

  const getTaskTypeLabel = (kind: string | undefined): string => {
    switch (kind) {
      case 'serviceTask':
        return 'Service Task';
      case 'callActivity':
        return 'Call Activity';
      default:
        return kind || 'Unknown';
    }
  };

  const getTaskTypeBadgeVariant = (kind: string | undefined): 'default' | 'secondary' | 'outline' => {
    switch (kind) {
      case 'serviceTask':
        return 'default';
      case 'callActivity':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading || configLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeaderWithTabs
          userEmail={user?.email || null}
          currentView="configuration"
          onViewChange={handleViewChange}
          onOpenVersions={() => {}}
          onSignOut={signOut}
        />
        <main className="ml-16 p-6">
          <div className="max-w-6xl mx-auto">
            <p>Laddar konfiguration...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeaderWithTabs
        userEmail={user?.email || null}
        currentView="configuration"
        onViewChange={handleViewChange}
        onOpenVersions={() => {}}
        onSignOut={signOut}
      />
      <main className="ml-16 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Projektkonfiguration</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Välj vilka aktiviteter som ska implementeras av Banken (istället för Stacc)
              </p>
            </div>
            <Button onClick={() => navigate('/timeline')} variant="outline">
              Tillbaka till Timeline
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Aktiviteter</CardTitle>
              <CardDescription>
                Kryssa i aktiviteter som ska implementeras av Banken. Aktiviteter som inte är ikryssade implementeras av Stacc.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configurableTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Inga konfigurerbara aktiviteter hittades.</p>
                  <p className="text-sm mt-2">Kontrollera att BPMN-filer är uppladdade och process tree är byggd.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Jira-namn</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead className="text-center">Gemensam analys</TableHead>
                        <TableHead className="text-center">Gemensam testning</TableHead>
                        <TableHead className="text-center">Revision</TableHead>
                        <TableHead className="text-right">Implementeras av</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configurableTasks.map((task) => {
                        const useStacc = task.bpmnFile && task.bpmnElementId
                          ? useStaccIntegration(task.bpmnFile, task.bpmnElementId)
                          : true;
                        const isBankImplementation = !useStacc;

                        // Get Jira name from mappings
                        const mappingKey = task.bpmnFile && task.bpmnElementId
                          ? `${task.bpmnFile}:${task.bpmnElementId}`
                          : null;
                        const jiraMapping = mappingKey ? jiraMappings.get(mappingKey) : null;
                        const jiraName = jiraMapping?.jira_name || task.text || 'N/A';

                        // Get integration config for work items
                        const integrationConfig = task.bpmnFile && task.bpmnElementId
                          ? getIntegrationConfig(task.bpmnFile, task.bpmnElementId)
                          : null;

                        const gemensamAnalys = integrationConfig?.gemensamAnalys ?? false;
                        const gemensamTestning = integrationConfig?.gemensamTestning ?? false;
                        const revision = integrationConfig?.revision ?? false;

                        const handleWorkItemToggle = async (workItem: 'gemensamAnalys' | 'gemensamTestning' | 'revision', enabled: boolean) => {
                          if (!task.bpmnFile || !task.bpmnElementId) return;
                          await setIntegrationWorkItem(task.bpmnFile, task.bpmnElementId, workItem, enabled);
                          toast({
                            title: 'Uppdaterat',
                            description: `${workItem === 'gemensamAnalys' ? 'Gemensam analys' : workItem === 'gemensamTestning' ? 'Gemensam testning' : 'Revision'} ${enabled ? 'aktiverad' : 'inaktiverad'}`,
                          });
                        };

                        return (
                          <TableRow key={task.id}>
                            <TableCell>
                              <Checkbox
                                checked={isBankImplementation}
                                onCheckedChange={() => handleToggleBankImplementation(task)}
                                aria-label={`${jiraName} - Banken implementerar`}
                              />
                            </TableCell>
                            <TableCell className="font-medium max-w-xs break-words whitespace-normal">{jiraName}</TableCell>
                            <TableCell>
                              <Badge variant={getTaskTypeBadgeVariant(task.meta?.kind)}>
                                {getTaskTypeLabel(task.meta?.kind)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={gemensamAnalys}
                                onCheckedChange={(checked) => handleWorkItemToggle('gemensamAnalys', checked === true)}
                                aria-label={`${jiraName} - Gemensam analys`}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={gemensamTestning}
                                onCheckedChange={(checked) => handleWorkItemToggle('gemensamTestning', checked === true)}
                                aria-label={`${jiraName} - Gemensam testning`}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={revision}
                                onCheckedChange={(checked) => handleWorkItemToggle('revision', checked === true)}
                                aria-label={`${jiraName} - Revision`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={isBankImplementation ? 'default' : 'secondary'}>
                                {isBankImplementation ? 'Banken' : 'Stacc'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Stacc:</strong> Integrationen implementeras av Stacc. Standard tidsestimering används.
              </p>
              <p>
                <strong>Banken:</strong> Integrationen implementeras av Banken. Extra arbetsmoment läggs till i timeline (totalt 8 veckor extra).
              </p>
              <p className="pt-2 text-xs">
                Ändringar sparas automatiskt och påverkar timeline-beräkningen direkt.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProjectConfigurationPage;
