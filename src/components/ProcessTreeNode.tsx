import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ProcessTreeNode, getNodeIcon, getNodeColor } from '@/lib/processTree';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProcessTreeNodeViewProps {
  node: ProcessTreeNode;
  onSelectNode: (node: ProcessTreeNode) => void;
  selectedNodeId?: string;
  depth?: number;
}

export const ProcessTreeNodeView = ({
  node,
  onSelectNode,
  selectedNodeId,
  depth = 0,
}: ProcessTreeNodeViewProps) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  const hasChildren = node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer hover:bg-accent transition-colors',
          isSelected && 'bg-accent font-medium',
        )}
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
        onClick={() => onSelectNode(node)}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
        {!hasChildren && <div className="w-4" />}
        
        <span className="text-sm mr-1">{getNodeIcon(node.type)}</span>
        <span className={cn('text-sm truncate flex-1', getNodeColor(node.type))}>
          {node.label}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <ProcessTreeNodeView
              key={child.id}
              node={child}
              onSelectNode={onSelectNode}
              selectedNodeId={selectedNodeId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
