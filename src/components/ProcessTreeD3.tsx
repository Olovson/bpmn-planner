import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ProcessTreeNode, ProcessNodeType, NodeArtifact, getProcessNodeStyle, PROCESS_NODE_STYLES } from '@/lib/processTree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProcessTreeD3Props {
  root: ProcessTreeNode;
  selectedNodeId?: string;
  onSelectNode?: (node: ProcessTreeNode) => void;
  onArtifactClick?: (artifact: NodeArtifact, node: ProcessTreeNode) => void;
}

const getColorForNodeType = (type: ProcessNodeType): string => {
  return getProcessNodeStyle(type).hexColor;
};

const getLegendItems = () => {
  const order: ProcessNodeType[] = ['process', 'callActivity', 'userTask', 'serviceTask', 'businessRuleTask', 'dmnDecision'];
  return order.map(type => ({
    type,
    label: getProcessNodeStyle(type).label,
    color: getProcessNodeStyle(type).hexColor,
  }));
};

const nodeHasIssues = (node: ProcessTreeNode): boolean => {
  const linkIssue =
    node.subprocessLink &&
    node.subprocessLink.matchStatus &&
    node.subprocessLink.matchStatus !== 'matched';
  const nodeDiagnostics = (node.diagnostics && node.diagnostics.length > 0) || false;
  const linkDiagnostics = node.subprocessLink?.diagnostics && node.subprocessLink.diagnostics.length > 0;
  return Boolean(linkIssue || nodeDiagnostics || linkDiagnostics);
};

const summarizeDiagnostics = (node: ProcessTreeNode): string | null => {
  const parts: string[] = [];
  if (node.subprocessLink && node.subprocessLink.matchStatus && node.subprocessLink.matchStatus !== 'matched') {
    parts.push(`Subprocess: ${node.subprocessLink.matchStatus}`);
  }
  (node.diagnostics ?? []).forEach((diag) => {
    if (diag.message) {
      parts.push(diag.message);
    }
  });
  (node.subprocessLink?.diagnostics ?? []).forEach((diag) => {
    if (diag.message) {
      parts.push(diag.message);
    }
  });
  return parts.length ? parts.join(' • ') : null;
};

export function ProcessTreeD3({ root, selectedNodeId, onSelectNode, onArtifactClick }: ProcessTreeD3Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const handleExportPdf = () => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.removeAttribute('class');

    const width = svgElement.clientWidth || 1200;
    const height = svgElement.clientHeight || 800;
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <title>Processträd</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      svg {
        max-width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>
    ${svgString}
    <script>
      window.onload = function () {
        window.focus();
        window.print();
      };
    <\/script>
  </body>
</html>`);
    printWindow.document.close();
  };

  useEffect(() => {
    if (!root || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll('*').remove();

    // Create zoom group
    const g = svg
      .append('g')
      .attr('class', 'tree-root');

    // Filter collapsed nodes
    const filterCollapsed = (node: ProcessTreeNode): any => {
      const filtered = { ...node };
      if (collapsedIds.has(node.id)) {
        filtered.children = [];
      } else if (node.children && node.children.length > 0) {
        filtered.children = node.children.map(filterCollapsed);
      }
      return filtered;
    };

    const filteredRoot = filterCollapsed(root);

    // Create hierarchy
    const hierarchy = d3.hierarchy(filteredRoot, (d: any) => d.children);

    // Layout
    const treeLayout = d3.tree<ProcessTreeNode>().nodeSize([50, 220]);
    const treeData = treeLayout(hierarchy);

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    treeData.descendants().forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const treeWidth = maxY - minY + 200;
    const treeHeight = maxX - minX + 100;

    // Calculate scale to fit the entire tree
    const scaleX = (width - 100) / treeWidth;
    const scaleY = (height - 100) / treeHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in more than 1x

    // Center the tree initially
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-minY - treeWidth / 2, -minX - treeHeight / 2);

    g.attr('transform', initialTransform.toString());

    // Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoomBehavior as any);
    svg.call(zoomBehavior.transform as any, initialTransform);

    // Draw links
    g.selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<any, any>()
        .x((d: any) => d.y)
        .y((d: any) => d.x)
      )
      .attr('stroke', 'hsl(var(--border))')
      .attr('stroke-width', 2)
      .attr('fill', 'none')
      .attr('opacity', 0.6);

    // Draw nodes
    const node = g.selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node cursor-pointer')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      .on('click', (event, d: any) => {
        event.stopPropagation();
        
        // Check if node has children in original data
        const originalNode = d.data as ProcessTreeNode;
        const hasChildren = originalNode.children && originalNode.children.length > 0;
        
        if (hasChildren && event.shiftKey) {
          // Shift + click toggles collapse
          setCollapsedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(originalNode.id)) {
              newSet.delete(originalNode.id);
            } else {
              newSet.add(originalNode.id);
            }
            return newSet;
          });
        } else {
          // Regular click selects node
          onSelectNode?.(originalNode);
        }
      });

    // Node circle
    node.append('circle')
      .attr('r', (d: any) => {
        const originalNode = d.data as ProcessTreeNode;
        const hasChildren = originalNode.children && originalNode.children.length > 0;
        return hasChildren ? 12 : 8;
      })
      .attr('fill', (d: any) => getColorForNodeType(d.data.type))
      .attr('stroke', (d: any) => {
        const isSelected = d.data.id === selectedNodeId;
        return isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))';
      })
      .attr('stroke-width', (d: any) => {
        const isSelected = d.data.id === selectedNodeId;
        return isSelected ? 4 : 2;
      })
      .attr('opacity', 0.9);

    // Collapse indicator
    node.filter((d: any) => {
      const originalNode = d.data as ProcessTreeNode;
      return originalNode.children && originalNode.children.length > 0;
    })
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', 10)
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .text((d: any) => collapsedIds.has(d.data.id) ? '+' : '−');

    // Node label
    const label = node.append('text')
      .attr('dx', 18)
      .attr('dy', 4)
      .text((d: any) => (nodeHasIssues(d.data) ? `${d.data.label} ⚠︎` : d.data.label))
      .attr('font-size', 13)
      .attr('fill', 'hsl(var(--foreground))')
      .attr('pointer-events', 'none')
      .style('font-weight', (d: any) => {
        const isSelected = d.data.id === selectedNodeId;
        return isSelected ? '600' : '400';
      });

    label.each(function (d: any) {
      if (!nodeHasIssues(d.data)) return;
      const summary = summarizeDiagnostics(d.data);
      if (summary) {
        d3.select(this).append('title').text(summary);
      }
    });

  }, [root, selectedNodeId, collapsedIds, onSelectNode, onArtifactClick]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Legend */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-sm">Förklaring</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            Exportera till PDF
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-xs">
            {getLegendItems().map(item => (
              <div key={item.type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Klicka för att välja nod • Shift+klick för att expandera/kollapsa • Scrolla för zoom • Dra för att panorera
          </p>
        </CardContent>
      </Card>

      {/* Tree visualization */}
      <div className="flex-1 relative">
        <svg
          ref={svgRef}
          className="w-full h-full border rounded bg-background"
          style={{ minHeight: '500px' }}
        />
      </div>
    </div>
  );
}
