import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ActionGroup({
  label, children, variant = 'inline',
}: {
  label: string;
  children: React.ReactNode;
  variant?: 'inline' | 'stacked';
}) {
  if (variant === 'stacked') {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="flex flex-wrap gap-1.5">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="w-28 shrink-0 pt-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function PillButton({
  icon: Icon, children, onClick, badge, destructive, fullWidth,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
  badge?: number;
  destructive?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        'h-9 gap-1.5 relative justify-start',
        fullWidth && 'flex-1 basis-[calc(50%-0.375rem)] min-w-0',
        destructive && 'text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs truncate">{children}</span>
      {badge !== undefined && badge > 0 && (
        <Badge variant="destructive" className="ml-auto h-4 min-w-4 px-1 text-[10px]">
          {badge > 99 ? '99+' : badge}
        </Badge>
      )}
    </Button>
  );
}
