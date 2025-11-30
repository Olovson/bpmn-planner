import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TestReport from "./pages/TestReport";
import TestScriptsPage from "./pages/TestScriptsPage";
import NodeTestsPage from "./pages/NodeTestsPage";
import NodeTestScriptViewer from "./pages/NodeTestScriptViewer";
import BpmnFileManager from "./pages/BpmnFileManager";
import RegistryStatus from "./pages/RegistryStatus";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import NodeMatrix from "./pages/NodeMatrix";
import ProcessExplorer from "./pages/ProcessExplorer";
import ProcessGraphDebugPage from "./pages/ProcessGraphDebug";
import ProcessTreeDebugPage from "./pages/ProcessTreeDebug";
import JiraNamingDebugPage from "./pages/JiraNamingDebug";
import TimelinePage from "./pages/TimelinePage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BpmnSelectionProvider } from "./contexts/BpmnSelectionContext";
import { IntegrationProvider } from "./contexts/IntegrationContext";
import { GlobalProjectConfigProvider } from "./contexts/GlobalProjectConfigContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DocViewer from "./pages/DocViewer";
import { LlmDebugView } from "./pages/LlmDebugView";
import IntegrationsPage from "./pages/IntegrationsPage";
import ConfigurationPage from "./pages/ConfigurationPage";
import StyleGuidePage from "./pages/StyleGuidePage";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  // Ensure favicon is set for all pages
  useEffect(() => {
    const setFavicon = () => {
      const faviconPath = '/favicon.png';
      
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll('link[rel*="icon"]');
      existingLinks.forEach(link => link.remove());
      
      // Add standard favicon
      const linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      linkIcon.type = 'image/png';
      linkIcon.href = faviconPath;
      document.head.appendChild(linkIcon);
      
      // Add shortcut icon for older browsers
      const linkShortcut = document.createElement('link');
      linkShortcut.rel = 'shortcut icon';
      linkShortcut.type = 'image/png';
      linkShortcut.href = faviconPath;
      document.head.appendChild(linkShortcut);
      
      // Add apple-touch-icon for iOS devices
      const linkApple = document.createElement('link');
      linkApple.rel = 'apple-touch-icon';
      linkApple.href = faviconPath;
      document.head.appendChild(linkApple);
    };
    
    setFavicon();
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    (async () => {
      try {
        const { error } = await supabase.from("generation_jobs").select("mode").limit(1);
        if (error) {
          const isSchemaModeError =
            typeof error.code === "string" &&
            error.code === "PGRST204" &&
            typeof error.message === "string" &&
            error.message.includes("'mode' column of 'generation_jobs'");

          if (isSchemaModeError) {
            console.error(
              "[DB Schema Check] SUPABASE MISSMATCH: Den aktiva databasen saknar kolumnen \"mode\" i \"generation_jobs\".\n" +
                "Detta innebär att migrationer inte är körda eller att appen pekar mot fel Supabase-projekt.\n" +
                `Aktiv VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL}\n` +
                "Åtgärd: Kör \"npm run check:db\" och följ instruktionerna i README under \"Local Schema Debug Checklist\"."
            );
          }
        }
      } catch (err) {
        console.error("[DB Schema Check] Oväntat fel vid schema-kontroll:", err);
      }
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BpmnSelectionProvider>
          <IntegrationProvider>
            <GlobalProjectConfigProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <HashRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/bpmn/:filename" element={<Index />} />
                  <Route path="/process-explorer" element={<ProcessExplorer />} />
                  <Route path="/node-matrix" element={<NodeMatrix />} />
                  <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
                  <Route path="/test-report" element={<TestReport />} />
                  <Route path="/test-scripts" element={<TestScriptsPage />} />
                  <Route path="/node-tests" element={<NodeTestsPage />} />
                  <Route path="/node-test-script" element={<NodeTestScriptViewer />} />
                  <Route path="/files" element={<ProtectedRoute><BpmnFileManager /></ProtectedRoute>} />
                  <Route path="/registry-status" element={<ProtectedRoute><RegistryStatus /></ProtectedRoute>} />
                  <Route path="/llm-debug" element={<ProtectedRoute><LlmDebugView /></ProtectedRoute>} />
                  <Route path="/graph-debug" element={<ProtectedRoute><ProcessGraphDebugPage /></ProtectedRoute>} />
                  <Route path="/tree-debug" element={<ProtectedRoute><ProcessTreeDebugPage /></ProtectedRoute>} />
                  <Route path="/jira-naming-debug" element={<ProtectedRoute><JiraNamingDebugPage /></ProtectedRoute>} />
                  <Route path="/timeline" element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
                  <Route path="/configuration" element={<ProtectedRoute><ConfigurationPage /></ProtectedRoute>} />
                  <Route path="/styleguide" element={<StyleGuidePage />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/doc-viewer/:docId" element={<DocViewer />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </HashRouter>
              </TooltipProvider>
            </GlobalProjectConfigProvider>
          </IntegrationProvider>
        </BpmnSelectionProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
