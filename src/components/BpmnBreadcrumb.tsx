import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BreadcrumbItem } from '@/lib/breadcrumbNavigation';

interface BpmnBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (fileName: string) => void;
  currentFileName: string;
}

export function BpmnBreadcrumb({ items, onNavigate, currentFileName }: BpmnBreadcrumbProps) {
  if (items.length <= 1) {
    // Only root, no breadcrumb needed
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isActive = item.fileName === currentFileName;

        return (
          <div key={`${item.fileName}-${index}`} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            {isLast || isActive ? (
              <span
                className={`font-medium truncate max-w-[200px] ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
                title={item.label}
              >
                {index === 0 && <Home className="h-3 w-3 inline mr-1 align-middle" />}
                {item.label}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted truncate max-w-[200px]"
                onClick={() => onNavigate(item.fileName)}
                title={item.label}
              >
                {index === 0 && <Home className="h-3 w-3 inline mr-1 align-middle" />}
                {item.label}
              </Button>
            )}
          </div>
        );
      })}
    </nav>
  );
}

