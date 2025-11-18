import { useState, useEffect } from 'react';
import { parseDmnFile, DmnParseResult } from '@/lib/dmnParser';
import { useToast } from '@/hooks/use-toast';

export const useDmnParser = (dmnFilePath: string | null) => {
  const [parseResult, setParseResult] = useState<DmnParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const parse = async () => {
      if (!dmnFilePath) {
        setParseResult(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const result = await parseDmnFile(dmnFilePath);
        
        if (isMounted) {
          setParseResult(result);
        }
      } catch (err) {
        const error = err as Error;
        if (isMounted) {
          setError(error);
          console.error('DMN parse error:', error);
          // Don't show toast for file not found (expected when DMN doesn't exist yet)
          if (!error.message.includes('Failed to load')) {
            toast({
              title: 'DMN Parse Error',
              description: `Failed to parse DMN file: ${error.message}`,
              variant: 'destructive',
            });
          }
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
  }, [dmnFilePath, toast]);

  return {
    parseResult,
    loading,
    error,
    decisionTables: parseResult?.decisionTables || [],
    decisions: parseResult?.decisions || [],
  };
};
