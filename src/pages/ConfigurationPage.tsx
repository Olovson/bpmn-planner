import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeaderWithTabs } from '@/components/AppHeaderWithTabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useRootBpmnFile } from '@/hooks/useRootBpmnFile';
import { useGlobalProjectConfig } from '@/contexts/GlobalProjectConfigContext';
import { useToast } from '@/hooks/use-toast';
import { IntegrationDefaultsSection } from '@/components/config/IntegrationDefaultsSection';
import { PerNodeWorkItemsSection } from '@/components/config/PerNodeWorkItemsSection';
import { ProjectActivitiesSection } from '@/components/config/ProjectActivitiesSection';
import { IntegrationsSection } from '@/components/config/IntegrationsSection';

const ConfigurationPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { data: rootFile } = useRootBpmnFile();
  const {
    config,
    loading,
    loadConfig,
  } = useGlobalProjectConfig();

  // Load configuration when root file changes
  useEffect(() => {
    if (rootFile) {
      loadConfig(rootFile);
    }
  }, [rootFile, loadConfig]);

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


  if (loading) {
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
                Konfigurera timeline-parametrar för projektplanering
              </p>
            </div>
            <Button onClick={() => navigate('/timeline')} variant="outline">
              Tillbaka till Timeline
            </Button>
          </div>

          <IntegrationDefaultsSection />

          <ProjectActivitiesSection />

          <PerNodeWorkItemsSection />

          <IntegrationsSection />
        </div>
      </main>
    </div>
  );
};

export default ConfigurationPage;

