import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ProcessTreeNode } from '@/lib/processTree';
import type { E2eScenario } from '@/pages/E2eTestsOverviewPage';

export interface NodeCoverage {
  scenarioIds: string[];
}

export interface TestCoverageIcicleProps {
  root: ProcessTreeNode;
  coverageByNodeId: Map<string, NodeCoverage>;
  scenarios: E2eScenario[];
}

interface HierarchyNodeExtra {
  node: ProcessTreeNode;
  coverage?: NodeCoverage;
}

const SCENARIO_COLORS: Record<string, string> = {
  E2E_BR001: '#3b82f6', // blå
  E2E_BR006: '#22c55e', // grön
};

const DEFAULT_UNCOVERED_COLOR = '#e5e7eb'; // tailwind gray-200
const DEFAULT_MULTI_SCENARIO_COLOR = '#a855f7'; // lila

export const TestCoverageIcicle: React.FC<TestCoverageIcicleProps> = ({
  root,
  coverageByNodeId,
  scenarios,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = svgRef.current.parentElement;
    if (!container) return;
    
    const width = container.clientWidth || 1400;
    const height = container.clientHeight || 700;

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`).style('font-size', '10px');

    const rootHierarchy = d3
      .hierarchy<HierarchyNodeExtra>({
        node: root,
        coverage: coverageByNodeId.get(root.id),
      } as HierarchyNodeExtra, (d) => {
        if (!d.node.children || d.node.children.length === 0) return null;
        return d.node.children.map((child) => ({
          node: child,
          coverage: coverageByNodeId.get(child.id),
        })) as any;
      })
      .sum(() => 1)
      .sort((a, b) => (a.value || 0) - (b.value || 0));
    
    if (!rootHierarchy.value || rootHierarchy.value === 0) {
      console.warn('[TestCoverageIcicle] Root hierarchy has no value, adding default');
      rootHierarchy.value = 1;
    }

    const partition = d3.partition<HierarchyNodeExtra>().size([width, height]);
    const nodes = partition(rootHierarchy).descendants();

    const g = svg.append('g');

    const rect = g
      .selectAll('rect')
      .data(nodes)
      .enter()
      .append('rect')
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('width', (d) => Math.max(0, d.x1 - d.x0 - 0.5))
      .attr('height', (d) => Math.max(0, d.y1 - d.y0 - 0.5))
      .attr('fill', (d) => {
        const cov = d.data.coverage;
        if (!cov || cov.scenarioIds.length === 0) return DEFAULT_UNCOVERED_COLOR;
        if (cov.scenarioIds.length === 1) {
          const color = SCENARIO_COLORS[cov.scenarioIds[0]];
          return color || DEFAULT_MULTI_SCENARIO_COLOR;
        }
        return DEFAULT_MULTI_SCENARIO_COLOR;
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5);

    const formatNodeLabel = (n: ProcessTreeNode): string => {
      if (n.label) return n.label;
      if (n.bpmnElementId) return n.bpmnElementId;
      return n.type;
    };

    const label = g
      .selectAll('text')
      .data(nodes.filter((d) => d.y1 - d.y0 > 14))
      .enter()
      .append('text')
      .attr('x', (d) => d.x0 + 4)
      .attr('y', (d) => d.y0 + 12)
      .attr('fill', '#111827')
      .attr('pointer-events', 'none')
      .text((d) => formatNodeLabel(d.data.node));

    // Tooltip via native title (enkel första version)
    rect.append('title').text((d) => {
      const n = d.data.node;
      const cov = d.data.coverage;
      const scenarioLabels = cov?.scenarioIds.length
        ? cov.scenarioIds.join(', ')
        : 'Inga E2E-scenarier';
      return `${formatNodeLabel(n)}\nTyp: ${n.type}\nBPMN: ${n.bpmnFile}\nScenarier: ${scenarioLabels}`;
    });

    // Zoom & pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom as any);
  }, [root, coverageByNodeId, scenarios]);

  return (
    <div className="w-full h-full border rounded-md bg-background overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block" />
    </div>
  );
};


