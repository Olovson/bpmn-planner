import { describe, it, expect } from 'vitest';
import { buildTestScenarioContext } from '@/lib/testGeneration/testScenarioContextBuilder';
import type { ExtractedUserStory } from '@/lib/testGeneration/userStoryExtractor';
import type { BpmnProcessGraph, BpmnProcessNode } from '@/lib/bpmnProcessGraph';

describe('testScenarioContextBuilder', () => {
  it('should build context from user stories and BPMN process graph', () => {
    const userStories: ExtractedUserStory[] = [
      {
        id: 'US-1',
        role: 'Kund',
        goal: 'skapa ansökan',
        value: 'jag kan ansöka om lån',
        acceptanceCriteria: [
          'Systemet ska validera att alla obligatoriska fält är ifyllda',
          'Systemet ska visa tydliga felmeddelanden om fält saknas',
        ],
        bpmnFile: 'mortgage-se-application.bpmn',
        bpmnElementId: 'application',
        docType: 'epic',
        docSource: 'storage',
        extractedAt: new Date(),
        source: 'epic-doc',
      },
    ];

    const rootNode: BpmnProcessNode = {
      bpmnElementId: 'application',
      type: 'userTask',
      name: 'Application',
      bpmnFile: 'mortgage-se-application.bpmn',
      children: [
        {
          bpmnElementId: 'end',
          type: 'event',
          name: 'End',
          bpmnFile: 'mortgage-se-application.bpmn',
          children: [],
        },
      ],
    };

    const processGraph: BpmnProcessGraph = {
      root: rootNode,
    };

    const context = buildTestScenarioContext(
      userStories,
      {
        summary: 'Kunden fyller i ansökningsinformation',
        flowSteps: ['Kunden öppnar formuläret', 'Kunden fyller i fält', 'Kunden skickar in'],
        dependencies: ['Kunden är inloggad'],
      },
      processGraph,
      'mortgage-se-application.bpmn',
      'application',
      'userTask',
      'Application'
    );

    expect(context).toBeDefined();
    expect(context.nodeContext.bpmnFile).toBe('mortgage-se-application.bpmn');
    expect(context.nodeContext.elementId).toBe('application');
    expect(context.nodeContext.nodeType).toBe('userTask');
    expect(context.nodeContext.nodeName).toBe('Application');
    expect(context.documentation.userStories).toHaveLength(1);
    expect(context.documentation.userStories[0].id).toBe('US-1');
    expect(context.documentation.summary).toBe('Kunden fyller i ansökningsinformation');
    expect(context.documentation.flowSteps).toHaveLength(3);
    expect(context.bpmnProcessFlow.paths).toBeDefined();
    expect(Array.isArray(context.bpmnProcessFlow.paths)).toBe(true);
  });

  it('should extract paths from process graph', () => {
    const rootNode: BpmnProcessNode = {
      bpmnElementId: 'start',
      type: 'event',
      name: 'Start',
      bpmnFile: 'test.bpmn',
      children: [
        {
          bpmnElementId: 'task1',
          type: 'serviceTask',
          name: 'Task 1',
          bpmnFile: 'test.bpmn',
          children: [
            {
              bpmnElementId: 'end',
              type: 'event',
              name: 'End',
              bpmnFile: 'test.bpmn',
              children: [],
            },
          ],
        },
      ],
    };

    const processGraph: BpmnProcessGraph = {
      root: rootNode,
    };

    const context = buildTestScenarioContext(
      [],
      {},
      processGraph,
      'test.bpmn',
      'start',
      'serviceTask',
      'Task 1'
    );

    expect(context.bpmnProcessFlow.paths.length).toBeGreaterThan(0);
    const happyPath = context.bpmnProcessFlow.paths.find(p => p.type === 'happy-path');
    expect(happyPath).toBeDefined();
    expect(happyPath?.nodes.length).toBeGreaterThan(0);
  });

  it('should extract error events from process graph', () => {
    const rootNode: BpmnProcessNode = {
      bpmnElementId: 'start',
      type: 'event',
      name: 'Start',
      bpmnFile: 'test.bpmn',
      children: [
        {
          bpmnElementId: 'error-event',
          type: 'event',
          name: 'Error Event',
          bpmnFile: 'test.bpmn',
          children: [],
        },
      ],
    };

    const processGraph: BpmnProcessGraph = {
      root: rootNode,
    };

    const context = buildTestScenarioContext(
      [],
      {},
      processGraph,
      'test.bpmn',
      'start',
      'serviceTask',
      'Task 1'
    );

    expect(context.bpmnProcessFlow.errorEvents).toBeDefined();
    expect(Array.isArray(context.bpmnProcessFlow.errorEvents)).toBe(true);
  });

  it('should handle empty user stories gracefully', () => {
    const rootNode: BpmnProcessNode = {
      bpmnElementId: 'start',
      type: 'event',
      name: 'Start',
      bpmnFile: 'test.bpmn',
      children: [],
    };

    const processGraph: BpmnProcessGraph = {
      root: rootNode,
    };

    const context = buildTestScenarioContext(
      [],
      {},
      processGraph,
      'test.bpmn',
      'start',
      'serviceTask',
      'Task 1'
    );

    expect(context).toBeDefined();
    expect(context.documentation.userStories).toHaveLength(0);
  });
});





