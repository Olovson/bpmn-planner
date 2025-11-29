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
import { CustomActivitiesSection } from '@/components/config/CustomActivitiesSection';
import { Save } from 'lucide-react';

const ConfigurationPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { data: rootFile } = useRootBpmnFile();
  const {
    config,
    loading,
    loadConfig,
    saveConfig,
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

  const handleSave = async () => {
    try {
      await saveConfig();
      toast({
        title: 'Konfiguration sparad',
        description: 'Dina inställningar har sparats.',
      });
    } catch (error) {
      console.error('[ConfigurationPage] Error saving:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte spara konfiguration.',
        variant: 'destructive',
      });
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
          <div className="max-w-4xl mx-auto">
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
        <div className="max-w-4xl mx-auto space-y-6">
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

          <PerNodeWorkItemsSection />

          <CustomActivitiesSection />

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} size="lg">
              <Save className="h-4 w-4 mr-2" />
              Spara konfiguration
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConfigurationPage;

