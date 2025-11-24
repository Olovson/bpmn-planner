import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as d3 from 'd3';
import { ProcessTreeNode, ProcessNodeType, NodeArtifact, getProcessNodeStyle, PROCESS_NODE_STYLES } from '@/lib/processTree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProcessTreeD3Props {
  root: ProcessTreeNode;
  selectedNodeId?: string;
  onSelectNode?: (node: ProcessTreeNode) => void;
  onArtifactClick?: (artifact: NodeArtifact, node: ProcessTreeNode) => void;
  /** Visa legend-kortet ovanför trädet (default: true) */
  showLegend?: boolean;
  /** Visa själva D3-trädet (default: true) */
  showTree?: boolean;
  /** Externt kollaps-state (delas mellan instanser) */
  collapsedIds?: Set<string>;
  onCollapsedIdsChange?: (ids: Set<string>) => void;
  /** Filtrera nodtyper - om satt, visas bara noder med dessa typer */
  nodeTypeFilter?: Set<ProcessNodeType>;
  /** Callback när nodeTypeFilter ändras */
  onNodeTypeFilterChange?: (filter: Set<ProcessNodeType>) => void;
}

export interface ProcessTreeD3Api {
  zoomToFitCurrentTree: () => void;
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

export const ProcessTreeD3 = forwardRef<ProcessTreeD3Api, ProcessTreeD3Props>(({
  root,
  selectedNodeId,
  onSelectNode,
  onArtifactClick,
  showLegend = true,
  showTree = true,
  collapsedIds: externalCollapsedIds,
  onCollapsedIdsChange,
  nodeTypeFilter,
  onNodeTypeFilterChange,
}, ref) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const treeDataRef = useRef<d3.HierarchyPointNode<ProcessTreeNode> | null>(null);
  const [internalCollapsedIds, setInternalCollapsedIds] = useState<Set<string>>(new Set());
  const [fitOnNextLayout, setFitOnNextLayout] = useState(false);
  const collapsedIds = externalCollapsedIds ?? internalCollapsedIds;
  const setCollapsedIds = onCollapsedIdsChange ?? setInternalCollapsedIds;

  const handleExportPdf = () => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.removeAttribute('class');

    // Sätt explicita färger istället för CSS-variabler
    clonedSvg.querySelectorAll('path.link').forEach((el) => {
      (el as SVGPathElement).setAttribute('stroke', '#CBD5E1');
    });
    clonedSvg.querySelectorAll('circle').forEach((el) => {
      const circle = el as SVGCircleElement;
      if (circle.getAttribute('stroke')?.includes('var(')) {
        circle.setAttribute('stroke', '#0F172A');
      }
    });
    clonedSvg.querySelectorAll('text').forEach((el) => {
      const text = el as SVGTextElement;
      if (text.getAttribute('fill')?.includes('var(')) {
        text.setAttribute('fill', '#0F172A');
      }
    });

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

  // Imperative API: zoom to fit current tree
  const zoomToFitCurrentTree = useCallback(() => {
    const svgElement = svgRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    const g = gRef.current;
    const treeData = treeDataRef.current;

    if (!svgElement || !zoomBehavior || !g || !treeData) {
      console.warn('[ProcessTreeD3] Cannot zoom to fit: missing refs');
      return;
    }

    const width = svgElement.clientWidth;
    const height = svgElement.clientHeight;

    // Calculate bounds from current tree data
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

    // Create transform to center and fit tree
    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-minY - treeWidth / 2, -minX - treeHeight / 2);

    // Apply transform with transition
    const svg = d3.select(svgElement);
    svg.transition()
      .duration(750)
      .call(zoomBehavior.transform as any, transform);
  }, []);

  // Expose API via ref
  useImperativeHandle(ref, () => ({
    zoomToFitCurrentTree,
  }), [zoomToFitCurrentTree]);

  const handleCollapseAll = () => {
    const allIds = new Set<string>();
    const traverse = (node: ProcessTreeNode, isRoot: boolean) => {
      if (!isRoot) {
        allIds.add(node.id);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => traverse(child, false));
      }
    };
    traverse(root, true);
    setCollapsedIds(allIds);
    setFitOnNextLayout(true);
  };

  const handleExpandAll = () => {
    setCollapsedIds(new Set());
    setFitOnNextLayout(true);
  };

  useEffect(() => {
    if (!root || !svgRef.current) return;

    const svgElement = svgRef.current;
    const svg = d3.select(svgElement);
    const width = svgElement.clientWidth;
    const height = svgElement.clientHeight;

    // Spara ev. tidigare zoom/pan så att vi kan behålla den över interaktioner
    const previousTransform = (svg as any).property('__zoom') as d3.ZoomTransform | undefined;

    svg.selectAll('*').remove();

    // Create zoom group
    const g = svg
      .append('g')
      .attr('class', 'tree-root');

    // Filter collapsed nodes and node types, men behåll info om huruvida noden har barn i originalträdet
    const filterCollapsed = (node: ProcessTreeNode, isRoot: boolean = false): any => {
      // Process-noder (root) ska alltid visas, annars filtrera på nodtyp om filter är satt
      if (!isRoot && nodeTypeFilter && nodeTypeFilter.size > 0 && !nodeTypeFilter.has(node.type)) {
        // Om noden inte matchar filtret, returnera null så att den hoppas över
        return null;
      }

      const hasChildren = node.children && node.children.length > 0;
      const filtered: any = { ...node };
      // Markera om noden kan ha barn, oavsett kollaps-state
      filtered._hasChildren = hasChildren;

      if (collapsedIds.has(node.id)) {
        filtered.children = [];
      } else if (hasChildren) {
        // Filtrera barn och ta bort null-värden
        filtered.children = node.children!
          .map((child) => filterCollapsed(child, false))
          .filter((child: any) => child !== null);
      } else {
        filtered.children = [];
      }
      return filtered;
    };

    const filteredRoot = filterCollapsed(root, true);
    
    // Om root-noden filtrerades bort, använd en tom root
    if (!filteredRoot) {
      return;
    }

    // Create hierarchy
    const hierarchy = d3.hierarchy(filteredRoot, (d: any) => d.children);

    // Layout
    const treeLayout = d3.tree<ProcessTreeNode>().nodeSize([50, 220]);
    const treeData = treeLayout(hierarchy);
    
    // Save treeData reference for zoomToFit function
    treeDataRef.current = treeData;

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

    // Center the tree (första gången) baserat på bounds
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-minY - treeWidth / 2, -minX - treeHeight / 2);

    // Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    // Save references for zoomToFit function
    zoomBehaviorRef.current = zoomBehavior;
    gRef.current = g;

    svg.call(zoomBehavior as any);

    // Återställ tidigare zoom/pan om den finns, men om vi just har kollapsat/expanderat
    // vill vi göra en ny "fit to content".
    const transformToApply =
      fitOnNextLayout || !previousTransform ? initialTransform : previousTransform;

    svg.call(zoomBehavior.transform as any, transformToApply);
    g.attr('transform', transformToApply.toString());

    if (fitOnNextLayout) {
      setFitOnNextLayout(false);
    }
    // Inaktivera dubbelklick-zoom så att vi kan använda dubbelklick på noder
    svg.on('dblclick.zoom', null);

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

        const originalNode = d.data as ProcessTreeNode;
        const hasChildren = (d.data as any)._hasChildren;

        // Shift + klick eller dubbelklick togglar kollaps
        if (hasChildren && (event.shiftKey || event.detail >= 2)) {
          setCollapsedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(originalNode.id)) {
              newSet.delete(originalNode.id);
            } else {
              newSet.add(originalNode.id);
            }
            return newSet;
          });
          return;
        }

        // Vanligt enkelklick väljer nod
        onSelectNode?.(originalNode);
      });

    // Node circle
    node.append('circle')
      .attr('r', (d: any) => ((d.data as any)._hasChildren ? 12 : 8))
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
    node.filter((d: any) => (d.data as any)._hasChildren)
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

  }, [root, selectedNodeId, collapsedIds, nodeTypeFilter, onSelectNode, onArtifactClick, fitOnNextLayout]);

  return (
    <div className="flex flex-col h-full gap-4">
      {showLegend && (
        <Card className="flex-shrink-0">
          <CardHeader className="pb-3">
            <div />
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
              Klicka för att välja nod • Dubbelklick eller Shift+klick för att expandera/kollapsa • Scrolla för zoom • Dra för att panorera
            </p>
            <div className="flex items-center justify-between mt-3">
              {onNodeTypeFilterChange && (
                <div className="flex flex-wrap gap-2">
                  {(['callActivity', 'userTask', 'serviceTask', 'businessRuleTask'] as ProcessNodeType[]).map(type => {
                    const isActive = !nodeTypeFilter || nodeTypeFilter.has(type);
                    const style = getProcessNodeStyle(type);
                    return (
                      <Button
                        key={type}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          const newFilter = new Set(nodeTypeFilter || []);
                          if (isActive) {
                            newFilter.delete(type);
                          } else {
                            newFilter.add(type);
                          }
                          onNodeTypeFilterChange(newFilter);
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full mr-1.5"
                          style={{ backgroundColor: style.hexColor }}
                        />
                        {style.label}
                      </Button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCollapseAll}>
                  Kollapsa allt
                </Button>
                <Button variant="outline" size="sm" onClick={handleExpandAll}>
                  Expandera allt
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf}>
                  Exportera till PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showTree && (
        <div className="flex-1 relative">
          <svg
            ref={svgRef}
            className="w-full h-full border rounded bg-background"
            style={{ minHeight: '500px' }}
          />
        </div>
      )}
    </div>
  );
});

ProcessTreeD3.displayName = 'ProcessTreeD3';
