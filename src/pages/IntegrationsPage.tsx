import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { useAuth } from '@/hooks/useAuth';
import { STACC_INTEGRATION_MAPPING } from '@/data/staccIntegrationMapping';
import { useIntegration } from '@/contexts/IntegrationContext';
import { useNavigate, useLocation } from 'react-router-dom';

const IntegrationsPage = () => {
  const { user, signOut } = useAuth();
  const { useStaccIntegration, setUseStaccIntegration } = useIntegration();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current view for navigation (integrations page doesn't have a specific view key)
  const currentView: 'diagram' | 'tree' | 'listvy' | 'tests' | 'files' | 'timeline' = 'diagram';

  const handleViewChange = (value: string) => {
    if (value === 'listvy') {
      navigate('/node-matrix');
    } else if (value === 'tree') {
      navigate('/process-explorer');
    } else if (value === 'tests') {
      navigate('/test-report');
    } else if (value === 'files') {
      navigate('/files');
    } else if (value === 'timeline') {
      navigate('/timeline');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeaderWithTabs
        userEmail={user?.email || null}
        currentView={currentView}
        onViewChange={handleViewChange}
        onOpenVersions={() => {}}
        onSignOut={signOut}
      />
      <main className="ml-16 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header - Standardiserad struktur */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Integrationer</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Hantera Stacc-integrationskällor och konfigurera vilka som ska ersättas med bankens integrationskällor.
              </p>
            </div>
          </div>

          <div className="border rounded-lg">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">BPMN Fil</TableHead>
                    <TableHead className="w-[250px]">Element</TableHead>
                    <TableHead className="w-[200px]">Element ID</TableHead>
                    <TableHead className="w-[120px]">Typ</TableHead>
                    <TableHead className="w-[300px]">Beskrivning</TableHead>
                    <TableHead className="w-[350px]">Staccs integrationskälla</TableHead>
                    <TableHead className="w-[250px]">Ersätts med bankens integrationskälla</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STACC_INTEGRATION_MAPPING.map((mapping) => {
                    const useStacc = useStaccIntegration(mapping.bpmnFile, mapping.elementId);
                    
                    return (
                      <TableRow key={`${mapping.bpmnFile}:${mapping.elementId}`}>
                        <TableCell className="text-xs font-mono">
                          {mapping.bpmnFile}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {mapping.elementName}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {mapping.elementId}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary">
                            {mapping.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {mapping.description}
                        </TableCell>
                        <TableCell className="text-xs break-words whitespace-normal">
                          {mapping.integrationSource}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={useStacc}
                            onCheckedChange={(checked) => {
                              setUseStaccIntegration(
                                mapping.bpmnFile,
                                mapping.elementId,
                                checked === true,
                              );
                            }}
                            className="cursor-pointer"
                            aria-label={`Ersätts med bankens integrationskälla för ${mapping.elementName}. ${useStacc ? 'Använder Stacc integration' : 'Ersätter med bankens integration'}`}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {STACC_INTEGRATION_MAPPING.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Inga integrationer hittades i mappningen.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default IntegrationsPage;

