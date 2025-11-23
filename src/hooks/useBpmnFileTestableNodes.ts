import { useQuery } from '@tanstack/react-query';
import { parseBpmnFile } from '@/lib/bpmnParser';
import { getBpmnFileUrl } from './useDynamicBpmnFiles';

export type TestableNodeType =
  | 'UserTask'
  | 'ServiceTask'
  | 'BusinessRuleTask'
  | 'CallActivity';

export interface TestableBpmnNode {
  id: string;
  name: string;
  type: TestableNodeType;
}

const isRelevantNodeType = (type: string): type is TestableNodeType => {
  return /(?:^|:)(UserTask|ServiceTask|BusinessRuleTask|CallActivity)$/.test(
    type,
  );
};

export const useBpmnFileTestableNodes = (fileName?: string | null) => {
  const enabled = Boolean(fileName && fileName.endsWith('.bpmn'));

  const { data, isLoading } = useQuery({
    queryKey: ['bpmn-file-testable-nodes', fileName],
    enabled,
    queryFn: async (): Promise<TestableBpmnNode[]> => {
      if (!fileName) return [];

      const fileUrl = await getBpmnFileUrl(fileName);
      const parseResult = await parseBpmnFile(fileUrl);

      return parseResult.elements
        .filter((el) => isRelevantNodeType(el.type))
        .map((el) => ({
          id: el.id,
          name: el.name || el.id,
          type: (el.type.split(':').pop() || el.type) as TestableNodeType,
        }));
    },
  });

  return {
    nodes: data ?? [],
    isLoading,
  };
};

