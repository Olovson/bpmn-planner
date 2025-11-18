import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ProcessTreeNode, ProcessNodeType, NodeArtifact } from '@/lib/processTree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProcessTreeD3Props {
  root: ProcessTreeNode;
  selectedNodeId?: string;
  onSelectNode?: (node: ProcessTreeNode) => void;
  onArtifactClick?: (artifact: NodeArtifact, node: ProcessTreeNode) => void;
}

const getColorForNodeType = (type: ProcessNodeType): string => {
  const colors: Record<ProcessNodeType, string> = {
    process: '#3B82F6',
    subprocess: '#3B82F6',
    callActivity: '#8B5CF6',
    userTask: '#10B981',
    serviceTask: '#8B5CF6',
    businessRuleTask: '#F59E0B',
    dmnDecision: '#EAB308',
  };
  return colors[type] || '#64748B';
};

const getLegendItems = () => [
  { type: 'process' as ProcessNodeType, label: 'Process/Subprocess', color: '#3B82F6' },
  { type: 'userTask' as ProcessNodeType, label: 'User Task', color: '#10B981' },
  { type: 'serviceTask' as ProcessNodeType, label: 'Service Task', color: '#8B5CF6' },
  { type: 'businessRuleTask' as ProcessNodeType, label: 'Business Rule Task', color: '#F59E0B' },
  { type: 'dmnDecision' as ProcessNodeType, label: 'DMN Decision', color: '#EAB308' },
];

export function ProcessTreeD3({ root, selectedNodeId, onSelectNode, onArtifactClick }: ProcessTreeD3Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

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
    node.append('text')
      .attr('dx', 18)
      .attr('dy', 4)
      .text((d: any) => d.data.label)
      .attr('font-size', 13)
      .attr('fill', 'hsl(var(--foreground))')
      .attr('pointer-events', 'none')
      .style('font-weight', (d: any) => {
        const isSelected = d.data.id === selectedNodeId;
        return isSelected ? '600' : '400';
      });

    // Artifacts badges
    node.each(function (d: any) {
      const nodeData: ProcessTreeNode = d.data;
      if (!nodeData.artifacts || nodeData.artifacts.length === 0) return;

      const foreign = d3.select(this)
        .append('foreignObject')
        .attr('x', 18)
        .attr('y', 10)
        .attr('width', 200)
        .attr('height', 30);

      const div = foreign
        .append('xhtml:div')
        .style('display', 'flex')
        .style('flex-wrap', 'wrap')
        .style('gap', '3px')
        .style('margin-top', '2px');

      nodeData.artifacts.forEach((artifact) => {
        const badge = div
          .append('xhtml:button')
          .attr('class', 'artifact-badge')
          .style('display', 'inline-flex')
          .style('align-items', 'center')
          .style('padding', '2px 8px')
          .style('font-size', '10px')
          .style('border-radius', '9999px')
          .style('border', 'none')
          .style('cursor', 'pointer')
          .style('transition', 'all 0.15s')
          .style('font-family', 'inherit')
          .on('click', (event: MouseEvent) => {
            event.stopPropagation();
            if (onArtifactClick) {
              onArtifactClick(artifact, nodeData);
            }
          });

        // Set colors based on artifact type
        if (artifact.type === 'test') {
          badge
            .style('background-color', '#d1fae5')
            .style('color', '#065f46')
            .on('mouseenter', function() {
              d3.select(this).style('background-color', '#a7f3d0');
            })
            .on('mouseleave', function() {
              d3.select(this).style('background-color', '#d1fae5');
            });
          badge.text(`🧪 Test (${artifact.count || 0})`);
        } else if (artifact.type === 'doc') {
          badge
            .style('background-color', '#dbeafe')
            .style('color', '#1e40af')
            .on('mouseenter', function() {
              d3.select(this).style('background-color', '#bfdbfe');
            })
            .on('mouseleave', function() {
              d3.select(this).style('background-color', '#dbeafe');
            });
          badge.text('📄 Dok');
        } else if (artifact.type === 'dor') {
          // Combined DoR/DoD badge
          badge
            .style('background-color', '#fef3c7')
            .style('color', '#92400e')
            .on('mouseenter', function() {
              d3.select(this).style('background-color', '#fde68a');
            })
            .on('mouseleave', function() {
              d3.select(this).style('background-color', '#fef3c7');
            });
          badge.text(`✅ DoR/DoD (${artifact.count || 0})`);
        }

        // Add title for tooltip
        badge.append('xhtml:title').text(artifact.label);
      });
    });

  }, [root, selectedNodeId, collapsedIds, onSelectNode, onArtifactClick]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Legend */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Förklaring</CardTitle>
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
