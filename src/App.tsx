import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import TestReport from "./pages/TestReport";
import NodeTestsPage from "./pages/NodeTestsPage";
import BpmnFileManager from "./pages/BpmnFileManager";
import RegistryStatus from "./pages/RegistryStatus";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import SubprocessDocs from "./pages/SubprocessDocs";
import NodeMatrix from "./pages/NodeMatrix";
import ProcessExplorer from "./pages/ProcessExplorer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BpmnSelectionProvider } from "./contexts/BpmnSelectionContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DocViewer from "./pages/DocViewer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <BpmnSelectionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/bpmn/:filename" element={<Index />} />
              <Route path="/process-explorer" element={<ProcessExplorer />} />
              <Route path="/subprocess/:subprocess" element={<SubprocessDocs />} />
              <Route path="/node-matrix" element={<NodeMatrix />} />
              <Route path="/test-report" element={<TestReport />} />
              <Route path="/node-tests" element={<NodeTestsPage />} />
              <Route path="/files" element={<ProtectedRoute><BpmnFileManager /></ProtectedRoute>} />
              <Route path="/registry-status" element={<ProtectedRoute><RegistryStatus /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/doc-viewer/:docId" element={<DocViewer />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </BpmnSelectionProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
