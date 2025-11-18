import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, AlertCircle, Database, Settings } from "lucide-react";
import { useAllSubprocesses } from "@/hooks/useDorDodStatus";
import { SUBPROCESS_REGISTRY } from "@/data/subprocessRegistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RegistryStatus() {
  const navigate = useNavigate();
  const { data: allSubprocesses = [] } = useAllSubprocesses();

  // Get unique elements from database
  const dbElements = Array.from(
    new Map(
      allSubprocesses
        .filter(s => s.bpmn_file && s.bpmn_element_id)
        .map(s => [s.subprocess_name, s])
    ).values()
  );

  // Check which elements are in registry
  const elementsStatus = dbElements.map(element => {
    const inRegistry = SUBPROCESS_REGISTRY.some(r => r.id === element.subprocess_name);
    return {
      subprocess_name: element.subprocess_name,
      bpmn_file: element.bpmn_file,
      bpmn_element_id: element.bpmn_element_id,
      node_type: element.node_type,
      inRegistry,
    };
  });

  const inRegistryCount = elementsStatus.filter(e => e.inRegistry).length;
  const missingCount = elementsStatus.filter(e => !e.inRegistry).length;

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/files')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till fillista
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-4xl font-bold text-primary">Registry Status</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <Database className="h-4 w-4 inline mr-2" />
                Totalt i databas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dbElements.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <CheckCircle className="h-4 w-4 inline mr-2" />
                I registry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{inRegistryCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Saknas i registry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{missingCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Element Status</CardTitle>
            <CardDescription>
              Översikt över vilka BPMN-element som finns i databasen och om de är registrerade i subprocessRegistry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Element namn</TableHead>
                  <TableHead>BPMN fil</TableHead>
                  <TableHead>Element ID</TableHead>
                  <TableHead>Node typ</TableHead>
                  <TableHead>Registry status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elementsStatus
                  .sort((a, b) => {
                    // Sort by registry status first (missing first), then by name
                    if (a.inRegistry !== b.inRegistry) {
                      return a.inRegistry ? 1 : -1;
                    }
                    return a.subprocess_name.localeCompare(b.subprocess_name);
                  })
                  .map((element) => (
                    <TableRow key={`${element.bpmn_file}-${element.subprocess_name}`}>
                      <TableCell className="font-medium">
                        {element.subprocess_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {element.bpmn_file}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {element.bpmn_element_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {element.node_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {element.inRegistry ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            I registry
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Saknas
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>

            {missingCount > 0 && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  <strong>{missingCount} element</strong> saknas i subprocessRegistry. 
                  De fungerar fortfarande med auto-genererad information, men för bättre UX 
                  (titlar, subtitles, Figma/Jira-länkar) kan du överväga att lägga till dem manuellt.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
