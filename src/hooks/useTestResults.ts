import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface TestScenario {
  id: string;
  name: string;
  description: string;
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  duration?: number;
  category: 'happy-path' | 'error-case' | 'edge-case';
}

export interface TestResult {
  id: string;
  test_file: string;
  node_id: string | null;
  node_name: string | null;
  status: 'passing' | 'failing' | 'pending' | 'skipped';
  test_count: number;
  duration: number | null;
  last_run: string;
  scenarios: TestScenario[] | null;
  error_message: string | null;
  github_run_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useTestResults = () => {
  const queryClient = useQueryClient();

  // Fetch all test results
  const { data: testResults = [], isLoading } = useQuery({
    queryKey: ['test-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .order('test_file', { ascending: true });

      if (error) throw error;
      
      // Parse scenarios JSON properly
      return (data || []).map(result => ({
        ...result,
        scenarios: result.scenarios ? (result.scenarios as unknown as TestScenario[]) : null
      })) as TestResult[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('test-results-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_results',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['test-results'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Helper function to get test result by node ID
  const getTestResultByNodeId = (nodeId: string): TestResult | undefined => {
    return testResults.find(result => result.node_id === nodeId);
  };

  // Helper function to get test result by test file
  const getTestResultByFile = (testFile: string): TestResult | undefined => {
    return testResults.find(result => result.test_file === testFile);
  };

  // Calculate overall statistics
  const stats = {
    total: testResults.length,
    passing: testResults.filter(r => r.status === 'passing').length,
    failing: testResults.filter(r => r.status === 'failing').length,
    pending: testResults.filter(r => r.status === 'pending').length,
    skipped: testResults.filter(r => r.status === 'skipped').length,
  };

  return {
    testResults,
    isLoading,
    getTestResultByNodeId,
    getTestResultByFile,
    stats,
  };
};