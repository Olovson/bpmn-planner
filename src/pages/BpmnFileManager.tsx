import { useState } from 'react';
import { FileText, FileCode, Upload, Trash2, Download, CheckCircle2, XCircle, AlertCircle, GitBranch, Loader2, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBpmnFiles, useUploadBpmnFile, useDeleteBpmnFile, BpmnFile } from '@/hooks/useBpmnFiles';
import { useSyncFromGithub, SyncResult } from '@/hooks/useSyncFromGithub';
import { supabase } from '@/integrations/supabase/client';
import { useAllFilesArtifactCoverage } from '@/hooks/useFileArtifactCoverage';
import { ArtifactStatusBadge } from '@/components/ArtifactStatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { generateAllFromBpmnWithGraph } from '@/lib/bpmnGenerators';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { getBpmnFileUrl } from '@/hooks/useDynamicBpmnFiles';
import { invalidateArtifactQueries } from '@/lib/queryInvalidation';
import { useResetAndRegenerate } from '@/hooks/useResetAndRegenerate';

export default function BpmnFileManager() {
  const { data: files = [], isLoading } = useBpmnFiles();
  const uploadMutation = useUploadBpmnFile();
  const deleteMutation = useDeleteBpmnFile();
  const syncMutation = useSyncFromGithub();
  const { data: coverageMap } = useAllFilesArtifactCoverage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragActive, setDragActive] = useState(false);
  const [deleteFile, setDeleteFile] = useState<BpmnFile | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showSyncReport, setShowSyncReport] = useState(false);
  const [generatingFile, setGeneratingFile] = useState<string | null>(null);
  
  interface DetailedGenerationResult {
    fileName: string;
    filesAnalyzed: string[];
    dorDodCriteria: Array<{ subprocess: string; category: string; type: string; text: string }>;
    testFiles: Array<{ fileName: string; elements: Array<{ id: string; name: string }> }>;
    docFiles: string[];
    jiraMappings: Array<{ elementId: string; elementName: string; jiraType: string; jiraName: string }>;
    subprocessMappings: Array<{ callActivity: string; subprocessFile: string }>;
  }
  
  const [generationResult, setGenerationResult] = useState<DetailedGenerationResult | null>(null);
  const [showGenerationReport, setShowGenerationReport] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  const { resetGeneratedData, isResetting } = useResetAndRegenerate();

  const handleSyncFromGithub = async () => {
    const result = await syncMutation.mutateAsync();
    setSyncResult(result);
    setShowSyncReport(true);
  };

  const handleGenerateArtifacts = async (file: BpmnFile) => {
    if (file.file_type !== 'bpmn') {
      toast({
        title: 'Ej stödd filtyp',
        description: 'Endast BPMN-filer stöds för generering',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingFile(file.file_name);
    
    try {
      // Kolla om användaren är autentiserad mot Supabase
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('Error getting Supabase session:', authError);
      }
      const isAuthenticated = !!authData?.session;

      if (!isAuthenticated) {
        // Visa tydligt meddelande och avbryt innan vi börjar skriva något
        toast({
          title: 'Inloggning krävs',
          description: 'Du är inte inloggad i Supabase. Logga in via Auth-sidan för att kunna generera och spara dokumentation, tester och DoR/DoD till registret.',
          variant: 'destructive',
        });

        console.warn(
          `Skipping artifact generation for ${file.file_name} because user is not authenticated against Supabase.`
        );
        return;
      }

      // Hämta alla tillgängliga BPMN-filer
      const { data: allFiles, error: filesError } = await supabase
        .from('bpmn_files')
        .select('file_name, file_type')
        .eq('file_type', 'bpmn');

      if (filesError) throw filesError;

      const existingBpmnFiles = allFiles?.map(f => f.file_name) || [];
      const existingDmnFiles: string[] = []; // DMN files kan läggas till senare

      // Avgör om hierarkisk analys ska användas (för toppnivåfiler)
      const topLevelFiles = ['mortgage.bpmn'];
      const useHierarchy = topLevelFiles.includes(file.file_name);

      console.log(`Generating for ${file.file_name} (hierarchy: ${useHierarchy})`);

      // Generera alla artefakter med hierarkisk analys
      const result = await generateAllFromBpmnWithGraph(
        file.file_name,
        existingBpmnFiles,
        existingDmnFiles,
        useHierarchy
      );

      // Spara DoR/DoD till databasen
      let dorDodCount = 0;
      const detailedDorDod: Array<{ subprocess: string; category: string; type: string; text: string }> = [];
      
      if (result.dorDod.size > 0) {
        const criteriaToInsert: any[] = [];
        
        result.dorDod.forEach((criteria, subprocessName) => {
          criteria.forEach(criterion => {
            criteriaToInsert.push({
              subprocess_name: subprocessName,
              ...criterion,
            });
            detailedDorDod.push({
              subprocess: subprocessName,
              category: criterion.criterion_category,
              type: criterion.criterion_type,
              text: criterion.criterion_text,
            });
          });
        });

        const { error: dbError } = await supabase
          .from('dor_dod_status')
          .upsert(criteriaToInsert, {
            onConflict: 'subprocess_name,criterion_key,criterion_type',
            ignoreDuplicates: false,
          });

        if (dbError) {
          console.error('Auto-save DoR/DoD error:', dbError);
        } else {
          dorDodCount = criteriaToInsert.length;
        }
      }

      // Spara genererade testfiler till Supabase Storage
      let testsCount = 0;
      const testLinksToInsert: any[] = [];
      const detailedTestFiles: Array<{ fileName: string; elements: Array<{ id: string; name: string }> }> = [];
      
      if (result.tests.size > 0) {
        for (const [testFileName, testContent] of result.tests.entries()) {
          const testPath = `tests/${testFileName}`;
          const testFileElements: Array<{ id: string; name: string }> = [];
          
          // Upload test file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('bpmn-files')
            .upload(testPath, new Blob([testContent], { type: 'text/plain' }), {
              upsert: true,
              contentType: 'text/plain',
            });

          if (uploadError) {
            console.error(`Error uploading test file ${testFileName}:`, uploadError);
          } else {
            testsCount++;
          }

          // För hierarkiska tester (.hierarchical.spec.ts): skapa länkar för alla element i filen
          if (testFileName.includes('.hierarchical.spec.ts')) {
            const bpmnFileName = testFileName.replace('.hierarchical.spec.ts', '.bpmn');
            const filesToProcess = (result.metadata?.filesIncluded && result.metadata.filesIncluded.length > 0)
              ? result.metadata.filesIncluded
              : [file.file_name];

            // Hitta matchande BPMN-fil
            const matchingFile = filesToProcess.find(f => f === bpmnFileName) || file.file_name;

            try {
              const fileUrl = await getBpmnFileUrl(matchingFile);
              const parsed = await parseBpmnFile(fileUrl);
              
              // Skapa test-länkar för alla testbara element i denna fil
              for (const element of parsed.elements) {
                const nodeType = element.type.replace('bpmn:', '');
                if (['UserTask', 'ServiceTask', 'BusinessRuleTask', 'CallActivity'].includes(nodeType)) {
                  testLinksToInsert.push({
                    bpmn_file: matchingFile,
                    bpmn_element_id: element.id,
                    test_file_path: testPath,
                    test_name: `Hierarchical test for ${element.name || element.id}`,
                  });
                  testFileElements.push({
                    id: element.id,
                    name: element.name || element.id,
                  });
                }
              }
            } catch (e) {
              console.error(`Error processing hierarchical test links for ${matchingFile}:`, e);
            }
          } else {
            // För icke-hierarkiska tester: gamla metoden (element-ID i filnamn)
            const elementId = testFileName.replace('.spec.ts', '');
            
            const filesToProcess = (result.metadata?.filesIncluded && result.metadata.filesIncluded.length > 0)
              ? result.metadata.filesIncluded
              : [file.file_name];

            for (const includedFile of filesToProcess) {
              try {
                const fileUrl = await getBpmnFileUrl(includedFile);
                const parsed = await parseBpmnFile(fileUrl);
                const element = parsed.elements.find(el => el.id === elementId);
                
                if (element) {
                  testLinksToInsert.push({
                    bpmn_file: includedFile,
                    bpmn_element_id: elementId,
                    test_file_path: testPath,
                    test_name: `Test for ${element.name || elementId}`,
                  });
                  testFileElements.push({
                    id: elementId,
                    name: element.name || elementId,
                  });
                  break;
                }
              } catch (e) {
                console.error(`Error processing test links for ${includedFile}:`, e);
              }
            }
          }
          
          if (testFileElements.length > 0) {
            detailedTestFiles.push({
              fileName: testFileName,
              elements: testFileElements,
            });
          }
        }

        if (testLinksToInsert.length > 0) {
          const { error: testError } = await supabase
            .from('node_test_links')
            .upsert(testLinksToInsert, {
              onConflict: 'bpmn_file,bpmn_element_id,test_file_path',
              ignoreDuplicates: false,
            });

          if (testError) {
            console.error('Save test links error:', testError);
          } else {
            invalidateArtifactQueries(queryClient);
          }
        }
      }

      // Spara dokumentation till Supabase Storage
      let docsCount = 0;
      const detailedDocFiles: string[] = [];
      
      if (result.docs.size > 0) {
        for (const [docFileName, docContent] of result.docs.entries()) {
          const docPath = `docs/${docFileName}`;
          const htmlBlob = new Blob([docContent], { type: 'text/html; charset=utf-8' });
          const { error: uploadError } = await supabase.storage
            .from('bpmn-files')
            .upload(docPath, htmlBlob, {
              upsert: true,
              contentType: 'text/html; charset=utf-8',
              cacheControl: '3600',
            });

          if (uploadError) {
            console.error(`Error uploading ${docFileName}:`, uploadError);
          } else {
            docsCount++;
            detailedDocFiles.push(docFileName);
          }
        }
      }

      // Spara subprocess mappings (dependencies) till databasen
      const detailedSubprocessMappings: Array<{ callActivity: string; subprocessFile: string }> = [];
      
      if (result.subprocessMappings.size > 0) {
        const dependenciesToInsert: any[] = [];
        
        result.subprocessMappings.forEach((childFile, elementId) => {
          dependenciesToInsert.push({
            parent_file: file.file_name,
            child_process: elementId,
            child_file: childFile,
          });
          detailedSubprocessMappings.push({
            callActivity: elementId,
            subprocessFile: childFile,
          });
        });

        const { error: depError } = await supabase
          .from('bpmn_dependencies')
          .upsert(dependenciesToInsert, {
            onConflict: 'parent_file,child_process',
            ignoreDuplicates: false,
          });

        if (depError) {
          console.error('Save dependencies error:', depError);
        }
      }

      // Spara BPMN element mappings med Jira-information
      // Detta behövs för att listvyn ska kunna visa jira_type och jira_name
      console.log('Building element mappings with Jira metadata...');
      const mappingsToInsert: any[] = [];
      const detailedJiraMappings: Array<{ elementId: string; elementName: string; jiraType: string; jiraName: string }> = [];
      
      // Hämta dependencies för att bygga fullständig hierarki
      const { data: dependencies } = await supabase
        .from('bpmn_dependencies')
        .select('parent_file, child_process, child_file');
      
      const depsMap = new Map<string, { parentFile: string; callActivityName: string }>();
      if (dependencies) {
        for (const dep of dependencies) {
          if (dep.child_file) {
            depsMap.set(dep.child_file, {
              parentFile: dep.parent_file,
              callActivityName: dep.child_process,
            });
          }
        }
      }
      
      // Helper: Bygg parentPath rekursivt från dependencies
      const buildParentPath = async (fileName: string): Promise<string[]> => {
        const dep = depsMap.get(fileName);
        if (!dep) return []; // Toppnivåfil
        
        // Hämta förälderns context root
        const parentUrl = `/bpmn/${dep.parentFile}`;
        const parentParsed = await parseBpmnFile(parentUrl);
        const parentRoot = dep.parentFile
          .replace('.bpmn', '')
          .replace(/^mortgage-se-/, '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        
        // Kapitalisera om det är "mortgage"
        const capitalizedRoot = parentRoot.charAt(0).toUpperCase() + parentRoot.slice(1);
        
        // Rekursivt hitta förälderns föräldrar
        const grandparentPath = await buildParentPath(dep.parentFile);
        
        // Returnera: [...grandparentPath, parentRoot, CallActivityName]
        return [...grandparentPath, capitalizedRoot];
      };
      
      if (useHierarchy && result.metadata) {
        // För hierarkiska filer: bygg hierarkin för att extrahera Jira-metadata
        for (const bpmnFileName of result.metadata.filesIncluded) {
          try {
            const bpmnUrl = `/bpmn/${bpmnFileName}`;
            const { buildBpmnHierarchy } = await import('@/lib/bpmnHierarchy');
            
            // Bygg parentPath från dependencies
            const parentPath = await buildParentPath(bpmnFileName);
            const hierarchy = await buildBpmnHierarchy(bpmnFileName, bpmnUrl, parentPath);
            
            // Extrahera alla noder från hierarkin (inklusive nested)
            const extractAllNodes = (node: any): any[] => {
              const nodes = [];
              if (node.type !== 'Process') {
                nodes.push(node);
              }
              if (node.children) {
                for (const child of node.children) {
                  nodes.push(...extractAllNodes(child));
                }
              }
              return nodes;
            };
            
            const allNodes = extractAllNodes(hierarchy.rootNode);
            
            // Skapa mappings för varje nod
            for (const node of allNodes) {
              mappingsToInsert.push({
                bpmn_file: node.bpmnFile,
                element_id: node.id,
                jira_type: node.jiraType || null,
                jira_name: node.jiraName || null,
              });
              
              if (node.jiraType && node.jiraName) {
                detailedJiraMappings.push({
                  elementId: node.id,
                  elementName: node.label,
                  jiraType: node.jiraType,
                  jiraName: node.jiraName,
                });
              }
            }
          } catch (error) {
            console.error(`Error building mappings for ${bpmnFileName}:`, error);
          }
        }
      } else {
        // För icke-hierarkiska filer: bygg basic hierarki för denna fil
        try {
          const bpmnUrl = `/bpmn/${file.file_name}`;
          const { buildBpmnHierarchy } = await import('@/lib/bpmnHierarchy');
          
          // Bygg parentPath från dependencies
          const parentPath = await buildParentPath(file.file_name);
          const hierarchy = await buildBpmnHierarchy(file.file_name, bpmnUrl, parentPath);
          
          // Extrahera alla noder från hierarkin (inklusive nested)
          const extractAllNodes = (node: any): any[] => {
            const nodes = [];
            if (node.type !== 'Process') {
              nodes.push(node);
            }
            if (node.children) {
              for (const child of node.children) {
                nodes.push(...extractAllNodes(child));
              }
            }
            return nodes;
          };
          
          const allNodes = extractAllNodes(hierarchy.rootNode);
          
          // Skapa mappings för varje nod
          for (const node of allNodes) {
            mappingsToInsert.push({
              bpmn_file: node.bpmnFile,
              element_id: node.id,
              jira_type: node.jiraType || null,
              jira_name: node.jiraName || null,
            });
            
            if (node.jiraType && node.jiraName) {
              detailedJiraMappings.push({
                elementId: node.id,
                elementName: node.label,
                jiraType: node.jiraType,
                jiraName: node.jiraName,
              });
            }
          }
        } catch (error) {
          console.error(`Error building mappings for ${file.file_name}:`, error);
        }
      }
      
      if (mappingsToInsert.length > 0) {
        const { error: mappingsError } = await supabase
          .from('bpmn_element_mappings')
          .upsert(mappingsToInsert, {
            onConflict: 'bpmn_file,element_id',
            ignoreDuplicates: false,
          });

        if (mappingsError) {
          console.error('Save element mappings error:', mappingsError);
        } else {
          console.log(`Saved ${mappingsToInsert.length} element mappings with Jira metadata`);
        }
      }

      // Clear structure change flag after successful generation
      if (file.has_structure_changes) {
        await supabase
          .from('bpmn_files')
          .update({ has_structure_changes: false })
          .eq('file_name', file.file_name);
      }

      // Set generation result for display
      const filesAnalyzed = useHierarchy && result.metadata 
        ? result.metadata.filesIncluded 
        : [file.file_name];
      
      setGenerationResult({
        fileName: file.file_name,
        filesAnalyzed,
        dorDodCriteria: detailedDorDod,
        testFiles: detailedTestFiles,
        docFiles: detailedDocFiles,
        jiraMappings: detailedJiraMappings,
        subprocessMappings: detailedSubprocessMappings,
      });
      setShowGenerationReport(true);

      const resultMessage: string[] = [];
      if (useHierarchy && result.metadata) {
        resultMessage.push(`Hierarkisk analys: ${result.metadata.totalFilesAnalyzed} filer`);
      }
      resultMessage.push(`${dorDodCount} DoR/DoD-kriterier`);
      resultMessage.push(`${testsCount} testkopplingar`);
      resultMessage.push(`${docsCount} dokumentationsfiler`);

      toast({
        title: 'Artefakter genererade!',
        description: resultMessage.join(', '),
      });

      // Refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bpmn-files'] }),
        queryClient.invalidateQueries({ queryKey: ['all-files-artifact-coverage'] }),
        queryClient.invalidateQueries({ queryKey: ['all-dor-dod-criteria'] }),
        queryClient.invalidateQueries({ queryKey: ['process-tree'] }),
        queryClient.invalidateQueries({ queryKey: ['bpmn-dependencies'] }),
      ]);
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generering misslyckades',
        description: error instanceof Error ? error.message : 'Ett okänt fel uppstod',
        variant: 'destructive',
      });
    } finally {
      setGeneratingFile(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Sequential file upload to avoid race conditions with multiple file uploads
  const handleFiles = async (fileList: FileList) => {
    const files = Array.from(fileList).filter(file =>
      file.name.endsWith('.bpmn') || file.name.endsWith('.dmn')
    );

    console.debug(`Starting sequential upload of ${files.length} files`);
    
    for (const file of files) {
      try {
        await uploadMutation.mutateAsync(file);
        console.debug(`Successfully uploaded: ${file.name}`);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with next file even if one fails
      }
    }
    
    console.debug('All file uploads completed');
  };

  const handleDownload = async (file: BpmnFile) => {
    const { data } = await supabase.storage
      .from('bpmn-files')
      .download(file.storage_path);

    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDeleteAllFiles = async () => {
    if (files.length === 0) return;

    setDeletingAll(true);
    setDeleteProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        await deleteMutation.mutateAsync(files[i].id);
        setDeleteProgress({ current: i + 1, total: files.length });
      }

      toast({
        title: 'Alla filer raderade',
        description: `${files.length} filer har tagits bort från alla lokationer`,
      });

      setShowDeleteAllDialog(false);
    } catch (error) {
      toast({
        title: 'Fel vid radering',
        description: 'Ett fel uppstod när filerna skulle tas bort',
        variant: 'destructive',
      });
    } finally {
      setDeletingAll(false);
      setDeleteProgress({ current: 0, total: 0 });
    }
  };

  const handleReset = async () => {
    setShowResetDialog(false);
    
    await resetGeneratedData({
      safeMode: false,
      deleteBpmn: false,
      deleteDmn: false,
      deleteDocs: true,
      deleteTests: true,
      deleteReports: true,
      deleteDorDod: true,
      deleteMappings: true,
      deleteAllTables: true,
      deleteGitHub: false,
      deleteTestResults: true,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">BPMN & DMN Filhantering</h1>
          <p className="text-muted-foreground">
            Hantera dina BPMN- och DMN-filer med automatisk GitHub-synkning
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.hash = '/registry-status'}
            className="gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Registry Status
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowResetDialog(true)}
            disabled={isResetting}
            className="gap-2"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Återställer...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Reset registret
              </>
            )}
          </Button>
          {files.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAllDialog(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Radera alla filer
            </Button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <Card className="p-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Ladda upp filer</h2>
            <p className="text-sm text-muted-foreground">
              Dra och släpp eller välj filer att ladda upp
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncFromGithub}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitBranch className="w-4 h-4" />
            )}
            {syncMutation.isPending ? 'Synkar...' : 'Synka från GitHub'}
          </Button>
        </div>
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            Släpp .bpmn eller .dmn filer här
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            eller klicka för att välja filer
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".bpmn,.dmn"
            multiple
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              Välj filer
            </label>
          </Button>
        </div>
      </Card>

      {/* Sync Report */}
      {showSyncReport && syncResult && (
        <Card className="p-6 mb-8">
          <Collapsible open={showSyncReport} onOpenChange={setShowSyncReport}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <h3 className="text-lg font-semibold">Synk-rapport från GitHub</h3>
                <Button variant="ghost" size="sm">
                  {showSyncReport ? 'Dölj' : 'Visa'}
                </Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {syncResult.added.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Tillagda filer ({syncResult.added.length})
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {syncResult.added.map((f) => (
                      <li key={f.file_name}>• {f.file_name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {syncResult.updated.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500" />
                    Uppdaterade filer ({syncResult.updated.length})
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {syncResult.updated.map((f) => (
                      <li key={f.file_name}>• {f.file_name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {syncResult.unchanged.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gray-500" />
                    Oförändrade filer ({syncResult.unchanged.length})
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {syncResult.unchanged.length} filer är redan uppdaterade
                  </p>
                </div>
              )}

              {syncResult.orphanedInDb.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    Endast i databasen ({syncResult.orphanedInDb.length})
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Dessa filer finns i databasen men inte längre i GitHub:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {syncResult.orphanedInDb.map((f) => (
                      <li key={f.file_name}>• {f.file_name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {syncResult.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Fel ({syncResult.errors.length})
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {syncResult.errors.map((e) => (
                      <li key={e.file_name}>
                        • {e.file_name}: {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Generation Report Dialog */}
      <Dialog open={showGenerationReport} onOpenChange={setShowGenerationReport}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Genereringsrapport - {generationResult?.fileName}</DialogTitle>
            <DialogDescription>
              Detaljerad översikt över alla genererade artefakter
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <h4 className="font-semibold text-sm">Filer</h4>
                </div>
                <div className="text-2xl font-bold">{generationResult?.filesAnalyzed.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Analyserade BPMN-filer</p>
              </div>

              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-500" />
                  <h4 className="font-semibold text-sm">DoR/DoD</h4>
                </div>
                <div className="text-2xl font-bold">{generationResult?.dorDodCriteria.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Kriterier skapade</p>
              </div>

              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold text-sm">Tester</h4>
                </div>
                <div className="text-2xl font-bold">{generationResult?.testFiles.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Testfiler skapade</p>
              </div>

              <div className="border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <h4 className="font-semibold text-sm">Dokumentation</h4>
                </div>
                <div className="text-2xl font-bold">{generationResult?.docFiles.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">HTML-filer skapade</p>
              </div>
            </div>

            {/* Analyzed Files */}
            {generationResult && generationResult.filesAnalyzed.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Analyserade BPMN-filer ({generationResult.filesAnalyzed.length})
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {generationResult.filesAnalyzed.map((file, i) => (
                    <li key={i}>• {file}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* DoR/DoD Criteria */}
            {generationResult && generationResult.dorDodCriteria.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  DoR/DoD Kriterier ({generationResult.dorDodCriteria.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {generationResult.dorDodCriteria.slice(0, 20).map((criterion, i) => (
                    <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                      <div className="font-medium">{criterion.subprocess}</div>
                      <div className="text-xs text-muted-foreground">
                        {criterion.type.toUpperCase()} - {criterion.category}: {criterion.text}
                      </div>
                    </div>
                  ))}
                  {generationResult.dorDodCriteria.length > 20 && (
                    <p className="text-xs text-muted-foreground italic">
                      ...och {generationResult.dorDodCriteria.length - 20} fler
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Test Files */}
            {generationResult && generationResult.testFiles.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  Testfiler ({generationResult.testFiles.length})
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {generationResult.testFiles.map((testFile, i) => (
                    <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                      <div className="font-medium mb-1">{testFile.fileName}</div>
                      {testFile.elements.length > 0 && (
                        <ul className="text-xs text-muted-foreground pl-4 space-y-0.5">
                          {testFile.elements.slice(0, 5).map((el, j) => (
                            <li key={j}>• {el.name} ({el.id})</li>
                          ))}
                          {testFile.elements.length > 5 && (
                            <li className="italic">...och {testFile.elements.length - 5} fler element</li>
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentation Files */}
            {generationResult && generationResult.docFiles.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Dokumentationsfiler ({generationResult.docFiles.length})
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {generationResult.docFiles.map((doc, i) => (
                    <li key={i}>• {doc}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Jira Mappings */}
            {generationResult && generationResult.jiraMappings.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Jira-mappningar ({generationResult.jiraMappings.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {generationResult.jiraMappings.slice(0, 15).map((mapping, i) => (
                    <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                      <div className="font-medium">{mapping.elementName}</div>
                      <div className="text-xs text-muted-foreground">
                        Type: {mapping.jiraType} | Jira: {mapping.jiraName}
                      </div>
                    </div>
                  ))}
                  {generationResult.jiraMappings.length > 15 && (
                    <p className="text-xs text-muted-foreground italic">
                      ...och {generationResult.jiraMappings.length - 15} fler
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Subprocess Mappings */}
            {generationResult && generationResult.subprocessMappings.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Subprocess-mappningar ({generationResult.subprocessMappings.length})
                </h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {generationResult.subprocessMappings.map((mapping, i) => (
                    <li key={i}>
                      • {mapping.callActivity} → {mapping.subprocessFile}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Message */}
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Alla artefakter har genererats och sparats!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Files Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filnamn</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Storlek</TableHead>
              <TableHead>Senast uppdaterad</TableHead>
              <TableHead>GitHub-status</TableHead>
              <TableHead>Kopplade artefakter</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Laddar filer...
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Inga filer uppladdade ännu
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {file.file_name}
                      {file.has_structure_changes && (
                        <div className="relative group">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border z-50">
                            ⚠️ Nya subprocess-filer har upptäckts som påverkar denna process. 
                            Generera om artefakter för att inkludera dem.
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {file.file_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatBytes(file.size_bytes)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(file.last_updated_at)}
                  </TableCell>
                  <TableCell>
                    {file.github_synced ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Synkad
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Ej synkad
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {file.file_type === 'bpmn' && coverageMap?.get(file.file_name) ? (
                        <>
                          <ArtifactStatusBadge
                            icon="📄"
                            label="Dok"
                            status={coverageMap.get(file.file_name)!.docs.status}
                            covered={coverageMap.get(file.file_name)!.docs.covered}
                            total={coverageMap.get(file.file_name)!.docs.total}
                          />
                          <ArtifactStatusBadge
                            icon="🧪"
                            label="Test"
                            status={coverageMap.get(file.file_name)!.tests.status}
                            covered={coverageMap.get(file.file_name)!.tests.covered}
                            total={coverageMap.get(file.file_name)!.tests.total}
                          />
                          <ArtifactStatusBadge
                            icon="✅"
                            label="DoR/DoD"
                            status={coverageMap.get(file.file_name)!.dorDod.status}
                            covered={coverageMap.get(file.file_name)!.dorDod.covered}
                            total={coverageMap.get(file.file_name)!.dorDod.total}
                          />
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {file.file_type === 'dmn' ? 'DMN-filer stöds ej' : 'Laddar...'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {file.file_type === 'bpmn' && (
                        <Button
                          size="sm"
                          variant={coverageMap?.get(file.file_name) ? (
                            coverageMap.get(file.file_name)!.docs.status === 'full' &&
                            coverageMap.get(file.file_name)!.tests.status === 'full' &&
                            coverageMap.get(file.file_name)!.dorDod.status === 'full'
                              ? "ghost"
                              : "outline"
                          ) : "outline"}
                          disabled={generatingFile === file.file_name}
                          onClick={() => handleGenerateArtifacts(file)}
                          className="gap-2"
                        >
                          {generatingFile === file.file_name ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Genererar...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              {coverageMap?.get(file.file_name) &&
                               coverageMap.get(file.file_name)!.docs.status === 'full' &&
                               coverageMap.get(file.file_name)!.tests.status === 'full' &&
                               coverageMap.get(file.file_name)!.dorDod.status === 'full'
                                ? 'Regenerera'
                                : 'Generera saknade'}
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteFile(file)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort fil?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort <strong>{deleteFile?.file_name}</strong>?
              {deleteFile?.usage && (deleteFile.usage.dorDodCount > 0 || deleteFile.usage.testsCount > 0) && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                  <p className="font-medium text-destructive flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Varning: Denna fil används av:
                  </p>
                  <ul className="mt-2 text-sm space-y-1">
                    {deleteFile.usage.testsCount > 0 && (
                      <li>• {deleteFile.usage.testsCount} tester</li>
                    )}
                    {deleteFile.usage.dorDodCount > 0 && (
                      <li>• {deleteFile.usage.dorDodCount} DoR/DoD-kriterier</li>
                    )}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteFile) {
                  deleteMutation.mutate(deleteFile.id);
                  setDeleteFile(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Files Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera alla filer?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera <strong>alla {files.length} filer</strong>?
              <br /><br />
              Detta kommer att:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ta bort alla filer från databasen</li>
                <li>Ta bort alla filer från Supabase Storage</li>
                <li>Ta bort alla filer från GitHub</li>
              </ul>
              <br />
              <strong className="text-destructive">Denna åtgärd kan inte ångras!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingAll && (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">
                  Raderar filer... ({deleteProgress.current} av {deleteProgress.total})
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-destructive h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllFiles}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Raderar...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Radera alla
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Registry Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Reset registret?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Detta kommer att radera ALL genererad data inklusive:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>DoR/DoD-kriterier</li>
                <li>Testfiler och testresultat</li>
                <li>Dokumentation</li>
                <li>Element-mappningar och Jira-metadata</li>
                <li>Beroenden</li>
              </ul>
              <br />
              <strong className="text-primary">BPMN- och DMN-källfiler påverkas INTE.</strong>
              <br /><br />
              <strong className="text-destructive">Denna åtgärd kan inte ångras!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Återställer...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset registret
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
