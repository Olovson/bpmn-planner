import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { STACC_INTEGRATION_MAPPING } from '@/data/staccIntegrationMapping';
import { useIntegration } from '@/contexts/IntegrationContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const IntegrationsSection = () => {
  const { useStaccIntegration, setUseStaccIntegration } = useIntegration();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Integrationer</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          Hantera Stacc-integrationskällor och konfigurera vilka som ska ersättas med bankens integrationskällor.
        </CardDescription>
      </CardHeader>
      {isExpanded && (
        <CardContent>
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
        </CardContent>
      )}
    </Card>
  );
};

