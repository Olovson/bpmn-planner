import { useState, useEffect } from 'react';
import { parseBpmnFile, BpmnParseResult } from '@/lib/bpmnParser';
import { useToast } from '@/hooks/use-toast';

export const useBpmnParser = (bpmnFilePath: string | null) => {
  const [parseResult, setParseResult] = useState<BpmnParseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const parse = async () => {
      if (!bpmnFilePath) {
        setParseResult(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const result = await parseBpmnFile(bpmnFilePath);
        
        if (isMounted) {
          setParseResult(result);
        }
      } catch (err) {
        const error = err as Error;
        if (isMounted) {
          setError(error);
          toast({
            title: 'Parse Error',
            description: `Failed to parse BPMN file: ${error.message}`,
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    parse();

    return () => {
      isMounted = false;
    };
  }, [bpmnFilePath, toast]);

  return {
    parseResult,
    loading,
    error,
    // Helper getters
    elements: parseResult?.elements || [],
    subprocesses: parseResult?.subprocesses || [],
    sequenceFlows: parseResult?.sequenceFlows || [],
    callActivities: parseResult?.callActivities || [],
    serviceTasks: parseResult?.serviceTasks || [],
    userTasks: parseResult?.userTasks || [],
    businessRuleTasks: parseResult?.businessRuleTasks || [],
  };
};
